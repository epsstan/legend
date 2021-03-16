#!/bin/bash

pwd=`readlink -f $(dirname $0)`

set -a
. $pwd/env.sh

CERT_DIR=$WORK_DIR
KEY_FILE=/etc/gitlab/ssl/$HOST_DNS_NAME".key"
CERT_FILE=/etc/gitlab/ssl/$HOST_DNS_NAME".crt"

GITLAB_DATA_DIR=$CONTAINER_WORK_DIR/gitlab
mkdir -p $GITLAB_DATA_DIR

cp -r $CERT_DIR/ssl $GITLAB_DATA_DIR

clean_temp()
{
	rm -rf $WORK_DIR
}

gen()
{
	gen_secrets
	gen_config
}

gen_secrets()
{
	$pwd/gen-cert.sh
	# generate random strings. remove slash
	openssl rand -base64 8 | sed 's:/::g' > $WORK_DIR/mongo.pwd
	openssl rand -base64 8 | sed 's:/::g' > $WORK_DIR/gitlab.pwd
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

up()
{
	docker-compose up
}

down()
{
	docker-compose down
}

ps()
{
	docker-compose ps
}

$*


