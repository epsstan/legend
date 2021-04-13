# Overview 

This is a guide to install a minimal Legend stack on AWS EKS.


# Installation 

## EKS 

### 1/ Install EKS Cluster

The ```install-eks.sh``` script assumes the machine from where you are running the script has been configured with various dependencies. See [setup-aws](./setup-aws) for details.

```
$ cd install 

$ ./install-eks.sh install

```

### 2/ Deploy Nginx Ingress Controller 

```
$ ./deploy.sh deploy_ingress_controller

$ ./deploy.sh get_nginx

```

## Legend 

## Hello World 

This is simple Hello World app used for a sanity check of the EKS cluster.

```
$ ./deploy.sh deploy_hello_world

$ ./deploy.sh get_hello_world

$ ./deploy.sh test_hello_world
```

__TODO : Unhealthy ELB TGS__

```
Figure out why one of the TGs is unhealthy 

$ ./deploy.sh get_elb
ELB = arn:aws:elasticloadbalancing:us-east-1:974843070112:loadbalancer/net/a30b2dbadeda44dc3b26978c14998aa9/269ffe65790be5b6
Target Group arn:aws:elasticloadbalancing:us-east-1:974843070112:targetgroup/k8s-ingressn-ingressn-3e74ee7184/5a7fa8dc4187b344
{
  "State": "healthy"
}
{
  "State": "unhealthy",
  "Reason": "Target.FailedHealthChecks",
  "Description": "Health checks failed"
}
Target Group arn:aws:elasticloadbalancing:us-east-1:974843070112:targetgroup/k8s-ingressn-ingressn-d553d6d9a6/4918e3876b6d235e
{
  "State": "healthy"
}
{
  "State": "unhealthy",
  "Reason": "Target.FailedHealthChecks",
  "Description": "Health checks failed"
}

```

# References 

* AWS EKS Guide https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
* EKS Nginx Ingress Controller https://aws.amazon.com/blogs/opensource/network-load-balancer-nginx-ingress-controller-eks/ 
* K8s Docs https://kubernetes.io/docs/concepts/ 

