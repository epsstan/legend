import { LegendInfrastructureStageProps } from "./legend-infrastructure-stage";
import * as ssm from "@aws-cdk/aws-ssm";
import { Construct } from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import { ResolveSecret } from "./constructs/resolve-secret";
import {ISecret, Secret} from "@aws-cdk/aws-secretsmanager";
import {ResolveConfig} from "./constructs/resolve-config";
import {LegendApplicationStack} from "./stacks/legend-application-stack";

export function gitlabRootPassword(scope: Construct) {
    const gitlabRootSecret = new secretsmanager.Secret(scope, "GitlabRootPasswordRef", {  });
    return gitlabRootPasswordFromSecret(scope, gitlabRootSecret);
}

export function mongoPassword(scope: Construct, secret: ISecret) {
    const mongoSecretRef = Secret.fromSecretNameV2(scope, "MongoSecretRef", secret.secretName);
    return new ResolveSecret(scope, "ResolveMongoPassword", { secret: mongoSecretRef }).response;
}

export function gitlabRootPasswordFromSecret(scope: Construct, secret: ISecret) {
    return new ResolveSecret(scope, "ResolvedGitlabPassword", { secret: secret }).response
}

export function resolveConfig(scope: LegendApplicationStack, path: string) {
    return new ResolveConfig(scope, path.replace('.',''), {
        artifactBucketName: scope.configArtifactBucketName.value.toString(),
        artifactObjectKey: scope.configArtifactObjectKey.value.toString(),
        path: path
    }).value;
}

export function hostedZoneName(scope: Construct) {
    return ssm.StringParameter.valueForStringParameter(
        scope, 'legend-zone-name');
}

export function hostedZoneId(scope: Construct) {
    return ssm.StringParameter.valueForStringParameter(
        scope, 'legend-hosted-zone-id');
}

export function hostedZoneRef(scope: Construct, id: string) {
    return route53.HostedZone.fromHostedZoneAttributes(scope, id, {
        zoneName: hostedZoneName(scope),
        hostedZoneId: hostedZoneId(scope),
    })
}

export function gitlabDomain(scope: Construct, props: LegendInfrastructureStageProps) {
    return `gitlab.${rootDomain(scope, props)}`
}

export function gitlabUrl(scope: Construct, props: LegendInfrastructureStageProps) {
    return `https://${gitlabDomain(scope, props)}/`
}

export function rootDomain(scope: Construct, props: LegendInfrastructureStageProps) {
    return `${props.prefix}${hostedZoneName(scope)}`
}

export function engineUrl(scope: Construct, props: LegendInfrastructureStageProps) {
    return `https://${rootDomain(scope, props)}/engine`
}

export function sdlcUrl(scope: Construct, props: LegendInfrastructureStageProps) {
    return `https://${rootDomain(scope, props)}/sdlc`
}

export function studioDomain(scope: Construct, props: LegendInfrastructureStageProps) {
    return `${rootDomain(scope, props)}`
}

export function studioUrl(scope: Construct, props: LegendInfrastructureStageProps) {
    return `https://${studioDomain(scope, props)}/studio`
}