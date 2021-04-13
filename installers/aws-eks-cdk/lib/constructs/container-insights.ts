import {Construct, Stack} from "@aws-cdk/core";
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from "cdk8s";
import {ContainerInsightsChart} from "../charts/container-insights";

export interface ContainerInsightsProps {
    cluster: eks.Cluster
}

// https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html
export class ContainerInsights extends Construct {
    constructor(scope: Construct, id: string, props: ContainerInsightsProps) {
        super(scope, id);

        props.cluster.addCdk8sChart("ContainerInsights", new ContainerInsightsChart(new cdk8s.App(), "ContainerInsightsChart", {
            clusterName: props.cluster.clusterName,
            clusterRegion: Stack.of(this).region
        }));
    }
}