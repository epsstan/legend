#!/bin/bash
gitlab_host="$1"
gitlab_user="root"
gitlab_password="$2"
redirect_uri="$3"

# curl for the login page to get a session cookie and the sources with the auth tokens
body_header=$(curl -s -L -c /tmp/cookies.txt -i "${gitlab_host}/users/sign_in" -s)

# grep the auth token for the user login for
#   not sure whether another token on the page will work, too - there are 3 of them
csrf_token=$(echo $body_header | perl -ne 'print "$1\n" if /new_user.*?authenticity_token"[[:blank:]]value="(.+?)"/' | sed -n 1p)

# send login credentials with curl, using cookies and token from previous request
login=$(curl -s -L -b /tmp/cookies.txt -c /tmp/cookies.txt -i "${gitlab_host}/users/sign_in" \
    --data "user[login]=${gitlab_user}&user[password]=${gitlab_password}" \
    --data-urlencode "authenticity_token=${csrf_token}")

# send curl GET request to personal access token page to get auth token
body_header=$(curl -L -H 'user-agent: curl' -b /tmp/cookies.txt -i "${gitlab_host}/profile/personal_access_tokens" -s)
csrf_token=$(echo $body_header | perl -ne 'print "$1\n" if /authenticity_token"[[:blank:]]value="(.+?)"/' | sed -n 1p)

# curl POST request to send the "generate personal access token form"
# the response will be a redirect, so we have to follow using `-L`
body_header=$(curl -s -L "${gitlab_host}/-/profile/personal_access_tokens" \
  -H "authority: ${gitlab_host}" \
  -H 'pragma: no-cache' \
  -H 'cache-control: no-cache' \
  -H 'upgrade-insecure-requests: 1' \
  -H "origin: ${gitlab_host}" \
  -H 'content-type: application/x-www-form-urlencoded' \
  -H 'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36' \
  -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sec-fetch-mode: navigate' \
  -H 'sec-fetch-user: ?1' \
  -H 'sec-fetch-dest: document' \
  -H "referer: ${gitlab_host}/-/profile/personal_access_tokens" \
  -H 'accept-language: en-US,en;q=0.9,de;q=0.8' \
  -b /tmp/cookies.txt \
  --data-urlencode "authenticity_token=${csrf_token}" \
  --data 'personal_access_token[name]=golab-generated&personal_access_token[expires_at]=&personal_access_token[scopes][]=api')

# Scrape the personal access token from the response HTML
personal_access_token=$(echo $body_header | perl -ne 'print "$1\n" if /created-personal-access-token"[[:blank:]]value="(.+?)"/' | sed -n 1p)

scopes=$'api\nprofile\nopenid'
curl --request POST --header "PRIVATE-TOKEN: ${personal_access_token}" \
  --data "name=Legend&redirect_uri=${redirect_uri}&scopes[]=api&scopes[]=openid&scopes=${scopes}" "${gitlab_host}/api/v4/applications"