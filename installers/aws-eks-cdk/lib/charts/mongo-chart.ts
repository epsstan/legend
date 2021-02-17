import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import {Quantity} from "cdk8s-plus/lib/imports/k8s";

export interface MongoCharProps {
    password: string
}

export class MongoChart extends cdk8s.Chart {

    static synth() {
        const app = new cdk8s.App();
        new MongoChart(app, "MonogoChart", { password: '8296daf8-6fb6-11eb-9439-0242ac130002' })
        app.synth()
    }

    constructor(scope: constructs.Construct, id: string, props: MongoCharProps) {
        super(scope, id);

        // TODO This isn't actually durable... we should seriously look into not using a self run mongo.
        const statefulSet = new k8s.StatefulSet(this, "MongoStandalone", {
            metadata: {
                name: 'mongodb-standalone'
            },
            spec: {
                serviceName: 'database',
                replicas: 1,
                selector: {
                    matchLabels: {
                        app: 'database'
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            app: 'database',
                            selector: 'mongodb-standalone'
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: 'mongodb',
                                image: 'mongo:latest',
                                env: [
                                    {
                                        name: 'MONGO_INITDB_ROOT_USERNAME',
                                        value: 'admin'
                                    },
                                    {
                                        name: 'MONGO_INITDB_ROOT_PASSWORD',
                                        value: props.password
                                    }
                                ],
                                resources: {
                                    requests: {
                                        memory: Quantity.fromString("2048Mi"),
                                        cpu: Quantity.fromString("2000m")
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        })

        const service = new k8s.Service(this, "MongoService", {
            metadata: {
                name: 'mongo-service',
            },
            spec: {
                ports: [
                    {
                        port: 27017,
                        targetPort: 27017,
                        protocol: 'TCP',
                    },
                ],
                type: 'ClusterIP',
                selector: {
                    app: 'database'
                }
            },
        })

    }
}