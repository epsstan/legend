#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/env.sh

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
}

$*
