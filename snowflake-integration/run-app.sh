
docker container prune -f
docker run --name app \
	--env LEGEND_RO_PK_PASSPHRASE=__FIXME__ \
	-p 9090:9090 \
	-v /Users/megamdev/github_ws/legend/snowflake-integration/src/main/resources:/config \
	-v /Users/megamdev/github_ws/legend/snowflake:/keys \
	snowflakeapp:latest
