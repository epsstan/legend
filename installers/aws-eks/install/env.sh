#!/bin/bash

pwd=`readlink -f $(dirname $0)`

##########################################
## Fill in these values 
##########################################

LEGEND_ENGINE_VERSION=finos/legend-engine-server:2.14.0
LEGEND_SDLC_VERSION=finos/legend-sdlc-server:0.18.0
LEGEND_STUDIO_VERSION=finos/legend-studio:0.1.1

TLS_SECRET_NAME=legend-finos-tls
DNS_NAME=legend-test.finos.org

##########################################
# The values below are computed/static
##########################################

WORK_DIR=/home/ec2-user/eks-legend-temp
mkdir -p $WORK_DIR

CONTAINER_WORK_DIR=$WORK_DIR/container-data
mkdir -p $CONTAINER_WORK_DIR

ENGINE_CONFIG=$WORK_DIR/generated-engine-config
SDLC_CONFIG=$WORK_DIR/generated-sdlc-config
STUDIO_CONFIG=$WORK_DIR/generated-studio-config

type=ec2
if [ $type == "ec2" ]
then
	HOST_DNS_NAME=`curl -s http://169.254.169.254/latest/meta-data/public-hostname`
	HOST_PUBLIC_IP=`curl -s http://169.254.169.254/latest/meta-data/public-ipv4`
else
	HOST_DNS_NAME=`hostname`
	HOST_PUBLIC_IP=`hostname -i`
fi

# Secrets 
# TODO - re-enable
# MONGO_PASSWORD=""
# if [ -e $WORK_DIR/mongo.pwd ];
# then
# 	MONGO_PASSWORD=`cat $WORK_DIR/mongo.pwd`
# fi

GITLAB_ROOT_PASSWORD=""
if [ -e $WORK_DIR/gitlab.pwd ];
then
	GITLAB_ROOT_PASSWORD=`cat $WORK_DIR/gitlab.pwd`
fi

# EKS
EKS_CLUSTER=legend-integration
EKS_REGION=us-east-2
EKS_LEGEND_NAMESPACE=legend
EKS_NGINX_NAMESPACE=ingress-nginx
ELB_DNS_NAME=`aws --region us-east-2 elbv2 describe-load-balancers 2>/dev/null | jq -r .LoadBalancers[0].DNSName`

# Certs
TRUSTSTORE_PASSWORD=changeit

# Gitlab 
GITLAB_PORT=unused
GITLAB_ROOT_USER=unused
GITLAB_HOST=gitlab.legend.finos.org
GITLAB_PUBLIC_URL=https://$GITLAB_HOST

# Mongo 
MONGO_USER=alloy-deployer
MONGO_PASSWORD=no80QkionRI0xFEP
MONGO_HOST_PORT=alloycluster-rdzv8.mongodb.net

# Engine
LEGEND_ENGINE_PORT=6060
LEGEND_ENGINE_URL=http://$ELB_DNS_NAME/exec

# LEGEND_SDLC
LEGEND_SDLC_PORT=7070
LEGEND_SDLC_ADMIN_PORT=7071
LEGEND_SDLC_URL=http://$ELB_DNS_NAME/sdlc

# Studio
LEGEND_STUDIO_PORT=8080
LEGEND_STUDIO_URL=http://$ELB_DNS_NAME/studio

