import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import {Stack} from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import s3 = require('@aws-cdk/aws-s3')

export interface ArtifactImageIdProps {
    artifactBucketName: string
    artifactObjectKey: string
}

export interface ArtifactImageIdFunctionProps {
    readonly artifactBucket: s3.IBucket
}

export class ArtifactImageIdFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props: ArtifactImageIdFunctionProps) {
        super(scope, id, {
            ...{functionName: 'ArtifactImageId',
                uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
                code: new lambda.InlineCode(fs.readFileSync(path.join('lib', 'handlers', 'artifactImageId', 'index.py'), { encoding: 'utf-8' })),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(300),
                runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
        props.artifactBucket.encryptionKey?.grantDecrypt(this)
        props.artifactBucket.grantRead(this)
    }
}

export class ArtifactImageId extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ArtifactImageIdProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:ArtifactImageId`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "ArtifactImageIdFunction", { functionArn: functionArn })

        const resource = new cfn.CustomResource(this, 'Resource', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                bucket: props.artifactBucketName,
                objectKey: props.artifactObjectKey,
            }
        });

        this.response = resource.getAtt('Response').toString();
    }
}