package org.demo.snowflakeintegration.db;

import org.demo.snowflakeintegration.db.PrivateKeyProvider;
import org.junit.Ignore;
import org.junit.Test;

import java.security.PrivateKey;

@Ignore
public class TestPrivateKeyProvider
{
    @Test
    public void testGetUnencryptedPrivateKey() throws Exception
    {
        String privateKeyFile = "__FIXME__/legend_ro_2.rsa_key.p8";
        PrivateKey privateKey = PrivateKeyProvider.getUnencryptedPrivateKey(privateKeyFile);
        System.out.println(privateKey);
    }

    @Test
    public void testGetEncryptedPrivateKey() throws Exception
    {
        String privateKeyFile = "__FIXME__/legendro3.rsa_key.p8";
        String privateKeyPassPhrase = "__FIXME__";
        PrivateKey privateKey = PrivateKeyProvider.getEncryptedPrivateKey(privateKeyFile, privateKeyPassPhrase);
        System.out.println(privateKey);
    }
}
