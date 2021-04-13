import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

export interface LegendStudioChartProps {
    readonly imageId: string,
    readonly mongoUser: string,
    readonly mongoPassword: string,
    readonly mongoHostPort: string,
    readonly gitlabOauthClientId: string,
    readonly gitlabOauthSecret: string,
    readonly gitlabPublicUrl: string,
    readonly legendStudioPort: number,
    readonly legendEngineUrl: string,
    readonly legendSdlcUrl: string,
    readonly legendStudioHost: string,
}

export class LegendStudioChart extends cdk8s.Chart {

    constructor(scope: constructs.Construct, id: string, props: LegendStudioChartProps) {
        super(scope, id);

        const httpConfigText = fs.readFileSync(path.join('resources', 'configs', 'studio', 'httpConfig.json'), {encoding: 'utf8'})
            .replace('__MONGO_USER__', props.mongoUser)
            .replace('__MONGO_PASSWORD__', props.mongoPassword)
            .replace('__MONGO_HOST_PORT__', props.mongoHostPort)
            .replace('__GITLAB_OAUTH_CLIENT_ID__', props.gitlabOauthClientId)
            .replace('__GITLAB_OAUTH_SECRET__', props.gitlabOauthSecret)
            .replace('__GITLAB_PUBLIC_URL__', props.gitlabPublicUrl)
            .replace('__LEGEND_STUDIO_PORT__', String(props.legendStudioPort))

        const uiConfig = fs.readFileSync(path.join('resources', 'configs', 'studio', 'uiConfig.json'), {encoding: 'utf8'})
            .replace('__LEGEND_ENGINE_URL__', props.legendEngineUrl)
            .replace('__LEGEND_SDLC_URL__', props.legendSdlcUrl)

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'httpConfig.json': httpConfigText,
                'uiConfig.json': uiConfig,
            }
        })

        const app = 'legend-studio'
        const service = app + "-service"
        new k8s.Deployment(this, "LegendStudio", {
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
                                name: 'legend-studio',
                                image: props.imageId,
                                volumeMounts: [
                                    {
                                        name: 'configurations',
                                        mountPath: '/config'
                                    }
                                ]
                            }
                        ],
                        volumes: [
                            {
                                name: 'configurations',
                                configMap: {
                                    name: config.name,
                                    items: [
                                        {
                                            key: 'httpConfig.json',
                                            path: 'httpConfig.json'
                                        },
                                        {
                                            key: 'uiConfig.json',
                                            path: 'uiConfig.json'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        })

        new k8s.Service(this, "LegendStudioService", {
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