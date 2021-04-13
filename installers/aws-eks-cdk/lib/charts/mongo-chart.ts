import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";

export interface MongoCharProps {
    password: string
}

export class MongoChart extends cdk8s.Chart {
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
                                ]
                            }
                        ]
                    }
                }
            }
        })

        const service = new k8s.Service(this, "MongoService", {
            metadata: {
                name: 'mongo-service',
                annotations: {
                    'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb-ip'
                }
            },
            spec: {
                ports: [
                    {
                        port: 27017,
                        targetPort: 27017,
                        protocol: 'TCP'
                    },
                ],
                type: 'LoadBalancer',
                selector: {
                    app: 'database'
                }
            },
        })

    }
}