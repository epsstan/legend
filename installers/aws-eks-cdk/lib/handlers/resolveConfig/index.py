import logging as log
import cfnresponse
import boto3
import zipfile
import json
import hashlib
import operator
from functools import reduce

def main(event, context):

  log.getLogger().setLevel(log.INFO)

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.info('Input event: %s', event)

    bucket = event['ResourceProperties']['Bucket']
    key = event['ResourceProperties']['ObjectKey']
    element = event['ResourceProperties']['Path']

    # Retrieve artifact image details
    s3 = boto3.client('s3')
    s3.download_file(bucket, key, '/tmp/artifact.zip')
    with zipfile.ZipFile('/tmp/artifact.zip', 'r') as zip_ref:
      zip_ref.extractall('/tmp/artifacts')
    with open('/tmp/artifacts/legend.json') as f:
      data = json.load(f)

    attributes = {
      'Value': reduce(operator.getitem, element.split('.'), data)
    }

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)