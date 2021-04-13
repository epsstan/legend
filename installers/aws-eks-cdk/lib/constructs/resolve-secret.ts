import cfn = require('@aws-cdk/aws-cloudformation');
import cdk = require('@aws-cdk/core');
import {Stack} from "@aws-cdk/core";
import * as secretmanager from "@aws-cdk/aws-secretsmanager";
import * as lambda from '@aws-cdk/aws-lambda';
import * as fs from "fs";
import * as path from "path";
import * as iam from "@aws-cdk/aws-iam";

export interface ResolveSecretProps {
    secret: secretmanager.ISecret
}

export class ResolveSecretFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props?: lambda.SingletonFunctionProps) {
        super(scope, id, {
            ...{functionName: 'ResolveSecret',
            uuid: 'def1918a-6fbb-11eb-9439-0242ac130002l',
            code: new lambda.InlineCode(fs.readFileSync(path.join('lib', 'handlers', 'resolveSecret', 'index.py'), { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
        const resolveSecretPolicy = new iam.Policy(this, "ResolveSecretPolicy", {
            document: iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync(path.join('resources', 'policies', 'secrets-manager-readonly-policy.json'), {encoding: 'utf8'})))
        })
        if (this.role !== undefined) {
            resolveSecretPolicy.attachToRole(this.role)
        }
    }
}

export class ResolveSecret extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ResolveSecretProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:ResolveSecret`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "ResolveSecretFunction", { functionArn: functionArn })
        props.secret.grantRead(lambdaSingleton)

        const resource = new cfn.CustomResource(this, 'ResolveSecret', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                Secret: props.secret.secretName,
            }
        });

        this.response = resource.getAtt('Response').toString();
    }
}