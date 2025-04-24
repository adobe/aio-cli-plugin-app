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
  AB_APP_ASSETS_DEPLOYED: 'ab_app_assets_deployed',
  AB_APP_ASSETS_UNDEPLOYED: 'ab_app_assets_undeployed'
}

const AUDIT_SERVICE_ENDPOINTS = {
  stage: 'https://adp-auditlog-service-stage.adobeioruntime.net/api/v1/web/audit-log-api/event-post',
  prod: 'https://adp-auditlog-service-prod.adobeioruntime.net/api/v1/web/audit-log-api/event-post'
}

/**
 * @typedef {object} AuditLogParams
 * @property {string} accessToken - valid access token
 * @property {object} cliCommandFlags - cli flags
 * @property {object} project - project details
 * @property {Array} [opItems] - list of deployed files (only for assets deployment)
 * @property {string} [env='prod'] - valid env stage|prod
 */

/**
 * @typedef {object} PublishAuditLogParams
 * @property {string} accessToken - valid access token
 * @property {object} logEvent - logEvent details
 * @property {string} [env='prod'] - valid env stage|prod
 */

/**
 * Publish audit log events to audit service
 *
 * @param {PublishAuditLogParams} params Parameters object
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 */
async function publishAuditLogs ({ accessToken, logEvent, env = 'prod' }) {
  const url = AUDIT_SERVICE_ENDPOINTS[env] ?? AUDIT_SERVICE_ENDPOINTS.prod
  const payload = {
    event: logEvent
  }
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  }
  const response = await fetch(url, options)
  if (response.status !== 200) {
    const err = await response.text()
    throw new Error(`Failed to send audit log - ${response.status} ${err}`)
  }
}

/**
 * Send audit log event for app deployment
 *
 * @param {AuditLogParams} params Parameters object
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 */
async function sendAppDeployAuditLog ({ accessToken, cliCommandFlags, project, env }) {
  const logEvent = getAuditLogEvent(cliCommandFlags, project, OPERATIONS.AB_APP_DEPLOY)
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Send audit log event for app undeployment
 *
 * @param {AuditLogParams} params Parameters object
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 */
async function sendAppUndeployAuditLog ({ accessToken, cliCommandFlags, project, env }) {
  const logEvent = getAuditLogEvent(cliCommandFlags, project, OPERATIONS.AB_APP_UNDEPLOY)
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Send audit log event for app assets deployment
 *
 * @param {AuditLogParams} params Parameters object
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 */
async function sendAppAssetsDeployedAuditLog ({ accessToken, cliCommandFlags, project, opItems, env }) {
  const logEvent = getAuditLogEvent(cliCommandFlags, project, OPERATIONS.AB_APP_ASSETS_DEPLOYED)
  logEvent.data.opItems = opItems
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Send audit log event for app assets undeployment
 *
 * @param {AuditLogParams} params Parameters object
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 */
async function sendAppAssetsUndeployedAuditLog ({ accessToken, cliCommandFlags, project, env }) {
  const logEvent = getAuditLogEvent(cliCommandFlags, project, OPERATIONS.AB_APP_ASSETS_UNDEPLOYED)
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Creates an audit log event object
 *
 * @param {object} cliCommandFlags cli flags
 * @param {object} project details
 * @param {string} operation one of: ab_app_deploy, ab_app_undeploy, ab_app_assets_deployed, ab_app_assets_undeployed
 * @returns {object} logEvent object containing audit log details
 * @throws {Error} if project, project.org, or project.workspace is missing, or if operation is invalid
 */
function getAuditLogEvent (cliCommandFlags, project, operation) {
  if (!project) {
    throw new Error('Project is required')
  }
  if (!project.org) {
    throw new Error('Project org is required')
  }
  if (!project.workspace) {
    throw new Error('Project workspace is required')
  }

  const workspaceName = project.workspace.name

  let logStrMsg
  switch (operation) {
    case OPERATIONS.AB_APP_DEPLOY:
      logStrMsg = `Starting deployment for the App Builder application in workspace ${workspaceName}`
      break
    case OPERATIONS.AB_APP_UNDEPLOY:
      logStrMsg = `Starting undeployment for the App Builder application in workspace ${workspaceName}`
      break
    case OPERATIONS.AB_APP_ASSETS_UNDEPLOYED:
      logStrMsg = `All static assets for the App Builder application in workspace: ${workspaceName} were successfully undeployed from the CDN`
      break
    case OPERATIONS.AB_APP_ASSETS_DEPLOYED:
      logStrMsg = `All static assets for the App Builder application in workspace: ${workspaceName} were successfully deployed to the CDN.\n Files deployed - `
      break
    default:
      throw new Error(`Invalid operation: ${operation}`)
  }

  const orgId = project.org.id
  const projectId = project.id
  const workspaceId = project.workspace.id

  const logEvent = {
    orgId,
    projectId,
    workspaceId,
    workspaceName,
    operation,
    timestamp: new Date().valueOf(),
    data: {
      cliCommandFlags,
      opDetailsStr: logStrMsg
    }
  }
  return logEvent
}

module.exports = {
  OPERATIONS,
  AUDIT_SERVICE_ENDPOINTS,
  getAuditLogEvent,
  sendAppDeployAuditLog,
  sendAppUndeployAuditLog,
  sendAppAssetsDeployedAuditLog,
  sendAppAssetsUndeployedAuditLog
}
