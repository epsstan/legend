#!/bin/bash

GITLAB_OAUTH_CLIENT_ID=$1
GITLAB_OAUTH_SECRET=$2

if [ -z $GITLAB_OAUTH_CLIENT_ID ]
then
	echo "GITLAB_OAUTH_CLIENT_ID not specified"
	exit 1
fi

if [ -z $GITLAB_OAUTH_SECRET ]
then
	echo "GITLAB_OAUTH_SECRET not specified"
	exit 1
fi

pwd=`readlink -f $(dirname $0)`
generator_config=$pwd/env.sh 

templates=$pwd/templates

. $generator_config

engine_config=$WORK_DIR/generated-engine-config
sdlc_config=$WORK_DIR/generated-sdlc-config
studio_config=$WORK_DIR/generated-studio-config
ingress_config=$WORK_DIR/generated-ingress-config

echo "Generating configs to $WORK_DIR"

find_replace()
{
	local dir=$1
	for f in `find $dir -type f`
        do
		sed -i 's/__MONGO_HOST_PORT__/'$MONGO_HOST_PORT'/g' $f
		sed -i 's/__MONGO_USER__/'$MONGO_USER'/g' $f
		sed -i 's/__MONGO_PASSWORD__/'$MONGO_PASSWORD'/g' $f
		sed -i 's/__HOST_PUBLIC_IP__/'$HOST_PUBLIC_IP'/g' $f
                sed -i 's/__GITLAB_OAUTH_CLIENT_ID__'/$GITLAB_OAUTH_CLIENT_ID'/g' $f
		sed -i 's/__GITLAB_OAUTH_SECRET__'/$GITLAB_OAUTH_SECRET'/g' $f
		sed -i 's~__GITLAB_PUBLIC_URL__'~$GITLAB_PUBLIC_URL'~g' $f
		sed -i 's/__GITLAB_HOST__'/$GITLAB_HOST'/g' $f
		sed -i 's/__GITLAB_PORT__'/$GITLAB_PORT'/g' $f
		sed -i 's~__LEGEND_SDLC_VERSION__'~$LEGEND_SDLC_VERSION'~g' $f
		sed -i 's/__LEGEND_SDLC_PORT__'/$LEGEND_SDLC_PORT'/g' $f
		sed -i 's/__LEGEND_SDLC_ADMIN_PORT__'/$LEGEND_SDLC_ADMIN_PORT'/g' $f
		sed -i 's~__LEGEND_SDLC_URL__'~$LEGEND_SDLC_URL'~g' $f
		sed -i 's~__LEGEND_ENGINE_VERSION__'~$LEGEND_ENGINE_VERSION'~g' $f
		sed -i 's/__LEGEND_ENGINE_PORT__'/$LEGEND_ENGINE_PORT'/g' $f
		sed -i 's~__LEGEND_ENGINE_URL__'~$LEGEND_ENGINE_URL'~g' $f
		sed -i 's~__LEGEND_STUDIO_VERSION__'~$LEGEND_STUDIO_VERSION'~g' $f
		sed -i 's/__LEGEND_STUDIO_PORT__'/$LEGEND_STUDIO_PORT'/g' $f
		sed -i 's~__LEGEND_STUDIO_URL__'~$LEGEND_STUDIO_URL'~g' $f
		sed -i 's~__TLS_SECRET_NAME__'~$TLS_SECRET_NAME'~g' $f
		sed -i 's~__DNS_NAME__'~$DNS_NAME'~g' $f
        done
}

generate_engine_config()
{
	rm -rf $engine_config
	cp -r $templates/engine $engine_config
	find_replace $engine_config
}

generate_sdlc_config()
{
	rm -rf $sdlc_config
	cp -r $templates/sdlc $sdlc_config
	find_replace $sdlc_config
}

generate_studio_config()
{
	rm -rf $studio_config
	cp -r $templates/studio $studio_config
	find_replace $studio_config
}

generate_ingress_controller()
{
	rm -rf $ingress_config
	cp -r $pwd/ingress-controller $ingress_config
	find_replace $ingress_config
}

generate_engine_config
generate_sdlc_config
generate_studio_config
generate_ingress_controller
