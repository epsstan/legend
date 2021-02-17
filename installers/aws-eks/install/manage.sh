#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/env.sh

clean_temp()
{
        rm -rf $WORK_DIR
}

get_elb()
{
	local elb_arn=`aws elbv2 describe-load-balancers | jq -r .LoadBalancers[0].LoadBalancerArn`
	echo "ELB = $elb_arn"
	local tg_arns=`aws elbv2 describe-target-groups --load-balancer-arn $elb_arn  | jq -r .TargetGroups[].TargetGroupArn`

	for tg_arn in $tg_arns
	do
		echo "Target Group $tg_arn"
		aws elbv2 describe-target-health --target-group-arn $tg_arn | jq -r .TargetHealthDescriptions[].TargetHealth
	done
}

delete_namespace()
{
        local namespace=$1
        kubectl delete namespace $namespace
}

get_namespaces()
{
        kubectl get namespaces
}

get_nginx()
{
        kubectl get all -n ingress-nginx
}

deploy_ingress_controller()
{
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/aws/deploy.yaml

	# TODO - remove cert manager on cluster deletion
	kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.2.0/cert-manager.yaml

	kubectl apply -f $pwd/ingress-controller
}
