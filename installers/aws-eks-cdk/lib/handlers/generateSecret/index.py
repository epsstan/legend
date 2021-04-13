import logging as log
import cfnresponse
import boto3
import hashlib
import uuid

log.getLogger().setLevel(log.INFO)
secretsmanager = boto3.client('secretsmanager')

def main(event, context):

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.info('Input event: %s', event)

    secretsmanager.put_secret_value(
      SecretId=event['ResourceProperties']['Secret'],
      SecretString=uuid.uuid4().hex,
    )

    attributes = {}

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)