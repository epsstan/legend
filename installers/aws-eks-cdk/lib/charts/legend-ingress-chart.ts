import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";

export interface LegendIngressChartProps {
    readonly legendDomain: string
    readonly stage: LegendInfrastructureStageProps
}

export class LegendIngressChart extends cdk8s.Chart {

    constructor(scope: constructs.Construct, id: string, props: LegendIngressChartProps) {
        super(scope, id);

        new k8s.Ingress(this, "LegendIngress", {
            metadata: {
                name: 'legend-ingress',
                annotations: {
                    'kubernetes.io/ingress.class': 'alb',
                    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTPS":443}]',
                    'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                    'alb.ingress.kubernetes.io/success-codes': '200,201,302,401',
                },
            },
            spec: {
                rules: [
                    {
                        host: `${props.legendDomain}`,
                        http: {
                            paths: [{
                                path: '/sdlc/*',
                                backend: {
                                    serviceName: 'legend-sdlc-service',
                                    servicePort: 80,
                                }
                            },
                            {
                                path: '/sdlc',
                                backend: {
                                    serviceName: 'legend-sdlc-service',
                                    servicePort: 80,
                                }
                            },
                            {
                                path: '/studio/*',
                                backend: {
                                    serviceName: 'legend-studio-service',
                                    servicePort: 80,
                                },
                            },
                            {
                                path: '/studio',
                                backend: {
                                    serviceName: 'legend-studio-service',
                                    servicePort: 80,
                                },
                            },
                            {
                                path: '/engine/*',
                                backend: {
                                    serviceName: 'legend-engine-service',
                                    servicePort: 80,
                                }
                            },
                            {
                                path: '/engine',
                                backend: {
                                    serviceName: 'legend-engine-service',
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