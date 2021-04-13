import {Stack, StackProps} from '@aws-cdk/core';
import * as cdk from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53"
import * as alias from "@aws-cdk/aws-route53-targets"
import {LegendApplicationStack} from "./legend-application-stack";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {hostedZoneRef, rootDomain} from "../utils";
import {EksAlbLoadBalancer} from "../constructs/eks-alb-loadbalancer";

export interface LegendDnsStackProps extends StackProps {
    clusterName: string,
    stage: LegendInfrastructureStageProps
}

export class LegendDnsStack extends LegendApplicationStack {

    constructor(scope: cdk.Construct, id: string, props: LegendDnsStackProps) {
        super(scope, id, props);

        if (props.stage.env !== undefined) {
            new route53.ARecord(Stack.of(this), 'AliasRecord', {
                zone: hostedZoneRef(this, "LegendHostedZone"),
                recordName: rootDomain(this, props.stage),
                target: route53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(new EksAlbLoadBalancer(this, 'LegendLoadBalancerRef', {
                    clusterName: props.clusterName,
                    clusterStack: "default/legend-ingress",
                    env: props.stage.env,
                }).loadBalancer))
            })
        } else {
            throw new Error('Environment must be defined')
        }
    }
}