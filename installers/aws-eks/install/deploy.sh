#!/bin/bash
  
pwd=`readlink -f $(dirname $0)`

. $pwd/manage.sh

gen_secrets()
{
        # generate random strings. remove slash
        openssl rand -base64 8 | sed 's:/::g' > $WORK_DIR/mongo.pwd
}

gen_config()
{
	$pwd/gen-config.sh $*
}

print()
{
        (set -o posix; set) | egrep "DNS|PUBLIC_IP|GITLAB|MONGO|ENGINE|SDLC|STUDIO" | sort | nl
}

print_secrets()
{
        echo "MONGO ROOT PWD : `cat $WORK_DIR/mongo.pwd`"
        echo "GITLAB ROOT PWD : `cat  $WORK_DIR/gitlab.pwd`"
}

print_oauth()
{
        echo $LEGEND_ENGINE_URL/callback
        echo $LEGEND_SDLC_URL/api/auth/callback
        echo $LEGEND_SDLC_URL/api/pac4j/login/callback
        echo $LEGEND_STUDIO_URL/log.in/callback
}

recreate_engine_config()
{
	kubectl delete configmap -n $EKS_LEGEND_NAMESPACE execution
	kubectl create configmap -n $EKS_LEGEND_NAMESPACE execution --from-file=$ENGINE_CONFIG/config
}

deploy_engine()
{
	recreate_engine_config
        kubectl -n $EKS_LEGEND_NAMESPACE apply -f $ENGINE_CONFIG/k8s
}

ping_engine()
{
	elb_dns_name=`aws elbv2 describe-load-balancers | jq -r .LoadBalancers[0].DNSName`
	local test_url="http://"$elb_dns_name"/exec/api/server/v1/info"
	echo -e "Testing Engine Url $test_url"
	curl $test_url | jq
}

delete_engine()
{
        kubectl delete -n $EKS_LEGEND_NAMESPACE -f $ENGINE_CONFIG/k8s
}

recreate_sdlc_config()
{
	kubectl delete configmap -n $EKS_LEGEND_NAMESPACE sdlc
	kubectl create configmap -n $EKS_LEGEND_NAMESPACE sdlc --from-file=$SDLC_CONFIG/config
}

delete_sdlc()
{
	kubectl delete -n $EKS_LEGEND_NAMESPACE -f $SDLC_CONFIG/k8s
}

deploy_sdlc()
{
	recreate_sdlc_config
	kubectl -n $EKS_LEGEND_NAMESPACE apply -f $SDLC_CONFIG/k8s
}

ping_sdlc()
{
        elb_dns_name=`aws elbv2 describe-load-balancers | jq -r .LoadBalancers[0].DNSName`
        local test_url="http://"$elb_dns_name"/sdlc/api/info"
        echo -e "Testing Engine Url $test_url"
        curl $test_url | jq
}

delete_legend()
{
	delete_engine
	delete_sdlc
}

deploy_legend()
{
	deploy_engine
	deploy_sdlc
}

get_legend()
{
	kubectl get all -n $EKS_LEGEND_NAMESPACE
}

redeploy_legend()
{
	delete_legend
	for i in `seq 1 10`; do kubectl get all -n $EKS_LEGEND_NAMESPACE ; sleep 1; done
	deploy_legend
}

$*
