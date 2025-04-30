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
const { parseNamespaceString } = require('./app-helper')

const OPERATIONS = {
  AB_APP_DEPLOY: 'ab_app_deploy',
  AB_APP_UNDEPLOY: 'ab_app_undeploy',
  AB_APP_ASSETS_DEPLOYED: 'ab_app_assets_deployed',
  AB_APP_ASSETS_UNDEPLOYED: 'ab_app_assets_undeployed'
}

const AUDIT_SERVICE_ENDPOINTS2 = {
  stage: 'https://adp-auditlog-service-stage.adobeioruntime.net/api/v1/web/audit-log-api/event-post',
  prod: 'https://adp-auditlog-service-prod.adobeioruntime.net/api/v1/web/audit-log-api/event-post'
}

const AUDIT_SERVICE_ENDPOINTS = {
  stage: 'http://127.0.0.1:3000/audit-log-api/event-post',
  prod: 'http://127.0.0.1:3000/audit-log-api/event-post'
}

/**
 * @typedef {object} AppInfo
 * @property {string} name - Application name
 * @property {string} version - Application version
 * @property {object} project - Project details containing org and workspace information
 * @property {string} [runtimeNamespace] - Optional runtime namespace (for non-logged in use case)
 */

/**
 * @typedef {object} AuditLogParams
 * @property {string} accessToken - Valid access token for authentication
 * @property {object} cliCommandFlags - CLI command flags and options
 * @property {AppInfo} appInfo - Application information including project details, name, and version
 * @property {Array} [opItems] - List of deployed files (only for assets deployment)
 * @property {string} [env='prod'] - Environment to use: 'stage' or 'prod'
 */

/**
 * @typedef {object} PublishAuditLogParams
 * @property {string} accessToken - Valid access token for authentication
 * @property {object} logEvent - Audit log event details to be published
 * @property {string} [env='prod'] - Environment to use: 'stage' or 'prod'
 */

/**
 * @typedef {object} GetAuditLogEventParams
 * @property {object} cliCommandFlags - CLI command flags and options
 * @property {AppInfo} appInfo - Application information containing project details, name, version, and optional runtime namespace
 * @property {string} operation - Operation type: 'ab_app_deploy', 'ab_app_undeploy', 'ab_app_assets_deployed', or 'ab_app_assets_undeployed'
 */

/**
 * Publish audit log events to audit service
 *
 * @param {PublishAuditLogParams} params - Parameters object containing access token, log event, and environment
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 * @throws {Error} If the audit log request fails
 */
async function publishAuditLogs ({ accessToken, logEvent, env = 'prod' }) {
  const url = AUDIT_SERVICE_ENDPOINTS[env] ?? AUDIT_SERVICE_ENDPOINTS.prod
  const payload = {
    event: logEvent
  }
  const options = {
    method: 'POST',
    headers: {
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
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
 * Creates an audit log event object
 *
 * @param {GetAuditLogEventParams} params - Parameters object containing CLI flags, operation type, and app info
 * @returns {object} Log event object containing audit log details
 * @throws {Error} If project or runtimeNamespace is missing, or if operation is invalid
 */
function getAuditLogEvent ({ cliCommandFlags, operation, appInfo }) {
  const { project, runtimeNamespace } = appInfo

  if (!project && !runtimeNamespace) {
    throw new Error('Either project or runtimeNamespace is required')
  }

  let orgId, projectId, workspaceId, workspaceName

  if (project) { // logged in use case
    if (!project.org) {
      throw new Error('Project org is required')
    }
    if (!project.workspace) {
      throw new Error('Project workspace is required')
    }
    orgId = project.org.id
    projectId = project.id
    workspaceId = project.workspace.id
    workspaceName = project.workspace.name
  } else { // non-logged in use case
    const parsedNamespace = parseNamespaceString(runtimeNamespace)
    workspaceName = parsedNamespace?.workspace ?? 'Production'
  }

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

  const logEvent = {
    runtimeNamespace,
    orgId,
    projectId,
    workspaceId,
    workspaceName,
    operation,
    appName: appInfo.name,
    appVersion: appInfo.version,
    objectName: appInfo.name,
    timestamp: new Date().valueOf(),
    data: {
      cliCommandFlags,
      opDetailsStr: logStrMsg
    }
  }
  return logEvent
}

/**
 * Send audit log event for app deployment
 *
 * @param {AuditLogParams} params - Parameters object containing access token, CLI flags, app info, and environment
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 * @throws {Error} If the audit log request fails
 */
async function sendAppDeployAuditLog ({ accessToken, cliCommandFlags, appInfo, env }) {
  const logEvent = getAuditLogEvent({ cliCommandFlags, appInfo, operation: OPERATIONS.AB_APP_DEPLOY })
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Send audit log event for app undeployment
 *
 * @param {AuditLogParams} params - Parameters object containing access token, CLI flags, app info, and environment
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 * @throws {Error} If the audit log request fails
 */
async function sendAppUndeployAuditLog ({ accessToken, cliCommandFlags, appInfo, env }) {
  const logEvent = getAuditLogEvent({ cliCommandFlags, appInfo, operation: OPERATIONS.AB_APP_UNDEPLOY })
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Send audit log event for app assets deployment
 *
 * @param {AuditLogParams} params - Parameters object containing access token, CLI flags, app info, operation items, and environment
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 * @throws {Error} If the audit log request fails
 */
async function sendAppAssetsDeployedAuditLog ({ accessToken, cliCommandFlags, appInfo, opItems, env }) {
  const logEvent = getAuditLogEvent({ cliCommandFlags, appInfo, operation: OPERATIONS.AB_APP_ASSETS_DEPLOYED })
  logEvent.data.opItems = opItems
  return publishAuditLogs({ accessToken, logEvent, env })
}

/**
 * Send audit log event for app assets undeployment
 *
 * @param {AuditLogParams} params - Parameters object containing access token, CLI flags, app info, and environment
 * @returns {Promise<void>} Promise that resolves when the audit log is sent successfully
 * @throws {Error} If the audit log request fails
 */
async function sendAppAssetsUndeployedAuditLog ({ accessToken, cliCommandFlags, appInfo, env }) {
  const logEvent = getAuditLogEvent({ cliCommandFlags, appInfo, operation: OPERATIONS.AB_APP_ASSETS_UNDEPLOYED })
  return publishAuditLogs({ accessToken, logEvent, env })
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
