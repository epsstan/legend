import cfn = require('@aws-cdk/aws-cloudformation');
import cdk = require('@aws-cdk/core');
import {Stack} from "@aws-cdk/core";
import * as secretmanager from "@aws-cdk/aws-secretsmanager";
import * as lambda from '@aws-cdk/aws-lambda';
import {ManagedPolicy} from "@aws-cdk/aws-iam";
import * as fs from "fs";
import * as path from "path";
import * as iam from "@aws-cdk/aws-iam";
import {engineUrl, gitlabDomain, sdlcUrl, studioUrl} from "../utils";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";

export interface GitlabAppConfigProps {
    readonly secret: string,
    readonly host: string,
    readonly stage: LegendInfrastructureStageProps,
}

export class GitlabAppConfigFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props?: lambda.SingletonFunctionProps) {
        super(scope, id, {
            ...{functionName: 'GitlabAppConfig',
                uuid: '0f1cd18d-01fd-4508-96f0-62f31f4a6140',
                code: new lambda.AssetCode('lib/handlers/gitlabApplicationConfig'),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(300),
                runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
    }
}

export class GitlabAppConfig extends cdk.Construct {
    public readonly applicationId: string;
    public readonly secret: string;

    constructor(scope: cdk.Construct, id: string, props: GitlabAppConfigProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:GitlabAppConfig`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "GitlabAppConfigFunction", { functionArn: functionArn })

        const redirectUri = `${sdlcUrl(this, props.stage)}/api/auth/callback,${sdlcUrl(this, props.stage)}/api/pac4j/login/callback,${engineUrl(this, props.stage)}/callback,${studioUrl(this, props.stage)}/log.in/callback`
        const resource = new cfn.CustomResource(this, 'GitlabAppConfig', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                Secret: props.secret,
                Host: props.host,
                RedirectUri: redirectUri,
            }
        });

        this.applicationId = resource.getAtt('applicationId').toString();
        this.secret = resource.getAtt('secret').toString();
    }
}