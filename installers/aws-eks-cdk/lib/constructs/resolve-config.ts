import {Stack} from "@aws-cdk/core";

import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3')

import * as fs from "fs";
import * as path from "path";

export interface ResolveConfigProps {
    readonly artifactBucketName: string
    readonly artifactObjectKey: string
    readonly path: string
}

export interface ResolveConfigFunctionProps {
    readonly artifactBucket: s3.IBucket
}

export class ResolveConfigFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props: ResolveConfigFunctionProps) {
        super(scope, id, {
            ...{functionName: 'ResolveConfig',
                uuid: 'e5ba913f-69dc-4e00-8f88-65160be19920',
                code: new lambda.InlineCode(fs.readFileSync(path.join('lib', 'handlers', 'resolveConfig', 'index.py'), { encoding: 'utf-8' })),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(300),
                runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
        props.artifactBucket.encryptionKey?.grantDecrypt(this)
        props.artifactBucket.grantRead(this)
    }
}

export class ResolveConfig extends cdk.Construct {
    public readonly value: string;

    constructor(scope: cdk.Construct, id: string, props: ResolveConfigProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:ResolveConfig`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "ResolveConfigFunction", { functionArn: functionArn })

        const resource = new cfn.CustomResource(this, 'Resource', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                Bucket: props.artifactBucketName,
                ObjectKey: props.artifactObjectKey,
                Path: props.path,
            }
        });

        this.value = resource.getAtt('Value').toString();
    }
}