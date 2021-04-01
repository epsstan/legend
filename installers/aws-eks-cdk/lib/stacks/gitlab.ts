import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager"
import * as route53 from "@aws-cdk/aws-route53"
import * as alias from "@aws-cdk/aws-route53-targets"
import {GitlabCeChart} from "../charts/gitlab-ce-chart";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import {LegendApplicationStack} from "./legend-application-stack";
import {ResolveSecret} from "../constructs/resolve-secret";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {gitlabDomain, hostedZoneRef} from "../utils";
import {GenerateSecret} from "../constructs/generate-secret";
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';

export interface GitlabStackProps extends StackProps {
    clusterName: string
    kubectlRoleArn: string
    stage: LegendInfrastructureStageProps
}

export class GitlabStack extends LegendApplicationStack {

    readonly gitlabRootSecret: secretsmanager.Secret;

    constructor(scope: cdk.Construct, id: string, props: GitlabStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)

        new certificatemanager.DnsValidatedCertificate(this, "GitlabCert", {
            hostedZone: hostedZoneRef(this, "HostedZone"),
            domainName: gitlabDomain(this, props.stage),
        });

        const artifactImageId = new ArtifactImageId(this, 'ArtifactImageId', {
            artifactBucketName: this.gitlabArtifactBucketName.value.toString(),
            artifactObjectKey: this.gitlabArtifactObjectKey.value.toString(),
        }).response;

        this.gitlabRootSecret = new secretsmanager.Secret(this, "GitlabRootPassword", {  });

        const gitlabGenerateRootPass = new GenerateSecret(this, "GenerateGitlabPassword", { secret: this.gitlabRootSecret })
        const gitlabResolveSecret = new ResolveSecret(this, "ResolvedGitlabPassword", { secret: this.gitlabRootSecret })
        gitlabResolveSecret.node.addDependency(gitlabGenerateRootPass)

        cluster.addCdk8sChart("GitlabCE", new GitlabCeChart(new cdk8s.App(), "GitlabCEChart", {
            gitlabDomain: gitlabDomain(this, props.stage),
            gitlabRootPassword: gitlabResolveSecret.response,
            image: artifactImageId,
            stage: props.stage,
        }))

        const loadBalancer = elbv2.ApplicationLoadBalancer.fromLookup(this, 'GitlabLoadBalancer', {
            loadBalancerTags: {
                "ingress.k8s.aws/stack": "default/gitlab-ce-ingress",
                "elbv2.k8s.aws/cluster": cluster.clusterName,
            },
        });

        const hostedZone = hostedZoneRef(this, "LegendHostedZone")
        new route53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,
            recordName: gitlabDomain(this, props.stage),
            target: route53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(loadBalancer)),
        });
    }
}