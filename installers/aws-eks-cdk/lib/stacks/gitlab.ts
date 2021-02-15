import {CfnParameter, Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {GitlabCeChart} from "../charts/gitlab-ce-chart";
import {ArtifactImageId} from "../constructs/artifact-image-id";

export interface GitlabStackProps extends StackProps{
    clusterName: string
    kubectlRoleArn: string
}

export class GitlabStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: GitlabStackProps) {
        super(scope, id, props);

        const artifactBucketName = new CfnParameter(this, "GitlabArtifactBucketName");
        const artifactObjectKey = new CfnParameter(this, "GitlabArtifactObjectKey");

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ArtifactImageId(this, 'DemoResource', {
            artifactBucketName: artifactBucketName.value.toString(),
            artifactObjectKey: artifactObjectKey.value.toString(),
        }).response;
        const gitlabPassword = new secretsmanager.Secret(this, "GitlabRootPassword");
        cluster.addCdk8sChart("GitlabCE", new GitlabCeChart(new cdk8s.App(), "GitlabCEChart", {
            gitlabExternalUrl: 'gitlab.legend.com',
            gitlabRootPassword: gitlabPassword.secretValue.toString(),
            image: artifactImageId
        }))
    }
}