import * as fs from "fs";
import * as path from "path";
import * as jsYaml from "js-yaml";
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import {addDependency} from "@aws-cdk/core/lib/deps";
import {CfnWaitCondition} from "@aws-cdk/core";

interface K8sManifestJson {
    kind: string;
    metadata: {
        name: string;
    };
}

interface ManifestGroup {
    manifests: K8sManifestJson[];
    size: number;
}

export interface CertificateManagerProps {
    cluster: eks.Cluster;
}

export class CertificateManager extends cdk.Construct {

    readonly waitCondition: CfnWaitCondition

    constructor(scope: cdk.Construct, id: string, props: CertificateManagerProps) {
        super(scope, id);

        // Cert manager doesn't currently work with fargate
        // https://github.com/jetstack/cert-manager/issues/3237
        props.cluster.addNodegroupCapacity('cert-manager', {
            nodegroupName: 'cert-manager',
            instanceTypes: [new ec2.InstanceType('m5.large')],
            minSize: 2,
            diskSize: 40,
            amiType: eks.NodegroupAmiType.AL2_X86_64,
        });

        // https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.1/deploy/installation/
        const certManagerManifest = fs.readFileSync(path.join('resources', 'cert-manager_v1.2.0.yaml'), {encoding: 'utf8'});
        const manifests: K8sManifestJson[] = jsYaml.loadAll(certManagerManifest);
        const groups: ManifestGroup[] = this.splitManifestsInGroups(manifests);

        const cdkManifests = groups.map((group, groupIndex) => {
            return new eks.KubernetesManifest(props.cluster, `k8sCertManager-part-${groupIndex}`, {
                cluster: props.cluster,
                manifest: group.manifests,
                overwrite: true,
            });
        });

        // Define a wait condition and handle for cert manager to be fully deployed
        const waitConditionHandle = new cdk.CfnWaitConditionHandle(props.cluster, 'k8sCertManagerWaitConditionHandle');
        const waitCondition = new cdk.CfnWaitCondition(props.cluster, 'k8sCertManagerWaitCondition', {
            count: 1,
            handle: waitConditionHandle.ref,
            timeout: '600',
        });
        for (let certManagerManifest of cdkManifests) {
            waitConditionHandle.node.addDependency(certManagerManifest);
        }

        // TODO poll for ready, somehow?
        const certManagerWaitConditionSignal = props.cluster.addManifest('cert-manager-wait-condition-signal', {
            kind: "Pod",
            apiVersion: "v1",
            metadata: {
                name: 'cert-manager-wait-condition-signal',
                namespace: "default"
            },
            spec: {
                initContainers:
                    [{
                        name: "wait-cert-manager-service",
                        image: "busybox:1.28",
                        command: ['sh', '-c', 'echo begin sleep && sleep 500 && echo end sleep']
                    }],
                containers:
                    [{
                        name: "cert-manager-waitcondition-signal",
                        image: "curlimages/curl:7.74.0",
                        args: [
                            '-vvv',
                            '-X',
                            'PUT',
                            '-H', 'Content-Type:',
                            '--data-binary', '{"Status" : "SUCCESS","Reason" : "Configuration Complete", "UniqueId" : "ID1234", "Data" : "Cert manager should be ready by now."}',
                            waitConditionHandle.ref
                        ]
                    }],
                restartPolicy: "Never"
            }
        })
        certManagerWaitConditionSignal.node.addDependency(waitConditionHandle)
        this.waitCondition = waitCondition
    }

    private splitManifestsInGroups(manifests: K8sManifestJson[]): ManifestGroup[] {
        const maxGroupSize = Math.floor(262144 * .8)
        const groups: ManifestGroup[] = []

        // Splitting all manifest in groups so total size of group is less than 262144 bytes
        manifests.forEach(manifest => {
            const manifestSize = JSON.stringify(manifest).length;
            console.log(`cert-manager manifest '${manifest.kind}/${manifest?.metadata?.name}' size is ${manifestSize} characters`);
            const lastGroup = (groups.length && groups[groups.length - 1]) || null;
            if (lastGroup === null || (lastGroup.size + manifestSize) > maxGroupSize) {
                groups.push({
                    manifests: [manifest],
                    size: manifestSize
                });
            } else {
                lastGroup.manifests.push(manifest);
                lastGroup.size += manifestSize;
            }
        });

        return groups;
    }
}
