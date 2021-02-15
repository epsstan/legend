# Overview 

This is a guide to install a minimal Legend stack on AWS EKS. This consists of :
* An instance of Legend Engine running in AWS EKS
* An instance of Mongo running on AWS EC2 (Not EKS !)

To simplify the install steps, we use the public Gitlab.com. 


# Installation 

## EKS

### 1/ Install EKS Cluster

The ```manage-eks.sh``` script assumes the machine from where you are running the script has been configured with various dependencies. See [setup-aws](./setup-aws) for details.

```
$ cd install 

$ ./manage-eks.sh install

```

### 2/ Deploy Nginx Ingress Controller 

```
$ ./manage-eks.sh deploy_ingress_controller

$ ./manage-eks.sh get_nginx

```

## Legend 

### 1/ Generate secrets

Generate some random secrets for the various components.

```
$ ./deploy.sh gen_secrets
```

### 2/ Install Mongo 

The container is run in the background.

```
$ ./run-mongo.sh restart 
```

### 3/ Configure Gitlab Oauth 

Navigate to Gitlab.com and log into your account.

The OpenID and OAuth configuration requires a Gitlab application to be registered. Navigate to ```User Settings > Applications``` and create an application with the following parameters :
* Name - Legend Demo 
* Redirect URI - Add the following redirect URIs 

```
$ ./deploy.sh print_oauth 
```
* Enable the "Confidential" check box
* Enable these scopes : openid, profile, api 
* Finally, "Save Application"

### 4/ Generate k8s configurations

The k8s configurations for the various Legend components use the Gitlab OAuth application's client id and secret.

Generate k8s configurations using these values.

```
$ ./deploy.sh gen_config <gitlab client id> <gitlab secret>
```

### 5/ Deploy Legend components 

```
$ ./deploy.sh deploy_legend 
```

```
$ ./deploy.sh get_legend 

NAME                             READY   STATUS    RESTARTS   AGE
pod/execution-6b988758b7-ckpzs   1/1     Running   0          40m

NAME                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/execution   ClusterIP   10.100.242.68   <none>        6060/TCP   40m

NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/execution   1/1     1            1           40m

NAME                                   DESIRED   CURRENT   READY   AGE
replicaset.apps/execution-6b988758b7   1         1         1       40m

```

```
$ ./deploy.sh ping_engine
Testing Engine Url http://a30b2dbadeda44dc3b26978c14998aa9-269ffe65790be5b6.elb.us-east-1.amazonaws.com/exec/api/server/v1/info
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   387  100   387    0     0   6046      0 --:--:-- --:--:-- --:--:--  6046
{
  "alloy": {
    "server": {
      "host": "execution-6b988758b7-ckpzs",
      "startTime": "Fri Feb 12 02:52:01 UTC 2021",
      "timeZone": "Etc/UTC"
    },
    "sdlc": {},
    "deployment": {
      "mode": "TEST_IGNORE_FUNCTION_MATCH"
    }
  },
  "zipkin": {
    "url": ""
  },
  "pure": {
    "platform": "1.8.0",
    "model": "unknown"
  }
}
```

# References
* AWS EKS Guide https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
* EKS Nginx Ingress Controller https://aws.amazon.com/blogs/opensource/network-load-balancer-nginx-ingress-controller-eks/
* K8s Docs https://kubernetes.io/docs/concepts/
* K8s Cheatsheet https://kubernetes.io/docs/reference/kubectl/cheatsheet/

```
kubectl -n legend describe ing execution 

 kubectl -n legend logs pod/execution-6b988758b7-fb5hh

 kubectl -n ingress-nginx pod/ingress-nginx-controller-74fd5565fb-cszk8 

 kubectl -n legend attach pod/execution-6b988758b7-ckpzs
```

