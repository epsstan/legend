package org.demo.snowflakeintegration.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

public class ConnectionFactory
{
    static
    {
        try
        {
            Class.forName("com.snowflake.client.jdbc.SnowflakeDriver");
        }
        catch (ClassNotFoundException e)
        {
            throw new RuntimeException(e);
        }
    }

    public static Connection getConnection(String userName, String password,
                                            String account, String warehouse,
                                            String database, String schema,
                                            String url) throws SQLException
    {
        Properties properties = new Properties();
        properties.put("user", userName);
        properties.put("password", password);
        properties.put("account", account);
        properties.put("warehouse", warehouse);
        properties.put("db", database);
        properties.put("schema", schema);
        //properties.put("tracing", "on");
        return DriverManager.getConnection(url, properties);
    }

    public static Connection getConnection(String userName, String password, String url) throws SQLException
    {
        Properties properties = new Properties();
        properties.put("user", userName);
        properties.put("password", password);
        //properties.put("tracing", "on");
        return DriverManager.getConnection(url, properties);
    }

    public static Connection getConnection(String url, Properties properties) throws SQLException
    {
        //properties.put("tracing", "on");
        return DriverManager.getConnection(url, properties);
    }
}
