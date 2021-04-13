import {Stack, StackProps} from '@aws-cdk/core';
import * as cdk from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53"
import * as alias from "@aws-cdk/aws-route53-targets"
import {LegendApplicationStack} from "./legend-application-stack";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {gitlabDomain, hostedZoneRef} from "../utils";
import {EksAlbLoadBalancer} from "../constructs/eks-alb-loadbalancer";

export interface GitlabDnsStackProps extends StackProps {
    clusterName: string,
    stage: LegendInfrastructureStageProps
}

export class GitlabDnsStack extends LegendApplicationStack {

    constructor(scope: cdk.Construct, id: string, props: GitlabDnsStackProps) {
        super(scope, id, props);

        if (props.stage.env !== undefined) {
            new route53.ARecord(Stack.of(this), 'AliasRecord', {
                zone: hostedZoneRef(this, "LegendHostedZone"),
                recordName: gitlabDomain(this, props.stage),
                target: route53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(new EksAlbLoadBalancer(this, 'GitlabLoadBalancerRef', {
                    clusterName: props.clusterName,
                    clusterStack: "default/gitlab-ce-ingress",
                    env: props.stage.env,
                }).loadBalancer))
            })
        } else {
            throw new Error('Environment must be defined')
        }
    }
}