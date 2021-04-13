import cfn = require('@aws-cdk/aws-cloudformation');
import cdk = require('@aws-cdk/core');
import {Stack} from "@aws-cdk/core";
import * as secretmanager from "@aws-cdk/aws-secretsmanager";
import * as lambda from '@aws-cdk/aws-lambda';
import * as fs from "fs";
import * as path from "path";
import * as iam from "@aws-cdk/aws-iam";

export interface GenerateSecretProps {
    secret: secretmanager.Secret
}

export class GenerateSecretFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props?: lambda.SingletonFunctionProps) {
        super(scope, id, {
            ...{functionName: 'GenerateSecret',
            uuid: '67e76db5-57d7-4758-8d5d-ce0e1c8b86cf',
            code: new lambda.InlineCode(fs.readFileSync(path.join('lib', 'handlers', 'generateSecret', 'index.py'), { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
        const generateSecretPolicy = new iam.Policy(this, "GenerateSecretPolicy", {
            document: iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync(path.join('resources', 'policies', 'secrets-manager-write-policy.json'), {encoding: 'utf8'})))
        })
        if (this.role !== undefined) {
            generateSecretPolicy.attachToRole(this.role)
        }
    }
}

export class GenerateSecret extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: GenerateSecretProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:GenerateSecret`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "GenerateSecretFunction", { functionArn: functionArn })
        props.secret.grantWrite(lambdaSingleton)

        const resource = new cfn.CustomResource(this, 'GenerateSecret', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                Secret: props.secret.secretName,
            }
        });
    }
}