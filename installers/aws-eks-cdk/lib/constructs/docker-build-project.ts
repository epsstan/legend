import {Construct, RemovalPolicy, SecretValue, Stack} from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as codebuild from "@aws-cdk/aws-codebuild";
import {BuildEnvironmentVariableType} from "@aws-cdk/aws-codebuild";

export interface DockerBuildProjectProps {
    repositoryName: string,
    preBuildCommands: string[]
}

export class DockerBuildProject extends Construct {

    readonly project: codebuild.Project

    constructor(scope: Construct, id: string, props: DockerBuildProjectProps) {
        super(scope, id);

        // TODO lifecycle rules
        const repository = new ecr.Repository(this, props.repositoryName, {
            repositoryName: props.repositoryName,
            removalPolicy: RemovalPolicy.DESTROY,
        })
        const region = Stack.of(this).region
        const account = Stack.of(this).account

        const dockerHubSecret = secretsmanager.Secret.fromSecretPartialArn(this, "DockerHubCredentials", `arn:aws:secretsmanager:${region}:${account}:secret:dockerhub-credentials`)
        this.project = new codebuild.PipelineProject(this, 'Project', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    pre_build: {
                        commands: [
                            'echo Logging in to DockerHub...',
                            'DOCKERHUB_USER=$(echo $DOCKER_HUB_CREDS | jq -r \'.Username\')',
                            'DOCKERHUB_PASSWORD=$(echo $DOCKER_HUB_CREDS | jq -r \'.Password\')',
                            'echo $DOCKERHUB_PASSWORD | docker login --username $DOCKERHUB_USER --password-stdin',
                            'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
                            'IMAGE_TAG=${COMMIT_HASH:=latest}',
                            'REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME'
                        ]
                    },
                    install: {
                        commands: props.preBuildCommands,
                    },
                    build: {
                        commands: [
                            'docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .',
                            'docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG',
                            'printf \'{"ImageURI":"%s"}\' $REPOSITORY_URI:$IMAGE_TAG > $CODEBUILD_SRC_DIR/imageDetail.json'
                        ]
                    },
                    post_build: {
                        commands: [
                            'echo Logging in to Amazon ECR...',
                            'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
                            'docker push $REPOSITORY_URI:$IMAGE_TAG'
                        ]
                    },
                },
                artifacts: {
                    files: [
                        'imageDetail.json'
                    ]
                }
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true,
                environmentVariables: {
                    'IMAGE_REPO_NAME' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: repository.repositoryName
                    },
                    'AWS_DEFAULT_REGION' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: Stack.of(this).region
                    },
                    'AWS_ACCOUNT_ID' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: Stack.of(this).account
                    },
                    'DOCKER_HUB_CREDS': {
                        type: BuildEnvironmentVariableType.SECRETS_MANAGER,
                        value: dockerHubSecret.secretName
                    },
                }
            },
        });
        repository.grantPullPush(this.project)
    }
}