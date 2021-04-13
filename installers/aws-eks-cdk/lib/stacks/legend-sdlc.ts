import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendSdlcChart} from "../charts/legend-sdlc";
import {LegendApplicationStack} from "./legend-application-stack";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {GitlabAppConfig} from "../constructs/gitlab-app-config";
import {gitlabDomain, gitlabRootPasswordFromSecret, gitlabUrl, mongoPassword, resolveConfig, sdlcUrl} from "../utils";
import {Secret} from "@aws-cdk/aws-secretsmanager";

export interface LegendEngineProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
    gitlabRootSecret: Secret
    stage: LegendInfrastructureStageProps
    mongoSecret: Secret
}

export class LegendSdlcStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);

        const gitlabSecretRef = Secret.fromSecretNameV2(this, "GitlabSecretRef", props.gitlabRootSecret.secretName);
        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)

        // Generate a OAuth Application
        const config = new GitlabAppConfig(this, "GitlabAppConfig", {
            secret: gitlabRootPasswordFromSecret(this, gitlabSecretRef),
            host: gitlabUrl(this, props.stage),
            stage: props.stage})

        cluster.addCdk8sChart("SDLC", new LegendSdlcChart(new cdk8s.App(), "LegendSdlc", {
            imageId: resolveConfig(this, 'Images.LegendSDLC'),
            legendSdlcPort: 80,
            gitlabOauthClientId: config.applicationId,
            gitlabOauthSecret: config.secret,
            gitlabPublicUrl: gitlabUrl(this, props.stage),
            mongoHostPort: 'mongo-service.default.svc.cluster.local',
            mongoUser: 'admin',
            mongoPassword: mongoPassword(this, props.mongoSecret),
            gitlabHost: gitlabDomain(this, props.stage),
            gitlabPort: 443,
            legendSdlcUrl: sdlcUrl(this, props.stage),
        }))
    }
}