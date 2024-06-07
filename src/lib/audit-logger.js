/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const fetch = require('node-fetch')

const OPERATIONS = {
  APP_DEPLOY: 'cli_app_deploy1'
}

const AUDIT_SERVICE_ENPOINTS = {
  stage: '',
  prod: ''
}

async function sendAuditLogs(accessToken, logEvent, env = 'prod') {
  const url = AUDIT_SERVICE_ENPOINTS[env]
  const payload = {
    event: logEvent
  }
  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  }
  const response = await fetch(url, options)
  if(response.status !== 200){
    const err = await response.text()
    throw new Error('Failed to send audit log - ' + response.status + ' ' + err)
  }
}

module.exports = {
  sendAuditLogs,
  OPERATIONS
}
