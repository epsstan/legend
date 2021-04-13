# WARNING: These steps have not been hardened for security.

## Getting Started

1. **Create AWS account if one is not yet available**
    - Refer to: https://portal.aws.amazon.com/billing/signup
1. **Create IAM user**
    - Navigate to: https://console.aws.amazon.com/iam/home?region=us-east-1#/users
    - Add user and enable `Programatic Access`
    - On the next page attach an existing policy of `AdministratorAccess`
    - Create the user and make note of the `access key id` and `secret access key`
1. **Install and configure AWS CLI**
    - Reference: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
    - From the terminal run `aws configure`
        - Set the `access key` and `secret access key` from the IAM user setup.  
        - Set the region, e.g.: `us-east-1`
    - Verify by running `aws sts get-caller-identity`.  It should return the ARN of the configured user
1. **Install NPM**
    - Refer to: https://nodejs.org/en/download/package-manager/
1. **Install CDK and CDK8S**
    - Execute `npm install cdk cdk8s -g`
1. **Create github secret**
    - The github token allows the pipeline to trigger on new commits.
    - The required permission is `Repo`.  
    - Refer to: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
    - Store the access token in secrets manager (replace values): 
    
    `aws secretsmanager create-secret --name github-access-token --secret-string <<access-token>>`

1. **Create dockerhub secret** (Remove once gitlab build removed)
    - The addresses used by CodeBuild are recycled, as such the anonymous access limits for dockerhub are often encountered during builds.
    - Create an access token, refer to: https://docs.docker.com/docker-hub/access-tokens/
    - Store the access token in secrets manager (replace values):

    `aws secretsmanager create-secret --name dockerhub-credentials --secret-string '{  "Username": "<<username>>", "Password": "<<access-token>>" }'`

1. **Create Route53 hosted zone for existing / new domain**
    - A domain name may either be registered via Route53, or an existing domains nameservers can be pointed to a new HostedZone.
        - To register through Route53, refer to: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html
        - Otherwise, create a hosted zone in Route53 and delegate the NS records appropriately.
    - Store the zone name (e.g. foobar.com) and zone id from the route53 console in parameter store:
    
    `aws ssm put-parameter --type String --name legend-zone-name --value <<zone-name>>`
    
    `aws ssm put-parameter --type String --name legend-hosted-zone-id --value <<zone-id>>`

1. **Set master role that will be used for viewing cluster details in the AWS console**

    `aws ssm put-parameter --type String --name master-role-access --value skylab-hagere`

1. **Create CDK Bootstrap Environment:**

    - Execute `cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`

1. **Synthesize and Deploy Legend Pipeline:** 

    - Execute: `cdk synth && cdk deploy`

1. **Monitor Deployment**
    - Navigate to: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/Legend/view?region=us-east-1
    - Setup will take approximately 60 minutes

## Debug Utilities:

- Setup kubectl for EKS: `aws eks update-kubeconfig --name [cluster_name]`

- https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Legend;expand=true;autoRefresh=60

- `kubectl exec --stdin --tty [pod_name] -- /bin/bash`

- `kubectl describe configmaps [config_map_name]`

- `kubectl rollout restart deployment [deployment_name]`

- `kubectl replace -f [pod_name]`

- `kubectl apply -f configmap.yaml && kubectl rollout restart deployment`

## TODOs:

Override for codepipeline cdk module, pending the ability to set stack overrides:
https://github.com/aws/aws-cdk/issues/9560

Make Mongo durable, or just use dynamo...

Health checks? Scaling, etc...

Dashboards! (Woot)
