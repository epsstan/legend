import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendApplicationStack} from "./legend-application-stack";
import * as ssm from "@aws-cdk/aws-ssm";
import {LegendIngressChart} from "../charts/legend-ingress-chart";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import * as route53 from "@aws-cdk/aws-route53";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import {hostedZoneRef, rootDomain} from "../utils";

export interface LegendIngressStackProps extends StackProps{
    readonly clusterName: string,
    readonly kubectlRoleArn: string
    readonly stage: LegendInfrastructureStageProps
}

export class LegendIngressStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendIngressStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)

        new certificatemanager.DnsValidatedCertificate(this, "LegendCert", {
            hostedZone: hostedZoneRef(this, 'HostedZoneRef'), domainName: rootDomain(this, props.stage), })

        cluster.addCdk8sChart("LegendIngressChart", new LegendIngressChart(new cdk8s.App(), "LegendIngress", {
            legendDomain: rootDomain(this, props.stage),
            stage: props.stage,
        }))
    }
}