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
  APP_DEPLOY: 'ab_app_deploy',
  APP_UNDEPLOY: 'ab_app_undeploy',
  APP_TEST: 'ab_app_test', // todo : remove after testing
  APP_ASSETS_DEPLOYED: 'ab_app_assets_deployed',
  APP_ASSETS_UNDEPLOYED: 'ab_app_assets_undeployed'
}

const AUDIT_SERVICE_ENPOINTS = {
  stage: 'https://adp-auditlog-service-stage.adobeioruntime.net/api/v1/web/audit-log-api/event-post',
  prod: 'https://adp-auditlog-service-prod.adobeioruntime.net/api/v1/web/audit-log-api/event-post'
}

/**
 * Send audit log events to audit service
 * @param {string} accessToken valid access token
 * @param {object} logEvent logEvent details
 * @param {string} env valid env stage|prod
 */
async function sendAuditLogs (accessToken, logEvent, env = 'prod') {
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
  if (response.status !== 200) {
    const err = await response.text()
    throw new Error('Failed to send audit log - ' + response.status + ' ' + err)
  }
}

module.exports = {
  sendAuditLogs,
  OPERATIONS,
  AUDIT_SERVICE_ENPOINTS
}
