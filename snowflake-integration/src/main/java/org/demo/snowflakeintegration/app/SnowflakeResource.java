package org.demo.snowflakeintegration.app;

import org.demo.snowflakeintegration.db.ConnectionFactory;
import org.demo.snowflakeintegration.db.PrivateKeyProvider;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.security.PrivateKey;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

@Path("/api/db")
public class SnowflakeResource
{
    private AppConfiguration appConfiguration;

    public SnowflakeResource(AppConfiguration appConfiguration)
    {
        this.appConfiguration = appConfiguration;
    }

    @GET
    @Path("/test")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> get() throws Exception
    {
        Map<String, Object> result = new HashMap<>();
        try
        {
            Connection connection = this.getConnection();
            Statement statement = connection.createStatement();
            ResultSet resultSet = statement.executeQuery("select count(1) from KNOEMA_RENEWABLES_DATA_ATLAS.RENEWABLES.BPEO2020");
            resultSet.next();
            int count = resultSet.getInt(1);
            resultSet.close();
            statement.close();
            connection.close();
            result.put("count", count);
        }
        catch (Exception e)
        {
            e.printStackTrace();
            result.put("error", e.getMessage());
        }
        return result;
    }

    private Connection getConnection() throws Exception
    {
        String url = String.format("jdbc:snowflake://%s.snowflakecomputing.com/?warehouse=%s,db=%s,schema=%s",
                appConfiguration.getAccount(),
                appConfiguration.getWarehouse(),
                appConfiguration.getDatabase(),
                appConfiguration.getSchema());

        String privateKeyFile = appConfiguration.getEncryptedKeyFile();
        String passphrase = System.getenv("LEGEND_RO_PK_PASSPHRASE");
        PrivateKey privateKey = PrivateKeyProvider.getEncryptedPrivateKey(privateKeyFile, passphrase);

        Properties properties = new Properties();
        properties.put("user", appConfiguration.getUsername());
        properties.put("privateKey", privateKey);

        System.out.println(properties);

        return ConnectionFactory.getConnection(url, properties);
    }
}