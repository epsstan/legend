package org.demo.snowflakeintegration.app;

import io.dropwizard.Application;
import io.dropwizard.configuration.ResourceConfigurationSourceProvider;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;

import java.util.Arrays;

public class SnowflakeIntegrationApp extends Application<AppConfiguration>
{
    @Override
    public void run(AppConfiguration appConfiguration, Environment environment) throws Exception
    {
        environment.jersey().register(new SnowflakeResource(appConfiguration));
    }

    @Override
    public void initialize(Bootstrap<AppConfiguration> bootstrap)
    {
        //bootstrap.setConfigurationSourceProvider(new ResourceConfigurationSourceProvider());
        super.initialize(bootstrap);
    }

    public static void main(String[] args) throws Exception
    {
        System.out.println(Arrays.toString(args));
        new SnowflakeIntegrationApp().run(args);
    }
}
