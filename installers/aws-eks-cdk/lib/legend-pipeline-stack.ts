import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { CodeBuildAction, GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline } from "./override/pipelines/lib";
import { LegendInfrastructureStage } from "./legend-infrastructure-stage";
import { SimpleSynthAction } from "./override/pipelines/lib/synths";
import {ResolveSecret, ResolveSecretFunction} from "./constructs/resolve-secret";
import * as iam from "@aws-cdk/aws-iam";
import * as ssm from "@aws-cdk/aws-ssm";
import {StaticBuildProject} from "./constructs/static-build-project";
import {ArtifactImageIdFunction} from "./constructs/artifact-image-id";
import {ResolveConfigFunction} from "./constructs/resolve-config";
import {GitlabAppConfig, GitlabAppConfigFunction} from "./constructs/gitlab-app-config";
import {GenerateSecretFunction} from "./constructs/generate-secret";
import {EksAlbLoadBalancerFunction} from "./constructs/eks-alb-loadbalancer";

export class LegendPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const configSource = new codepipeline.Artifact();
        const legendSource = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const githubSecret = SecretValue.secretsManager('github-access-token')
        const pipeline = new CdkPipeline(this, 'LegendPipeline', {
            pipelineName: 'Legend',
            cloudAssemblyArtifact,

            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'Legend',
                output: legendSource,
                oauthToken: githubSecret,
                owner: 'hagerupe',
                repo: 'legend',
                trigger: GitHubTrigger.POLL
            }),

            synthAction: SimpleSynthAction.standardNpmSynth({
                subdirectory: 'installers/aws-eks-cdk',
                sourceArtifact: legendSource,
                cloudAssemblyArtifact,
            }),
        });

        pipeline.codePipeline.stage('Source').addAction(new GitHubSourceAction({
            actionName: 'LegendConfig',
            output: configSource,
            oauthToken: githubSecret,
            owner: 'hagerupe',
            repo: 'lengend-config',
            branch: 'main',
            trigger: GitHubTrigger.POLL
        }))

        const runtimeBuildStage = pipeline.addStage("Legend_Runtime_Build");

        const configArtifact = new codepipeline.Artifact();
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_Config',
            input: configSource,
            project: new StaticBuildProject(this, 'LegendConfigProject',  {}).project,
            outputs: [ configArtifact ]
        }))

        const appStageOptions = {
            parameterOverrides: {
                ConfigArtifactBucketName: configArtifact.bucketName,
                ConfigArtifactObjectKey: configArtifact.objectKey,
            },
            extraInputs: [
                configArtifact,
            ],
        }

        const masterRoleAccessName = ssm.StringParameter.valueForStringParameter(this, 'master-role-access');
        const masterRoleAssumedBy = iam.Role.fromRoleArn(this, "MasterRoleAssumedBy", `arn:aws:iam::${this.account}:role/${masterRoleAccessName}`)
        const kubernetesMasterRole = new iam.Role(this, "KubernetesMasterRole", {
            roleName: 'KubernetesMasterRole',
            assumedBy: new iam.ArnPrincipal(masterRoleAssumedBy.roleArn)});
        kubernetesMasterRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this,
            "KubernetesMasterRoleAdministratorAccess", "arn:aws:iam::aws:policy/AdministratorAccess"))

        new ArtifactImageIdFunction(this, 'ArtifactImageId', { artifactBucket: pipeline.codePipeline.artifactBucket })
        new ResolveSecretFunction(this, 'ResolveSecret')
        new ResolveConfigFunction(this, 'ResolveConfig', { artifactBucket: pipeline.codePipeline.artifactBucket })
        new GitlabAppConfigFunction(this, 'GitlabAppConfig')
        new GenerateSecretFunction(this, 'GenerateSecret')
        new EksAlbLoadBalancerFunction(this, 'EKSLoadBalancer')

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "UAT", {
            env: { account: this.account, region: this.region },
            repositoryNames: [],
            prefix: 'uat.',
            stageName: 'UAT',
        }), appStageOptions)

        pipeline.addStage("Approval").addManualApprovalAction({});

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "Prod", {
            env: { account: this.account, region: this.region },
            repositoryNames: [],
            prefix: '',
            stageName: 'PROD',
        }), appStageOptions)
    }
}