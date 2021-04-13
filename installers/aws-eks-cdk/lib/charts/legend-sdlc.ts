import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from 'uuid';

export interface LegendSdlcProps {
    readonly imageId: string
    readonly legendSdlcPort: number,
    readonly gitlabOauthClientId: string,
    readonly gitlabOauthSecret: string,
    readonly gitlabPublicUrl: string,
    readonly mongoUser: string,
    readonly mongoPassword: string,
    readonly mongoHostPort: string,
    readonly gitlabHost: string,
    readonly gitlabPort: number,
    readonly legendSdlcUrl: string,
}

export class LegendSdlcChart extends cdk8s.Chart {

    constructor(scope: constructs.Construct, id: string, props: LegendSdlcProps) {
        super(scope, id);

        const templateText = fs.readFileSync(path.join('resources', 'configs', 'sdlc', 'config.json'), {encoding: 'utf8'})
            .replace(RegExp('__LEGEND_SDLC_PORT__', 'g'), String(props.legendSdlcPort))
            .replace(RegExp('__GITLAB_OAUTH_CLIENT_ID__', 'g'), props.gitlabOauthClientId)
            .replace(RegExp('__GITLAB_OAUTH_SECRET__', 'g'), props.gitlabOauthSecret)
            .replace(RegExp('__GITLAB_PUBLIC_URL__', 'g'), props.gitlabPublicUrl)
            .replace(RegExp('__MONGO_USER__', 'g'), props.mongoUser)
            .replace(RegExp('__MONGO_PASSWORD__', 'g'), props.mongoPassword)
            .replace(RegExp('__MONGO_HOST_PORT__', 'g'), props.mongoHostPort)
            .replace(RegExp('__GITLAB_HOST__', 'g'), props.gitlabHost)
            .replace(RegExp('__GITLAB_PORT__', 'g'), String(props.gitlabPort))
            .replace(RegExp('__LEGEND_SDLC_URL__', 'g'), props.legendSdlcUrl)

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'config.json': templateText
            }
        })

        const app = 'legend-sdlc'
        const service = app + "-service"
        const configId = uuidv4()
        new k8s.Deployment(this, "LegendSdlc", {
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
                                name: 'legend-sdlc',
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

        new k8s.Service(this, "LegendSDLCService", {
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