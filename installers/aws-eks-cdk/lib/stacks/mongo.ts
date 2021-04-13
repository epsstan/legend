import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendApplicationStack} from "./legend-application-stack";
import {ResolveSecret} from "../constructs/resolve-secret";
import {GenerateSecret} from "../constructs/generate-secret";

export interface MongoStackProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class MongoStack extends LegendApplicationStack {

    readonly mongoSecret: secretsmanager.Secret;

    constructor(scope: cdk.Construct, id: string, props: MongoStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        this.mongoSecret = new secretsmanager.Secret(this, "MongoPassword");
        const generateMongoPassword = new GenerateSecret(this, "GenerateMongoPassword", { secret: this.mongoSecret })
        const resolveSecret = new ResolveSecret(this, "ResolveMongoPassword", { secret: this.mongoSecret })
        resolveSecret.node.addDependency(generateMongoPassword)

        cluster.addCdk8sChart("Mongo", new MongoChart(new cdk8s.App(), "MongoChart", {
            password: resolveSecret.response
        }))
    }
}