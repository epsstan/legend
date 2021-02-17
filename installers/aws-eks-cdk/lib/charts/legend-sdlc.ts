import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

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

    static synth() {
        const app = new cdk8s.App();
        new LegendSdlcChart(app, "LegendStudio", {
            imageId: '752499117019.dkr.ecr.us-east-1.amazonaws.com/legend-studio:3d199f2',
            legendSdlcPort: 80,
            mongoUser: 'admin',
            mongoPassword: '8296daf8-6fb6-11eb-9439-0242ac130002',
            mongoHostPort: 'mongo-service.default.svc.cluster.local',
            gitlabOauthClientId: 'legend',
            gitlabOauthSecret: 'foobar',
            gitlabPublicUrl: `https://gitlab.sky-hagere.io`,
            legendSdlcUrl: `https://sdlc.sky-hagere.io`,
            gitlabHost: 'foobar',
            gitlabPort: 80,
        })
        app.synth()
    }

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
            .replace(RegExp('__GITLAB_PORT__', 'g'), String(props.legendSdlcPort))
            .replace(RegExp('__LEGEND_SDLC_URL__', 'g'), props.legendSdlcUrl)

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'config.json': templateText
            }
        })

        const app = 'legend-sdlc'
        const service = app + "-service"
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