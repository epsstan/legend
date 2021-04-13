import {Construct, Stack} from "@aws-cdk/core";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import {GitHubTrigger} from "@aws-cdk/aws-codepipeline-actions";
import * as codebuild from "@aws-cdk/aws-codebuild";
import {BuildEnvironmentVariableType} from "@aws-cdk/aws-codebuild";
import * as ecr from "@aws-cdk/aws-ecr";
import * as eks from "@aws-cdk/aws-eks";
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export interface LegendCiCdProps {
    cluster: eks.Cluster;
}

export class LegendCiCd extends Construct {
    constructor(scope: Construct, id: string, props: LegendCiCdProps) {
        super(scope, id);

        const region = Stack.of(this).region;
        const account = Stack.of(this).account;
        const githubSecret = secretsmanager.Secret.fromSecretPartialArn(this, "GitHubAccessToken", `arn:aws:secretsmanager:${region}:${account}:secret:GitHub`)
        const dockerHubSecret = secretsmanager.Secret.fromSecretPartialArn(this, "DockerHubCredentials", `arn:aws:secretsmanager:${region}:${account}:secret:DockerHub`)
        const dockerHubUsername = dockerHubSecret.secretValueFromJson('Username');
        const dockerHubPassword = dockerHubSecret.secretValueFromJson('Password');

        const legendEngineRepo = new ecr.Repository(this, 'LegendEngineRepo')
        const engineBuild = new codebuild.PipelineProject(this, 'LegendEngineBuild', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    pre_build: {
                        commands: [
                            'DOCKERHUB_USER=$(echo $DOCKER_HUB_CREDS | jq -r \'.Username\')',
                            'DOCKERHUB_PASSWORD=$(echo $DOCKER_HUB_CREDS | jq -r \'.Password\')',
                            'echo $DOCKERHUB_PASSWORD | docker login --username $DOCKERHUB_USER --password-stdin',
                            'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com'
                        ]
                    },
                    install: {
                        commands: [
                            'mvn install',
                            'cd legend-engine-server',
                        ],
                    },
                    build: {
                        commands: [
                            'docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .',
                            'docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG',
                        ]
                    },
                    post_build: {
                        commands: [
                            'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG'
                        ]
                    }
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true,
                environmentVariables: {
                    'IMAGE_REPO_NAME' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: legendEngineRepo.repositoryName
                    },
                    'IMAGE_TAG' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: 'latest'
                    },
                    'AWS_DEFAULT_REGION' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: Stack.of(this).region
                    },
                    'AWS_ACCOUNT_ID' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: Stack.of(this).account
                    },
                    'DOCKER_HUB_CREDS': {
                        type: BuildEnvironmentVariableType.SECRETS_MANAGER,
                        value: dockerHubSecret.secretName
                    },
                }
            },
        });
        legendEngineRepo.grantPullPush(engineBuild)




        const engineSource = new codepipeline.Artifact();
        const sdlcSource = new codepipeline.Artifact();
        const legendPipeline = new codepipeline.Pipeline(this, "LegendPipeline", {
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new codepipeline_actions.GitHubSourceAction({
                            actionName: 'GitHub_LegendEngine',
                            oauthToken: githubSecret.secretValue,
                            repo: 'legend-engine',
                            owner: 'hagerupe',
                            output: engineSource,
                            trigger: GitHubTrigger.POLL
                        }),
                        new codepipeline_actions.GitHubSourceAction({
                            actionName: 'GitHub_LegendSDLC',
                            oauthToken: githubSecret.secretValue,
                            repo: 'legend-sdlc',
                            owner: 'hagerupe',
                            output: sdlcSource,
                            trigger: GitHubTrigger.POLL
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Engine_Build',
                            project: engineBuild,
                            input: engineSource,
                        }),
                    ],
                },
            ]
        })
    }
}
