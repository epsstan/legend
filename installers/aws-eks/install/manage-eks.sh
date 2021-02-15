#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/manage.sh

create_cluster()
{
	echo eksctl create cluster \
		--name $EKS_CLUSTER \
		--region $EKS_REGION \
		--with-oidc \
		--managed
		#--ssh-access \
		#--ssh-public-key keypair \
}

configure_kubectl()
{
	echo aws eks --region $EKS_REGION update-kubeconfig --name $EKS_CLUSTER
}

install()
{
	create_cluster
	configure_kubectl
	kubectl create namespace $EKS_LEGEND_NAMESPACE
}

get_ingress_ctrl()
{
        kubectl get all -n ingress-nginx
}

deploy_ingress_ctrl()
{
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/aws/deploy.yaml

        kubectl apply -f $pwd/ingress-controller
}

delete_ingress_ctrl()
{
	kubectl delete -f $pwd/ingress-controller
	kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/aws/deploy.yaml
}


$*
