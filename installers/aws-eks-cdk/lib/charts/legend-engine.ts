import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from 'uuid';

export interface LegendEngineChartProps {
    readonly imageId: string,
    readonly gitlabOauthClientId: string,
    readonly gitlabOauthSecret: string,
    readonly gitlabPublicUrl: string,
    readonly mongoUser: string,
    readonly mongoPassword: string,
    readonly mongoHostPort: string,
    readonly legendEnginePort: number
}

export class LegendEngineChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: LegendEngineChartProps) {
        super(scope, id);

        const templateText = fs.readFileSync(path.join('resources', 'configs', 'engine', 'config.json'), {encoding: 'utf8'})
            .replace('__GITLAB_OAUTH_CLIENT_ID__', props.gitlabOauthClientId)
            .replace('__GITLAB_OAUTH_SECRET__', props.gitlabOauthSecret)
            .replace('__GITLAB_PUBLIC_URL__', props.gitlabPublicUrl)
            .replace('__MONGO_USER__', props.mongoUser)
            .replace('__MONGO_PASSWORD__', props.mongoPassword)
            .replace('__MONGO_HOST_PORT__', String(props.mongoHostPort))
            .replace('__LEGEND_ENGINE_PORT__', String(props.legendEnginePort))

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'config.json': templateText
            }
        })

        const app = 'legend-engine'
        const service = app + "-service"
        const configId = uuidv4()

        new k8s.Deployment(this, "LegendEngine", {
            spec: {
                selector: {
                    matchLabels: {
                        app: app
                    }
                },
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            app: app
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: 'legend-engine',
                                image: props.imageId,
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
                                    items: [
                                        {
                                            key: 'config.json',
                                            path: 'config.json'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        })

        new k8s.Service(this, "LegendEngineService", {
            metadata: {
                name: service,
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
                    app: app
                }
            },
        })
    }
}