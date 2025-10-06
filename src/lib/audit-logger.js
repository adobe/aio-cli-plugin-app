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

const OPERATIONS = {
  AB_APP_DEPLOY: 'ab_app_deploy',
  AB_APP_UNDEPLOY: 'ab_app_undeploy',
  AB_APP_ASSETS_DEPLOYED: 'ab_app_assets_deployed',
  AB_APP_ASSETS_UNDEPLOYED: 'ab_app_assets_undeployed'
}

const AUDIT_SERVICE_ENDPOINT_ROUTE = '/audit-log-api/event-post'
const AUDIT_SERVICE_ENDPOINTS = {
  stage: 'https://deploy-service.stg.app-builder.adp.adobe.io',
  prod: 'https://deploy-service.app-builder.adp.adobe.io'
}

/**
 * @typedef {object} AppInfo
 * @property {string} name - Application name
 * @property {string} version - Application version
 * @property {object} project - Project details containing org and workspace information
 * @property {object} namespace - the runtime namespace
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
  let url = AUDIT_SERVICE_ENDPOINTS[env] ?? AUDIT_SERVICE_ENDPOINTS.prod
  if (process.env.AIO_DEPLOY_SERVICE_URL) {
    url = process.env.AIO_DEPLOY_SERVICE_URL
  }

  // add the route to the endpoint
  url += AUDIT_SERVICE_ENDPOINT_ROUTE

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
 * Creates an audit log event object
 *
 * @param {GetAuditLogEventParams} params - Parameters object containing CLI flags, operation type, and app info
 * @returns {object} Log event object containing audit log details
 * @throws {Error} If project is missing, or if operation is invalid
 */
function getAuditLogEvent ({ cliCommandFlags, operation, appInfo }) {
  const { project, runtimeNamespace } = appInfo

  if (!project) {
    throw new Error('Project is required')
  }

  if (!project.org) {
    throw new Error('Project org is required')
  }
  if (!project.workspace) {
    throw new Error('Project workspace is required')
  }

  if (!runtimeNamespace) {
    throw new Error('Runtime namespace is required')
  }

  if (!Object.values(OPERATIONS).find((op) => op === operation)) {
    throw new Error(`Invalid operation: ${operation}`)
  }
  const orgId = project.org.id

  const logEvent = {
    orgId,
    operation,
    objectRef: appInfo.name,
    objectRev: appInfo.version,
    objectName: appInfo.name,
    timestamp: new Date().valueOf(),
    runtimeNamespace,
    data: {
      cliCommandFlags
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
  AUDIT_SERVICE_ENDPOINT_ROUTE,
  AUDIT_SERVICE_ENDPOINTS,
  publishAuditLogs,
  getAuditLogEvent,
  sendAppDeployAuditLog,
  sendAppUndeployAuditLog,
  sendAppAssetsDeployedAuditLog,
  sendAppAssetsUndeployedAuditLog
}
