import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import {Quantity} from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {v4 as uuidv4} from "uuid";

export interface GitlabCeChartProps {
    gitlabDomain: string,
    gitlabRootPassword: string,
    image: string,
    stage: LegendInfrastructureStageProps,
}

export class GitlabCeChart extends cdk8s.Chart {

    constructor(scope: constructs.Construct, id: string, props: GitlabCeChartProps) {
        super(scope, id);

        const templateText = fs.readFileSync(path.join('resources', 'configs', 'gitlab', 'omnibus.config'), {encoding: 'utf8'})
            .replace('__GITLAB_EXTERNAL_URL__', props.gitlabDomain)
            .replace('__GITLAB_ROOT_PASSWORD__', props.gitlabRootPassword)

        /*const storageClass = new k8s.StorageClass(this, "GitlabStorageClass", {
            metadata: {
                name: 'gl-sc'
            },
            provisioner: 'ebs.csi.aws.com',
            volumeBindingMode: 'WaitForFirstConsumer',
        })

        const volumeClaim = new k8s.PersistentVolumeClaim(this, "GitlabDataVolumeClaim", {
            metadata: {
                name: 'gitlab-data-vol-claim'
            },
            spec: {
                accessModes: ['ReadWriteOnce'],
                storageClassName: storageClass.name,
                resources: {
                    requests: {
                        storage: Quantity.fromString("100Gi")
                    }
                }
            }
        })*/

        const encode = (str: string):string => Buffer.from(str, 'binary').toString('base64');
        const configId = uuidv4()
        const config = new k8s.ConfigMap(this, "Config", {
            binaryData: {
                'config.sh': encode(fs.readFileSync(path.join('resources', 'gitlab-no-signup', 'config.sh'), {encoding: 'utf8'})),
                'gen_cert.sh': encode(fs.readFileSync(path.join('resources', 'gitlab-no-signup', 'gen_cert.sh'), {encoding: 'utf8'})),
            }
        })

        new k8s.Deployment(this, "GitlabCE", {
            spec: {
                selector: {
                    matchLabels: {
                        app: 'gitlab-ce'
                    }
                },
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            app: 'gitlab-ce'
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: 'gitlab-ce',
                                image: props.image,
                                env: [
                                    {
                                        name: 'GITLAB_OMNIBUS_CONFIG',
                                        value: templateText,
                                    },
                                    {
                                        name: 'GITLAB_POST_RECONFIGURE_SCRIPT',
                                        value: '/tmp/config.sh'
                                    }
                                ],
                                command: ["/bin/sh"],
                                args: ["-c", "cp /config/* /tmp/ && chmod +x /tmp/* && ./assets/wrapper"],
                                resources: {
                                    requests: {
                                        // Needs 4GB of RAM or NGinx doesn't always configure correctly...
                                        memory: Quantity.fromString("4096Mi"),
                                        cpu: Quantity.fromString("2000m")
                                    }
                                },
                                volumeMounts: [
                                    {
                                        name: configId,
                                        mountPath: '/config'
                                    }
                                ]
                            }
                        ],
                        volumes: [
                            {
                                name: configId,
                                configMap: {
                                    name: config.name,
                                }
                            }
                        ]
                    }
                }
            }
        })

        new k8s.Service(this, "GitlabCEService", {
            metadata: {
                name: 'gitlab-ce-service',
            },
            spec: {
                ports: [
                    {
                        port: 80,
                        targetPort: 80,
                        protocol: 'TCP'
                    },
                ],
                type: 'NodePort',
                selector: {
                    app: 'gitlab-ce'
                }
            },
        })

        new k8s.Ingress(this, "GitlabIngress", {
            metadata: {
                name: 'gitlab-ce-ingress',
                annotations: {
                    'kubernetes.io/ingress.class': 'alb',
                    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTPS":443}]',
                    'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                    'alb.ingress.kubernetes.io/success-codes': '200,201,302',
                },
            },
            spec: {
                rules: [
                    {
                        host: props.gitlabDomain,
                        http: {
                            paths: [{
                                path: '/*',
                                backend: {
                                    serviceName: 'gitlab-ce-service',
                                    servicePort: 80,
                                }
                            }],
                        }
                    },
                ]
            }
        })
    }
}
