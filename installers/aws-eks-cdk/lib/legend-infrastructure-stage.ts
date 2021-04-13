import {Construct, Stage, StageProps} from "@aws-cdk/core";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";
import {GitlabStack} from "./stacks/gitlab";
import {LegendEngineStack} from "./stacks/legend-engine";
import {LegendSdlcStack} from "./stacks/legend-sdlc";
import {LegendStudioStack} from "./stacks/legend-studio";
import {LegendIngressStack} from "./stacks/legend-ingress";
import {GitlabDnsStack} from "./stacks/gitlab-dns";
import {LegendDnsStack} from "./stacks/legend-dns";

export interface LegendInfrastructureStageProps extends StageProps {
    stageName: string,
    repositoryNames: string[],
    prefix?: string,
}

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props: LegendInfrastructureStageProps) {
        super(scope, id, props);

        // Base networking and Kubernetes infrastructure
        const kubernetes = new KubernetesStack(this, "Kubernetes", {
            repositoryNames: props.repositoryNames,
            env: props.env
        })

        const stackParams = {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value,
            env: props.env,
            stage: props,
        }

        const mongo = new MongoStack(this, "Mongo", stackParams)
        mongo.addDependency(kubernetes)

        const gitlab = new GitlabStack(this, "Gitlab", stackParams)
        gitlab.addDependency(kubernetes)

        const gitlabDNS = new GitlabDnsStack(this, "GitlabDNS", stackParams);
        gitlabDNS.addDependency(gitlab)

        const engine = new LegendEngineStack(this, "Engine", {
            ...{ gitlabRootSecret: gitlab.gitlabRootSecret,
                 mongoSecret: mongo.mongoSecret },
            ...stackParams,
        })
        engine.addDependency(gitlabDNS)

        const sdlc = new LegendSdlcStack(this, "SDLC", {
            ...{ gitlabRootSecret: gitlab.gitlabRootSecret,
                 mongoSecret: mongo.mongoSecret },
            ...stackParams,
        })
        sdlc.addDependency(gitlabDNS)
        sdlc.addDependency(engine)

        const studio = new LegendStudioStack(this, "Studio", {
            ...{ gitlabRootSecret: gitlab.gitlabRootSecret,
                mongoSecret: mongo.mongoSecret },
            ...stackParams,
        })
        studio.addDependency(gitlabDNS)
        studio.addDependency(sdlc)

        const ingress = new LegendIngressStack(this, "Ingress", stackParams);
        ingress.addDependency(studio)
        ingress.addDependency(sdlc)
        ingress.addDependency(engine)

        const legendDns = new LegendDnsStack(this, "LegendDNS", stackParams);
        legendDns.addDependency(ingress)
    }
}