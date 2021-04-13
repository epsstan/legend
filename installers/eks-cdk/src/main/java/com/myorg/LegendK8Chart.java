package com.myorg;

import com.google.common.collect.ImmutableList;
import org.cdk8s.Chart;
import org.cdk8s.ChartOptions;
import org.cdk8s.plus.*;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import software.constructs.Construct;

public class LegendK8Chart extends Chart {

    // TODO input validations
    public LegendK8Chart(@NotNull Construct scope,
                         @NotNull String ns,
                         final String clusterName,
                         final String vpcId,
                         final String region,
                         final String serviceAccountName,
                         final String gitlabImageUrl) {
        super(scope, ns, null);

        final Deployment gitlabDeployment = Deployment.Builder.create(this, "LegendGitlab")
                .replicas(1)
                .containers(ImmutableList.of(Container.Builder.create()
                        .image(gitlabImageUrl)
                        .build()))
                .build();

        final Deployment albIngressControllerDeploy = Deployment.Builder.create(this, "ALBIngressCtrl")
                .replicas(1)
                .serviceAccount(ServiceAccount.fromServiceAccountName(serviceAccountName))
                .containers(ImmutableList.of(Container.Builder.create()
                        .args(ImmutableList.<String>builder()
                                .add("-ingress-class=alb")
                                .add("--cluster-name=" + clusterName)
                                .add("--aws-vpc-id=" + vpcId)
                                .add("--aws-region=" + region)
                                .build())
                        .image("docker.io/amazon/aws-alb-ingress-controller:v1.1.6")
                        .build()))
                .build();

        final Service service = Service.Builder.create(this, "GitlabService")
                .ports(ImmutableList.of(ServicePort.builder()
                        .port(80)
                        .targetPort(80)
                        .protocol(Protocol.TCP)
                        .build()))
                .type(ServiceType.NODE_PORT)
                .build();

        final Ingress ingress = Ingress.Builder.create(this, "GitlabIngress")
                .rules(ImmutableList.of(IngressRule.builder()
                        .path("/*")
                        .backend(IngressBackend.fromService(service)).build()))

    }
}
