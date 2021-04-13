import * as cdk from '@aws-cdk/core';
import {CfnOutput, StackProps} from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ssm from '@aws-cdk/aws-ssm';
import {EksAwsIngressController} from "../constructs/eks-aws-ingress-controller";
import * as ecr from "@aws-cdk/aws-ecr";
import {LegendApplicationStack} from "./legend-application-stack";
import {ContainerInsights} from "../constructs/container-insights";
import * as fs from "fs";
import * as path from "path";

export interface KubernetesStackProperties extends StackProps{
  repositoryNames: string[];
}

export class KubernetesStack extends LegendApplicationStack {

  readonly clusterName: CfnOutput;
  readonly kubectlRoleArn: CfnOutput;
  readonly clusterRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props: KubernetesStackProperties) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc');

    this.clusterRole = new iam.Role(this, "LegendClusterRole", {
      assumedBy: new iam.ServicePrincipal("eks"),
      managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSClusterPolicy", "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy")]
    })

    // Grant EKS permissions to image repositories
    for (let repositoryName of props.repositoryNames) {
      const repository = ecr.Repository.fromRepositoryName(this, repositoryName, repositoryName)
      repository.grantPull(this.clusterRole)
    }

    const cluster = new eks.Cluster(this, "LegendCluster", {
      role: this.clusterRole,
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }],
      version: eks.KubernetesVersion.V1_18,
      placeClusterHandlerInVpc: true,
      defaultCapacity: 0,
    })
    const nodeGroup = cluster.addNodegroupCapacity('custom-node-group', {
      instanceTypes: [new ec2.InstanceType('m5.xlarge')],
      minSize: 4,
      diskSize: 100,
      amiType: eks.NodegroupAmiType.AL2_X86_64,
    });

    nodeGroup.role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this,
        "CloudWatchAgentServerPolicy", "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"))
    nodeGroup.role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this,
        "SSMManagedInstancePolicy", "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"))

    const ebsPolicy = new iam.Policy(this, "EbsPolicy", {
      document: iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync(path.join('resources', 'policies', 'ebs-policy.json'), {encoding: 'utf8'})))
    })
    ebsPolicy.attachToRole(nodeGroup.role);

    // Set up EKS master roles
    const masterRoleAccessName = ssm.StringParameter.valueForStringParameter(this, 'master-role-access');
    const masterRoleAssumedBy = iam.Role.fromRoleArn(this, "MasterRoleAssumedBy", `arn:aws:iam::${this.account}:role/${masterRoleAccessName}`)
    const kubernetesMasterRole = iam.Role.fromRoleArn(this, "KubernetesMasterRole", `arn:aws:iam::${this.account}:role/KubernetesMasterRole`)
    cluster.awsAuth.addMastersRole(kubernetesMasterRole)
    cluster.awsAuth.addMastersRole(masterRoleAssumedBy)

    new EksAwsIngressController(this, "IngressController", { cluster, vpc })

    // Note: does not work with Fargate since it uses a sidecar daemonset on the nodes
    // Worth considering instead: https://aws.amazon.com/blogs/containers/fluent-bit-for-amazon-eks-on-aws-fargate-is-here/
    // https://github.com/aws/containers-roadmap/issues/971
    new ContainerInsights(this, "ContainerInsights", { cluster })

    cluster.addHelmChart("EBSDriver", {
      repository: 'https://kubernetes-sigs.github.io/aws-ebs-csi-driver',
      chart: 'aws-ebs-csi-driver',
      namespace: 'kube-system',
      values: {
        enableVolumeScheduling: true,
        enableVolumeResizing: true,
        enableVolumeSnapshot: true
      }
    })

    this.clusterName = new CfnOutput(this, 'ClusterName', { value: cluster.clusterName })
    if (cluster.kubectlRole !== undefined) {
      this.kubectlRoleArn = new CfnOutput(this, 'kubectlRoleArn', {value: cluster.kubectlRole?.roleArn})
    }
  }
}
