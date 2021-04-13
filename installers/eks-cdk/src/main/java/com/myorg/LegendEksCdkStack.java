package com.myorg;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import org.cdk8s.App;
import org.cdk8s.ChartOptions;
import software.amazon.awscdk.core.Aws;
import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.regioninfo.RegionInfo;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.ecr.assets.DockerImageAsset;
import software.amazon.awscdk.services.eks.Cluster;
import software.amazon.awscdk.services.eks.FargateCluster;
import software.amazon.awscdk.services.eks.KubernetesVersion;
import software.amazon.awscdk.services.eks.ServiceAccount;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;

import java.io.File;

public class LegendEksCdkStack extends Stack {

    public LegendEksCdkStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public LegendEksCdkStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        final Vpc vpc = Vpc.Builder.create(this, "VPC")
                .build();

        final Role eksClusterRole = Role.Builder.create(this, "LegendClusterRole")
                .managedPolicies(ImmutableList.of(ManagedPolicy.fromManagedPolicyArn(this,
                        "AmazonEKSClusterPolicy", "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy")))
                .assumedBy(ServicePrincipal.Builder.create("eks").build())
                .build();

        final Cluster eksCluster = FargateCluster.Builder.create(this, "LegendCluster")
                .role(eksClusterRole)
                .vpc(vpc)
                .vpcSubnets(ImmutableList.of(SubnetSelection.builder().subnetType(SubnetType.PRIVATE).build()))
                .version(KubernetesVersion.V1_18)
                .placeClusterHandlerInVpc(true)
                .build();

        eksCluster.getAwsAuth().addMastersRole(Role.fromRoleArn(this, "SuperAdmin", "arn:aws:iam::752499117019:role/skylab-hagere"));

        final DockerImageAsset gitlabImage = DockerImageAsset.Builder.create(this, "LegendGitlab")
                .directory("docker/gitlab").build();

        final ServiceAccount albIngressServiceAccount = eksCluster.addServiceAccount("ALBIngressCtrl");

        eksCluster.addCdk8sChart("LegendChartDeploy", new LegendK8Chart(new App(), "LegendChart", eksCluster.getClusterName(),
                vpc.getVpcId(), getRegion(), albIngressServiceAccount.getServiceAccountName(), gitlabImage.getImageUri()));
    }
}
