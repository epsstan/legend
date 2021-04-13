import {CfnParameter, Stack, StackProps} from '@aws-cdk/core';
import * as cdk from "@aws-cdk/core";

export class LegendApplicationStack extends Stack {

    readonly configArtifactBucketName: CfnParameter
    readonly configArtifactObjectKey: CfnParameter

    constructor(scope: cdk.Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.configArtifactBucketName = new CfnParameter(this, "ConfigArtifactBucketName");
        this.configArtifactObjectKey = new CfnParameter(this, "ConfigArtifactObjectKey");
    }
}