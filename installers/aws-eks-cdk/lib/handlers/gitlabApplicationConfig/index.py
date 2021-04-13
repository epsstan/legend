import cfnresponse
import json
import subprocess
import logging as log
import hashlib

def main(event, context):

  log.getLogger().setLevel(log.INFO)

  fqn = event['StackId'] + event['LogicalResourceId']
  physical_id = hashlib.md5(fqn.encode('utf-8')).hexdigest()
  log.info(physical_id)

  try:
    log.debug('Input event: %s', event)

    gitlab_host = event['ResourceProperties']['Host']
    gitlab_password = event['ResourceProperties']['Secret']
    redirect_uri = event['ResourceProperties']['RedirectUri'].replace(",", "\r\n")

    application_json = subprocess.check_output(["./curl.sh", gitlab_host, gitlab_password, redirect_uri]).decode("utf-8")
    application = json.loads(application_json)
    application_id = application['application_id']
    secret = application['secret']

    attributes = {
      'applicationId': application_id,
      'secret': secret,
    }

    cfnresponse.send(event, context, cfnresponse.SUCCESS, attributes, physical_id)
  except Exception as e:
    log.exception(e)
    # cfnresponse's error message is always "see CloudWatch"
    cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)