import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendEngineChart} from "../charts/legend-engine";
import {LegendApplicationStack} from "./legend-application-stack";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import {ResolveSecret} from "../constructs/resolve-secret";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";
import * as route53 from "@aws-cdk/aws-route53";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {GitlabAppConfig} from "../constructs/gitlab-app-config";
import {Secret} from "@aws-cdk/aws-secretsmanager";
import {gitlabRootPasswordFromSecret, gitlabUrl, mongoPassword, resolveConfig} from "../utils";
import {ResolveConfig} from "../constructs/resolve-config";
import {GenerateSecret} from "../constructs/generate-secret";

export interface LegendEngineProps extends StackProps{
    clusterName: string
    kubectlRoleArn: string
    gitlabRootSecret: Secret
    mongoSecret: Secret
    stage: LegendInfrastructureStageProps
}

export class LegendEngineStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);

        // Resolve referenced constructs
        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const gitlabSecretRef = Secret.fromSecretNameV2(this, "GitlabSecretRef", props.gitlabRootSecret.secretName);

        // Generate a OAuth Application
        const config = new GitlabAppConfig(this, "GitlabAppConfig", {
            secret: gitlabRootPasswordFromSecret(this, gitlabSecretRef),
            host: gitlabUrl(this, props.stage),
            stage: props.stage})

        cluster.addCdk8sChart("Engine", new LegendEngineChart(new cdk8s.App(), "LegendEngine", {
            imageId: resolveConfig(this, 'Images.LegendEngine'),
            gitlabOauthClientId: config.applicationId,
            gitlabOauthSecret: config.secret,
            gitlabPublicUrl: gitlabUrl(this, props.stage),
            mongoHostPort: 'mongo-service.default.svc.cluster.local',
            mongoUser: 'admin',
            mongoPassword: mongoPassword(this, props.mongoSecret),
            legendEnginePort: 80,
        }))
    }
}