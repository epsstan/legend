import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import {ClusterRole, ClusterRoleBinding, DaemonSet, Namespace, Quantity} from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";
import {ConfigMap, ServiceAccount} from "cdk8s-plus";

export interface ContainerInsightsChartProps {
    readonly clusterName: string,
    readonly clusterRegion: string,
}

export class ContainerInsightsChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: ContainerInsightsChartProps) {
        super(scope, id);

        const FLUENT_BIT_CLUSTER_INFO = 'fluent-bit-cluster-info'

        const namespace = new Namespace(this, 'amazon-cloudwatch', {
            metadata: {
                name: 'amazon-cloudwatch',
                labels: {
                    name: 'amazon-cloudwatch'
                }
            }
        })
        const serviceAccount = new ServiceAccount(this, "cloudwatch-agent-service-account", {
            metadata: {
                name: 'cloudwatch-agent',
                namespace: namespace.name
            }
        })
        const clusterRole = new ClusterRole(this, "cloudwatch-agent-role", {
            metadata: {
                name: 'cloudwatch-agent-role',
            },
            rules: [
                {
                    apiGroups: [""],
                    resources: ["pods", "nodes", "endpoints"],
                    verbs: ["list", "watch"]
                },
                {
                    apiGroups: ["apps"],
                    resources: ["replicasets"],
                    verbs: ["list", "watch"]
                },
                {
                    apiGroups: ["batch"],
                    resources: ["jobs"],
                    verbs: ["list", "watch"]
                },
                {
                    apiGroups: [""],
                    resources: ["nodes/proxy"],
                    verbs: ["get"]
                },
                {
                    apiGroups: [""],
                    resources: ["nodes/stats", "configmaps", "events"],
                    verbs: ["create"]
                },
                {
                    apiGroups: [""],
                    resources: ["configmaps"],
                    resourceNames: ["cwagent-clusterleader"],
                    verbs: ["get","update"]
                }
            ]
        })
        const clusterRoleBinding = new ClusterRoleBinding(this, "cloudwatch-agent-role-binding", {
            metadata: {
                name: 'cloudwatch-agent-role-binding'
            },
            subjects: [
                {
                    kind: 'ServiceAccount',
                    name: serviceAccount.name,
                    namespace: namespace.name
                }
            ],
            roleRef: {
                kind: clusterRole.kind,
                name: clusterRole.name,
                apiGroup: clusterRole.apiGroup,
            }
        })
        const cwAgentConfig = new ConfigMap(this, 'cwagentconfig', {
            metadata: {
                name: 'cwagentconfig',
                namespace: namespace.name
            },
            data: {
                'cwagentconfig.json': fs.readFileSync(path.join('resources', 'cwagent', 'cwagentconfig.json'), {encoding: 'utf8'})
                    .replace('{{region_name}}', props.clusterRegion)
                    .replace('{{cluster_name}}', props.clusterName)
            }
        })
        const cloudwatchAgent = new DaemonSet(this, "cloudwatch-agent", {
            metadata: {
                name: 'cloudwatch-agent',
                namespace: namespace.name
            },
            spec: {
                selector: {
                    matchLabels: {
                        name: serviceAccount.name
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            name: serviceAccount.name
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: serviceAccount.name,
                                image: 'amazon/cloudwatch-agent:1.247347.3b250378',
                                resources: {
                                    limits: {
                                        cpu: Quantity.fromString('200m'),
                                        memory: Quantity.fromString('200Mi')
                                    },
                                    requests: {
                                        cpu: Quantity.fromString('200m'),
                                        memory: Quantity.fromString('200Mi')
                                    }
                                },
                                env: [
                                    {
                                        name: 'HOST_IP',
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: 'status.hostIP'
                                            }
                                        }
                                    },
                                    {
                                        name: 'HOST_NAME',
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: 'spec.nodeName'
                                            }
                                        }
                                    },
                                    {
                                        name: 'K8S_NAMESPACE',
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: 'metadata.namespace'
                                            }
                                        }
                                    },
                                    {
                                        name: 'CI_VERSION',
                                        value: 'k8s/1.3.3'
                                    }
                                ],
                                volumeMounts: [
                                    {
                                        name: cwAgentConfig.name,
                                        mountPath: '/etc/cwagentconfig',
                                    },
                                    {
                                        name: 'rootfs',
                                        mountPath: '/rootfs',
                                        readOnly: true
                                    },
                                    {
                                        name: 'dockersock',
                                        mountPath: '/var/run/docker.sock',
                                        readOnly: true
                                    },
                                    {
                                        name: 'varlibdocker',
                                        mountPath: '/var/lib/docker',
                                        readOnly: true
                                    },
                                    {
                                        name: 'sys',
                                        mountPath: '/sys',
                                        readOnly: true
                                    },
                                    {
                                        name: 'devdisk',
                                        mountPath: '/dev/disk',
                                        readOnly: true
                                    }
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: cwAgentConfig.name,
                                configMap: {
                                    name: cwAgentConfig.name
                                }
                            },
                            {
                                name: 'rootfs',
                                hostPath: {
                                    path: '/'
                                }
                            },
                            {
                                name: 'dockersock',
                                hostPath: {
                                    path: '/var/run/docker.sock'
                                }
                            },
                            {
                                name: 'varlibdocker',
                                hostPath: {
                                    path: '/var/lib/docker'
                                }
                            },
                            {
                                name: 'sys',
                                hostPath: {
                                    path: '/sys'
                                }
                            },
                            {
                                name: 'devdisk',
                                hostPath: {
                                    path: '/dev/disk/'
                                }
                            }
                        ],
                        terminationGracePeriodSeconds: 60,
                        serviceAccountName: serviceAccount.name
                    }
                }
            }
        })
        const fluentBitClusterInfo = new ConfigMap(this, 'fluent-bit-cluster-info', {
            metadata: {
                name: 'fluent-bit-cluster-info',
                namespace: namespace.name
            },
            data: {
                'cluster.name': props.clusterName,
                'logs.region': props.clusterRegion,
                'http.server': 'On',
                'http.port': '200',
                'read.head': 'Off',
                'read.tail': 'On',
            }
        })
        const fluentBitServiceAccount = new ServiceAccount(this, 'fluent-bit-service-account', {
            metadata: {
                name: 'fluent-bit',
                namespace: namespace.name
            }
        })
        const fluentBitRole = new ClusterRole(this, 'fluent-bit-role', {
            metadata: {
                name: 'fluent-bit-role'
            },
            rules: [
                {
                    nonResourceURLs: [ '/metrics' ],
                    verbs: [ 'get' ],
                },
                {
                    apiGroups: [''],
                    resources: ['namespaces', 'pods', 'pods/logs'],
                    verbs: ['get', 'list', 'watch']
                }
            ]
        })
        const fluentBitClusterRoleBinding = new ClusterRoleBinding(this, 'fluent-bit-role-binding', {
            metadata: {
                name: 'fluent-bit-role-binding'
            },
            roleRef: {
                kind: fluentBitRole.kind,
                name: fluentBitRole.name,
                apiGroup: fluentBitRole.apiGroup,
            },
            subjects: [
                {
                    kind: 'ServiceAccount',
                    name: 'fluent-bit',
                    namespace: namespace.name
                }
            ]
        })

        const encode = (str: string):string => Buffer.from(str, 'binary').toString('base64');
        const fluentBitConfig = new ConfigMap(this, 'fluent-bit-config', {
            metadata: {
                name: 'fluent-bit-config',
                namespace: namespace.name,
                labels: {
                    'k8s-app': 'fluent-bit'
                }
            },
            binaryData: {
                'fluent-bit.conf': encode(fs.readFileSync(path.join('resources', 'cwagent', 'fluent-bit.conf'), {encoding: 'utf8'})),
                'application-log.conf': encode(fs.readFileSync(path.join('resources', 'cwagent', 'application-log.conf'), {encoding: 'utf8'})),
                'dataplane-log.conf': encode(fs.readFileSync(path.join('resources', 'cwagent', 'dataplane-log.conf'), {encoding: 'utf8'})),
                'host-log.conf': encode(fs.readFileSync(path.join('resources', 'cwagent', 'host-log.conf'), {encoding: 'utf8'})),
                'parsers.conf': encode(fs.readFileSync(path.join('resources', 'cwagent', 'parsers.conf'), {encoding: 'utf8'})),
            }
        })
        const fluentBitDaemonSet = new DaemonSet(this, 'fluent-bit', {
            metadata: {
                name: 'fluent-bit',
                namespace: namespace.name,
                labels: {
                    'k8s-app': 'fluent-bit',
                    'version': 'v1',
                    'kubernetes.io/cluster-service': 'true',
                }
            },
            spec: {
                selector: {
                    matchLabels: {
                        'k8s-app': 'fluent-bit'
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            'k8s-app': 'fluent-bit',
                            'version': 'v1',
                            'kubernetes.io/cluster-service': 'true',
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: 'fluent-bit',
                                image: 'amazon/aws-for-fluent-bit:2.10.0',
                                imagePullPolicy: 'Always',
                                env: [
                                    {
                                        name: 'AWS_REGION',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: FLUENT_BIT_CLUSTER_INFO,
                                                key: 'logs.region',
                                            },
                                        }
                                    },
                                    {
                                        name: 'CLUSTER_NAME',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: FLUENT_BIT_CLUSTER_INFO,
                                                key: 'cluster.name',
                                            },
                                        }
                                    },
                                    {
                                        name: 'HTTP_SERVER',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: FLUENT_BIT_CLUSTER_INFO,
                                                key: 'http.server',
                                            },
                                        }
                                    },
                                    {
                                        name: 'HTTP_PORT',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: FLUENT_BIT_CLUSTER_INFO,
                                                key: 'http.port',
                                            },
                                        }
                                    },
                                    {
                                        name: 'READ_FROM_HEAD',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: FLUENT_BIT_CLUSTER_INFO,
                                                key: 'read.head',
                                            },
                                        }
                                    },
                                    {
                                        name: 'READ_FROM_TAIL',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: FLUENT_BIT_CLUSTER_INFO,
                                                key: 'read.tail',
                                            },
                                        }
                                    },
                                    {
                                        name: 'HOST_NAME',
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: 'spec.nodeName'
                                            },
                                        }
                                    },
                                    {
                                        name: 'CI_VERSION',
                                        value: 'k8s/1.3.3',
                                    }
                                ],
                                resources: {
                                    limits: {
                                        memory: Quantity.fromString('200Mi')
                                    },
                                    requests: {
                                        cpu: Quantity.fromString('500m'),
                                        memory: Quantity.fromString('100Mi')
                                    }
                                },
                                volumeMounts: [
                                    {
                                        name: 'fluentbitstate',
                                        mountPath: '/var/fluent-bit/state'
                                    },
                                    {
                                        name: 'varlog',
                                        mountPath: '/var/log',
                                        readOnly: true,
                                    },
                                    {
                                        name: 'varlibdockercontainers',
                                        mountPath: '/var/lib/docker/containers',
                                        readOnly: true,
                                    },
                                    {
                                        name: 'fluent-bit-config',
                                        mountPath: '/fluent-bit/etc/'
                                    },
                                    {
                                        name: 'runlogjournal',
                                        mountPath: '/run/log/journal',
                                        readOnly: true
                                    },
                                    {
                                        name: 'dmesg',
                                        mountPath: '/var/log/dmesg',
                                        readOnly: true
                                    }
                                ],
                            }
                        ],
                        terminationGracePeriodSeconds: 10,
                        volumes: [
                            {
                                name: 'fluentbitstate',
                                hostPath: {
                                    path: '/var/fluent-bit/state'
                                }
                            },
                            {
                                name: 'varlog',
                                hostPath: {
                                    path: '/var/log'
                                }
                            },
                            {
                                name: 'varlibdockercontainers',
                                hostPath: {
                                    path: '/var/lib/docker/containers'
                                }
                            },
                            {
                                name: 'fluent-bit-config',
                                configMap: {
                                    name: 'fluent-bit-config'
                                }
                            },
                            {
                                name: 'runlogjournal',
                                hostPath: {
                                    path: '/run/log/journal'
                                }
                            },
                            {
                                name: 'dmesg',
                                hostPath: {
                                    path: '/var/log/dmesg'
                                }
                            },
                        ],
                        serviceAccountName: fluentBitServiceAccount.name,
                        tolerations: [
                            {
                                key: 'node-role.kubernetes.io/master',
                                operator: 'Exists',
                                effect: 'NoSchedule'
                            },
                            {
                                operator: 'Exists',
                                effect: 'NoExecute',
                            },
                            {
                                operator: 'Exists',
                                effect: 'NoSchedule',
                            }
                        ]
                    }
                }
            }
        })
    }
}