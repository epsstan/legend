import {Construct, Stack} from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import * as eks from '@aws-cdk/aws-eks'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as yaml from 'js-yaml';
import * as iam from "@aws-cdk/aws-iam";

export interface AlbIngressControllerProps {
    cluster: eks.Cluster
    vpc: ec2.Vpc
    //certificateManager: CertificateManager
}

// https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
export class EksAlbIngressController extends Construct {
    constructor(scope: Construct, id: string, props: AlbIngressControllerProps) {
        super(scope, id);

        const ingressCtrlServiceAccount = new eks.ServiceAccount(this, "IngressCntrlServiceAccount", {
            namespace: 'kube-system',
            name: 'aws-load-balancer-controller',
            cluster: props.cluster
        })

        const ingressCtrlPolicy = new iam.Policy(this, "IngressCtrlPolicy", {
            document: iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync(path.join('resources', 'alb-ingress-controller-policy.json'), {encoding: 'utf8'})))
        })
        ingressCtrlPolicy.attachToRole(ingressCtrlServiceAccount.role);

        let albManifest = fs.readFileSync(path.join('resources', 'alb-ingress-controller_v2.1.2.yaml'), {encoding: 'utf8'});
        albManifest = albManifest.replace(/your-cluster-name/g, props.cluster.clusterName);

        const awsLoadbalancerCrds = new eks.KubernetesManifest(this, "AwsLoadBalancerCRDS", {
            cluster: props.cluster,
            manifest: yaml.loadAll(fs.readFileSync(path.join('resources', 'alb-crds_v2.1.2.yaml'), {encoding: 'utf8'}))
        });

        props.cluster.addHelmChart( 'AwsLoadBalancer', {
            repository: 'https://aws.github.io/eks-charts',
            namespace: 'kube-system',
            chart: 'aws-load-balancer-controller',
            values: {
                clusterName: props.cluster.clusterName,
                region: Stack.of(this).region,
                vpcId: props.vpc.vpcId,
                serviceAccount: {
                    name: 'aws-load-balancer-controller',
                    create: false,
                },
            }
        });
    }
}