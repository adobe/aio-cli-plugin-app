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
  AB_APP_DEPLOY: 'ab_app_deploy',
  AB_APP_UNDEPLOY: 'ab_app_undeploy',
  AB_APP_TEST: 'ab_app_test', // todo : remove after testing
  AB_APP_ASSETS_DEPLOYED: 'ab_app_assets_deployed',
  AB_APP_ASSETS_UNDEPLOYED: 'ab_app_assets_undeployed'
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
  if (response.status !== 200) {
    const err = await response.text()
    throw new Error('Failed to send audit log - ' + response.status + ' ' + err)
  }
}

const _getDeployLogMessage = (workspaceName) => `Starting deployment for the App Builder application in workspace ${workspaceName}`;
const _getUndeployLogMessage = (workspaceName) => `Starting undeployment for the App Builder application in workspace ${workspaceName}`;

function getAuditLogEvent(flags, project, event) {
  let logEvent, logStrMsg;
  if (project && project.org && project.workspace) {

    if (event === 'AB_APP_DEPLOY') {
      logStrMsg = _getDeployLogMessage(project.workspace.name);
    } else if (event === 'AB_APP_UNDEPLOY') {
      logStrMsg = _getUndeployLogMessage(project.workspace.name);
    } else if (event === 'AB_APP_ASSETS_UNDEPLOYED') {
      logStrMsg = `All static assets for the App Builder application in workspace: ${project.workspace.name} were successfully undeployed from the CDN`;
    } else if (event === 'AB_APP_ASSETS_DEPLOYED') {
      logStrMsg = `All static assets for the App Builder application in workspace: ${project.workspace.name} were successfully deployed to the CDN.\n Files deployed - `;
    }

    logEvent = {
      orgId: project.org.id,
      projectId: project.id,
      workspaceId: project.workspace.id,
      workspaceName: project.workspace.name,
      operation: event in OPERATIONS ? OPERATIONS[event] : OPERATIONS.APP_TEST,
      timestamp: new Date().valueOf(),
      data: {
        cliCommandFlags: flags,
        opDetailsStr: logStrMsg,
      }
    }
  }
  return logEvent
}

module.exports = {
  sendAuditLogs,
  getAuditLogEvent,
  AUDIT_SERVICE_ENPOINTS
}
