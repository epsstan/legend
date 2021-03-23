package org.demo.snowflakeintegration.app;

import io.dropwizard.Configuration;

public class AppConfiguration extends Configuration
{
    private String account;
    private String warehouse;
    private String database;
    private String schema;
    private String username;
    private String encryptedKeyFile;

    public String getAccount()
    {
        return account;
    }

    public void setAccount(String account)
    {
        this.account = account;
    }

    public String getWarehouse()
    {
        return warehouse;
    }

    public void setWarehouse(String warehouse)
    {
        this.warehouse = warehouse;
    }

    public String getDatabase()
    {
        return database;
    }

    public void setDatabase(String database)
    {
        this.database = database;
    }

    public String getSchema()
    {
        return schema;
    }

    public void setSchema(String schema)
    {
        this.schema = schema;
    }

    public String getUsername()
    {
        return username;
    }

    public void setUsername(String username)
    {
        this.username = username;
    }

    public String getEncryptedKeyFile()
    {
        return encryptedKeyFile;
    }

    public void setEncryptedKeyFile(String encryptedKeyFile)
    {
        this.encryptedKeyFile = encryptedKeyFile;
    }
}
