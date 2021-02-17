#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/manage.sh

create_cluster()
{
	eksctl create cluster \
		--name $EKS_CLUSTER \
		--region $EKS_REGION \
		--with-oidc \
		--managed
		#--ssh-access \
		#--ssh-public-key keypair \
}

configure_kubectl()
{
	aws eks --region $EKS_REGION update-kubeconfig --name $EKS_CLUSTER
}

install()
{
	create_cluster
	configure_kubectl
	create_namespace
}

create_namespace()
{
	kubectl create namespace $EKS_LEGEND_NAMESPACE
}

get_ingress_ctrl()
{
        kubectl get all -n ingress-nginx
}

deploy_ingress_ctrl()
{
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/aws/deploy.yaml

		kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.2.0/cert-manager.yaml

        kubectl apply -f $WORK_DIR/generated-ingress-config
}

delete_ingress_ctrl()
{
	kubectl delete -f $WORK_DIR/generated-ingress-config
	kubectl delete -f https://github.com/jetstack/cert-manager/releases/download/v1.2.0/cert-manager.yaml
	kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/aws/deploy.yaml
}


$*
