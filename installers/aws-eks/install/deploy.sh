#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/env.sh

delete_namespace()
{
	local namespace=$1
	kubectl delete namespace $namespace
}

delete_namespaces()
{
	delete_namespace $EKS_LEGEND_NAMESPACE
	delete_namespace $EKS_NGINX_NAMESPACE
}

get_namespaces()
{
	kubectl get namespaces
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

get_nginx()
{
        kubectl get all -n ingress-nginx
}

deploy_ingress_controller()
{
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/aws/deploy.yaml

	kubectl apply -f $pwd/ingress-controller
}

deploy_hello_world()
{
	kubectl apply -f $pwd/hello-world/
}

get_hello_world()
{
        kubectl get all -n hello-world
}

test_hello_world()
{
        elb_dns_name=`aws elbv2 describe-load-balancers | jq -r .LoadBalancers[0].DNSName`
        local test_url="http://"$elb_dns_name"/foo"
        echo -e "Testing Hello World Url $test_url \n"
        curl $test_url
}

$*
