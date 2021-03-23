# User Setup
* Snowflake users were created through the Snowflake web console and added to various user roles

## Unencrypted Private Key Pair Setup 

```
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out legend_ro_2.rsa_key.p8 -nocrypt

openssl rsa -in  legend_ro_2.rsa_key.p8 -pubout -out legend_ro_2.rsa_key.pub

# In Snowflake web console

use role "ACCOUNTADMIN";
alter user LEGENDRO2 set rsa_public_key='MIIBIjANBgkqh....';
````

## Encrypted Private Key Pair Setup 

```
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out legendro3.rsa_key.p8

openssl rsa -in  legendro3.rsa_key.p8 -pubout -out legendro3.rsa_key.pub

# In Snowflake web console

use role "ACCOUNTADMIN";
alter user LEGENDRO3 set rsa_public_key='MIIBIjANBgkqh....';
````
