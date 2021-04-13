import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import {Environment, Stack} from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import {ResourceEnvironment} from "@aws-cdk/core/lib/resource";
import * as iam from "@aws-cdk/aws-iam";

export interface EksAlbLoadBalancerProps {
    readonly clusterName: string,
    readonly clusterStack: string,
    readonly env: Environment,
}

export interface EksAlbLoadBalancerFunctionProps { }

export class EksAlbLoadBalancerFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props?: EksAlbLoadBalancerFunctionProps) {
        super(scope, id, {
            ...{functionName: 'EksAlbLoadBalancer',
                uuid: 'e0a18e29-f326-45ba-8ccb-66f31bfce1f1',
                code: new lambda.InlineCode(fs.readFileSync(path.join('lib', 'handlers', 'eksAlbLoadBalancer', 'index.py'), { encoding: 'utf-8' })),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(900),
                runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
        const resolveSecretPolicy = new iam.Policy(this, "ELBReadonlyPolicy", {
            document: iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync(path.join('resources', 'policies', 'elbv2-readonly-policy.json'), {encoding: 'utf8'})))
        })
        if (this.role !== undefined) {
            resolveSecretPolicy.attachToRole(this.role)
        }
    }
}

export class EksAlbLoadBalancer extends cdk.Construct {
    public readonly loadBalancer: elbv2.ILoadBalancerV2;

    constructor(scope: cdk.Construct, id: string, props: EksAlbLoadBalancerProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:EksAlbLoadBalancer`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "EksAlbLoadBalancerFunctartifion", { functionArn: functionArn })

        const resource = new cfn.CustomResource(this, 'EksAlbLoadBalancerResource', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                Cluster: props.clusterName,
                ClusterStack: props.clusterStack,
            }
        });

        if (props.env.account !== undefined && props.env.region !== undefined) {
            this.loadBalancer = new EKSLoadBalancerV2(this, 'EKSLoadBalancerV2', {
                loadBalancerCanonicalHostedZoneId: resource.getAtt('loadBalancerCanonicalHostedZoneId').toString(),
                loadBalancerDnsName: resource.getAtt('loadBalancerDnsName').toString(),
                env: {
                    account: props.env.account,
                    region: props.env.region,
                },
            })
        } else {
            throw new Error('Environment must be provided');
        }
    }
}

export interface EKSLoadBalancerV2Props {
    readonly loadBalancerCanonicalHostedZoneId: string,
    readonly loadBalancerDnsName: string,
    readonly env: ResourceEnvironment,
}

export class EKSLoadBalancerV2 extends cdk.Construct implements elbv2.ILoadBalancerV2 {

    readonly env: ResourceEnvironment;
    readonly loadBalancerCanonicalHostedZoneId: string;
    readonly loadBalancerDnsName: string;
    readonly stack: Stack;

    constructor(scope: cdk.Construct, id: string, props: EKSLoadBalancerV2Props) {
        super(scope, id);

        this.env = props.env;
        this.stack = Stack.of(this);
        this.loadBalancerCanonicalHostedZoneId = props.loadBalancerCanonicalHostedZoneId;
        this.loadBalancerDnsName = props.loadBalancerDnsName;
    }
}