import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendEngineChart} from "../charts/legend-engine";

export interface LegendEngineProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendEngineStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        cluster.addCdk8sChart("Engine", new LegendEngineChart(new cdk8s.App(), "LegendEngine", {
            gitlabOauthClientId: 'foo',
            gitlabOauthSecret: 'foo',
            gitlabPublicUrl: 'foo',
            mongoHostPort: 1234,
            mongoUser: 'foo',
            mongoPassword: 'foo',
            legendEnginePort: 1234
        }))
    }
}