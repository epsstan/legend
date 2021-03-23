package org.demo.snowflakeintegration.db;

import org.demo.snowflakeintegration.db.ConnectionFactory;
import org.demo.snowflakeintegration.db.PrivateKeyProvider;
import org.junit.Ignore;
import org.junit.Test;

import java.security.PrivateKey;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Properties;

import static org.junit.Assert.assertTrue;

@Ignore
public class TestConnectionFactory
{
    private static String ACCOUNT_NAME = "__FIXME__";
    private static String SNOWFLAKE_USERPASSWORD_AUTH_USERNAME = "LEGEND_RO_1";
    private static String SNOWFLAKE_USERPASSWORD_AUTH_PASSWORD = "__FIXME__";

    private static String SNOWFLAKE_UNENC_PK_AUTH_USERNAME = "LEGENDRO2";

    private static String SNOWFLAKE_ENC_PK_AUTH_USERNAME = "LEGENDRO3";
    private static String SNOWFLAKE_ENC_PK_PASSPHRASE = "__FIXME__";

    @Test
    public void testUserPasswordConnection() throws Exception
    {
        String url = String.format("jdbc:snowflake://%s.snowflakecomputing.com", ACCOUNT_NAME);
        Connection connection = ConnectionFactory.getConnection(
                SNOWFLAKE_USERPASSWORD_AUTH_USERNAME,
                SNOWFLAKE_USERPASSWORD_AUTH_PASSWORD,
                ACCOUNT_NAME,
                "LEGENDRO_WH",
                "KNOEMA_RENEWABLES_DATA_ATLAS",
                "RENEWABLES",
                url);
        this.testConnection(connection);
    }

    @Test
    public void testUserPasswordConnectionWithUrlParams() throws Exception
    {
        String database = "KNOEMA_RENEWABLES_DATA_ATLAS";
        String schema = "RENEWABLES";
        String warehouse = "LEGENDRO_WH";
        String url = String.format("jdbc:snowflake://%s.snowflakecomputing.com/?warehouse=%s,db=%s,schema=%s",
                ACCOUNT_NAME,
                warehouse,
                database,
                schema);

        Connection connection = ConnectionFactory.getConnection(
                SNOWFLAKE_USERPASSWORD_AUTH_USERNAME,
                SNOWFLAKE_USERPASSWORD_AUTH_PASSWORD,
                url);
        this.testConnection(connection);
    }

    @Test
    public void testUnencryptedKeyPairConnection() throws Exception
    {
        String database = "KNOEMA_RENEWABLES_DATA_ATLAS";
        String schema = "RENEWABLES";
        String warehouse = "LEGENDRO_WH";

        String url = String.format("jdbc:snowflake://%s.snowflakecomputing.com/?warehouse=%s&db=%s&schema=%s",
                ACCOUNT_NAME,
                warehouse,
                database,
                schema);

        String privateKeyFile = "__FIXME__/legend_ro_2.rsa_key.p8";
        PrivateKey privateKey = PrivateKeyProvider.getUnencryptedPrivateKey(privateKeyFile);

        Properties properties = new Properties();
        properties.put("user", SNOWFLAKE_UNENC_PK_AUTH_USERNAME);
        properties.put("privateKey", privateKey);

        Connection connection = ConnectionFactory.getConnection(url, properties);
        this.testConnection(connection);
    }

    @Test
    public void testEncryptedKeyPairConnection() throws Exception
    {
        String database = "KNOEMA_RENEWABLES_DATA_ATLAS";
        String schema = "RENEWABLES";
        String warehouse = "LEGENDRO_WH";

        String url = String.format("jdbc:snowflake://%s.snowflakecomputing.com/?warehouse=%s&db=%s&schema=%s",
                ACCOUNT_NAME,
                warehouse,
                database,
                schema);

        String privateKeyFile = "__FIXME__/legendro3.rsa_key.p8";
        String passphrase = SNOWFLAKE_ENC_PK_PASSPHRASE;
        PrivateKey privateKey = PrivateKeyProvider.getEncryptedPrivateKey(privateKeyFile, passphrase);

        Properties properties = new Properties();
        properties.put("user", SNOWFLAKE_ENC_PK_AUTH_USERNAME);
        properties.put("privateKey", privateKey);

        Connection connection = ConnectionFactory.getConnection(url, properties);
        this.testConnection(connection);
    }

    private void testConnection(Connection connection) throws Exception
    {
        Statement statement = connection.createStatement();
        ResultSet resultSet = statement.executeQuery("select count(1) from KNOEMA_RENEWABLES_DATA_ATLAS.RENEWABLES.BPEO2020");
        resultSet.next();
        int count = resultSet.getInt(1);
        assertTrue(count > 0);
        resultSet.close();
        statement.close();
        connection.close();
    }
}
