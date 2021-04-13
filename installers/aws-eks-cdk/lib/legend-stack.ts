import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import {EksAlbIngressController} from "./eks-alb-ingress-controller";
import {LegendCiCd} from "./legend-ci-cd";
import {MongoChart} from "./charts/mongo-chart";
import * as cdk8s from 'cdk8s';
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import {Secret} from "@aws-cdk/aws-secretsmanager";
import {CfnDynamicReference, SecretValue} from "@aws-cdk/core";

export class LegendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc');

    const eksClusterRole = new iam.Role(this, "LegendClusterRole", {
      assumedBy: new iam.ServicePrincipal("eks"),
      managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSClusterPolicy",
          "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy")]
    })

    const eksCluster = new eks.FargateCluster(this, "LegendCluster", {
      role: eksClusterRole,
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }],
      version: eks.KubernetesVersion.V1_18,
      placeClusterHandlerInVpc: true,
    })
    eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, "SuperAdmin", "arn:aws:iam::752499117019:role/Administration"))
    eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, "SuperAdminSky", "arn:aws:iam::752499117019:role/skylab-hagere"))

    const albIngressController = new EksAlbIngressController(this, "IngressController", {
      cluster: eksCluster,
      vpc: vpc
    })

    const legendCiCd = new LegendCiCd(this, "LegendCICD", {
      cluster: eksCluster
    });

    const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
    eksCluster.addCdk8sChart("Mongo", new MongoChart(new cdk8s.App(), "MongoChart", {
      password: mongoPassword.secretValue.toString()
    }))
  }
}
