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
jest.mock('node-fetch', () => jest.fn())
const auditLogger = require('../../../src/lib/audit-logger')
const OPERATIONS = {
  AB_APP_DEPLOY: 'app_deploy',
  AB_APP_UNDEPLOY: 'app_undeploy',
  AB_APP_ASSETS_UNDEPLOYED: 'assets_undeployed',
  AB_APP_ASSETS_DEPLOYED: 'assets_deployed',
  APP_TEST: 'app_test'
}

const AB_PP_DEPLOY = 'ab_app_deploy'

const mockToken = 'mocktoken'
const mockEnv = 'stage'
const mockLogEvent = {
  projectId: 'mockproject',
  orgId: 'mockorg'
}

const mockResponse = Promise.resolve({
  ok: true,
  status: 200,
  text: () => {
    return {}
  }
})
const mockErrorResponse = Promise.resolve({
  ok: false,
  status: 400,
  text: () => {
    return {}
  }
})

jest.mock('../../../src/lib/audit-logger', () => ({
  _getDeployLogMessage: jest.fn(),
  _getUndeployLogMessage: jest.fn()
}))

beforeEach(() => {
  fetch.mockReset()
})

test('check valid operations', async () => {
  expect(auditLogger.OPERATIONS).toBeDefined()
  expect(auditLogger.OPERATIONS.APP_DEPLOY).toBe(AB_PP_DEPLOY)
})

test('sendAuditLogs with valid params', async () => {
  fetch.mockReturnValue(mockResponse)
  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + mockToken,
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ event: mockLogEvent })
  }
  await auditLogger.sendAuditLogs(mockToken, mockLogEvent, mockEnv)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENPOINTS[mockEnv], options)
})

test('sendAuditLogs with default params', async () => {
  fetch.mockReturnValue(mockResponse)
  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + mockToken,
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ event: mockLogEvent })
  }
  await auditLogger.sendAuditLogs(mockToken, mockLogEvent)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENPOINTS.prod, options)
})

test('sendAuditLogs error response', async () => {
  fetch.mockReturnValue(mockErrorResponse)
  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + mockToken,
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ event: mockLogEvent })
  }
  await expect(auditLogger.sendAuditLogs(mockToken, mockLogEvent, mockEnv)).rejects.toThrow('Failed to send audit log - 400')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENPOINTS[mockEnv], options)
})

describe('getAuditLogEvent', () => {
  const flags = { flag1: 'value1' }
  const project = {
    org: { id: 'org123' },
    id: 'proj456',
    workspace: { id: 'ws789', name: 'testWorkspace' }
  }

  const mockDeployMessage = 'Deployment log message'
  const mockUndeployMessage = 'Undeployment log message'

  beforeEach(() => {
    require('../../../src/lib/audit-logger')._getDeployLogMessage.mockReturnValue(mockDeployMessage)
    require('../../../src/lib/audit-logger')._getUndeployLogMessage.mockReturnValue(mockUndeployMessage)
  })

  test('should return correct log event for AB_APP_DEPLOY event', () => {
    const event = 'AB_APP_DEPLOY'
    const result = auditLogger.getAuditLogEvent(flags, project, event)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: OPERATIONS.AB_APP_DEPLOY,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags: flags,
        opDetailsStr: mockDeployMessage
      }
    })
    expect(require('../../../src/lib/audit-logger')._getDeployLogMessage).toHaveBeenCalledWith('testWorkspace')
  })

  test('should return correct log event for AB_APP_UNDEPLOY event', () => {
    const event = 'AB_APP_UNDEPLOY'
    const result = auditLogger.getAuditLogEvent(flags, project, event)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: OPERATIONS.AB_APP_UNDEPLOY,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags: flags,
        opDetailsStr: mockUndeployMessage
      }
    })
    expect(require('../../../src/lib/audit-logger')._getUndeployLogMessage).toHaveBeenCalledWith('testWorkspace')
  })

  test('should return correct log event for AB_APP_ASSETS_UNDEPLOYED event', () => {
    const event = 'AB_APP_ASSETS_UNDEPLOYED'
    const result = auditLogger.getAuditLogEvent(flags, project, event)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: OPERATIONS.AB_APP_ASSETS_UNDEPLOYED,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags: flags,
        opDetailsStr: 'All static assets for the App Builder application in workspace: testWorkspace were successfully undeployed from the CDN'
      }
    })
  })

  test('should return correct log event for AB_APP_ASSETS_DEPLOYED event', () => {
    const event = 'AB_APP_ASSETS_DEPLOYED'
    const result = auditLogger.getAuditLogEvent(flags, project, event)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: OPERATIONS.AB_APP_ASSETS_DEPLOYED,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags: flags,
        opDetailsStr: 'All static assets for the App Builder application in workspace: testWorkspace were successfully deployed to the CDN.\n Files deployed - '
      }
    })
  })

  test('should return undefined if project or workspace is missing', () => {
    const event = 'AB_APP_DEPLOY'
    const result = auditLogger.getAuditLogEvent(flags, {}, event)

    expect(result).toBeUndefined()
  })

  test('should default operation to APP_TEST if event is not found in OPERATIONS', () => {
    const event = 'UNKNOWN_EVENT'
    const result = auditLogger.getAuditLogEvent(flags, project, event)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: OPERATIONS.APP_TEST,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags: flags,
        opDetailsStr: undefined
      }
    })
  })
})
