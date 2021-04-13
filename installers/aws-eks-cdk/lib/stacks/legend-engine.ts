import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendEngineChart} from "../charts/legend-engine";
import {LegendApplicationStack} from "./legend-application-stack";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {GitlabAppConfig} from "../constructs/gitlab-app-config";
import {Secret} from "@aws-cdk/aws-secretsmanager";
import {gitlabRootPasswordFromSecret, gitlabUrl, mongoPassword, resolveConfig} from "../utils";

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