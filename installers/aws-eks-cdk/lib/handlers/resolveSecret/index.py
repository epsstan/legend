import logging as log
import cfnresponse
import boto3
import hashlib

log.getLogger().setLevel(log.INFO)
secretsmanager = boto3.client('secretsmanager')

def main(event, context):

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.debug('Input event: %s', event)

    response = secretsmanager.get_secret_value(
      SecretId=event['ResourceProperties']['Secret'],
    )

    attributes = {
      'Response': response['SecretString']
    }

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)