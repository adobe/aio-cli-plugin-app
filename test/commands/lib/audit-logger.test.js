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

const fs = require('node:fs')
const path = require('node:path')
const chalk = require('chalk')
const fetch = require('node-fetch')
jest.mock('node-fetch', () => jest.fn())
const auditLogger = require('../../../src/lib/audit-logger')
const { getCliEnv } = require('@adobe/aio-lib-env')

jest.mock('fs')
jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  bold: jest.fn((text) => text)
}))

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

beforeEach(() => {
  fetch.mockReset()
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
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENDPOINTS[mockEnv], options)
})

// NOTE: this test is blocked until the audit service is available in prod
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
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENDPOINTS.prod, options)
})

test('should take prod endpoint if calling sendAuditLogs with non-exisiting env', async () => {
  fetch.mockReturnValue(mockResponse)
  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + mockToken,
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ event: mockLogEvent })
  }
  await auditLogger.sendAuditLogs(mockToken, mockLogEvent, 'dev')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENDPOINTS.prod, options)
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
  expect(fetch).toHaveBeenCalledWith(auditLogger.AUDIT_SERVICE_ENDPOINTS[mockEnv], options)
})

describe('getAuditLogEvent', () => {
  const cliCommandFlags = { flag1: 'value1' }
  const project = {
    org: { id: 'org123' },
    id: 'proj456',
    workspace: { id: 'ws789', name: 'testWorkspace' }
  }

  const mockDeployMessage = 'Starting deployment for the App Builder application in workspace testWorkspace'
  const mockUndeployMessage = 'Starting undeployment for the App Builder application in workspace testWorkspace'

  test('should return correct log event for AB_APP_DEPLOY event', () => {
    const result = auditLogger.getAuditLogEvent(cliCommandFlags, project, auditLogger.OPERATIONS.AB_APP_DEPLOY)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: auditLogger.OPERATIONS.AB_APP_DEPLOY,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags,
        opDetailsStr: mockDeployMessage
      }
    })
  })

  test('should return correct log event for AB_APP_UNDEPLOY event', () => {
    const result = auditLogger.getAuditLogEvent(cliCommandFlags, project, auditLogger.OPERATIONS.AB_APP_UNDEPLOY)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: auditLogger.OPERATIONS.AB_APP_UNDEPLOY,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags,
        opDetailsStr: mockUndeployMessage
      }
    })
  })

  test('should return correct log event for AB_APP_ASSETS_UNDEPLOYED event', () => {
    const result = auditLogger.getAuditLogEvent(cliCommandFlags, project, auditLogger.OPERATIONS.AB_APP_ASSETS_UNDEPLOYED)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: auditLogger.OPERATIONS.AB_APP_ASSETS_UNDEPLOYED,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags,
        opDetailsStr: 'All static assets for the App Builder application in workspace: testWorkspace were successfully undeployed from the CDN'
      }
    })
  })

  test('should return correct log event for AB_APP_ASSETS_DEPLOYED event', () => {
    const result = auditLogger.getAuditLogEvent(cliCommandFlags, project, auditLogger.OPERATIONS.AB_APP_ASSETS_DEPLOYED)

    expect(result).toEqual({
      orgId: 'org123',
      projectId: 'proj456',
      workspaceId: 'ws789',
      workspaceName: 'testWorkspace',
      operation: auditLogger.OPERATIONS.AB_APP_ASSETS_DEPLOYED,
      timestamp: expect.any(Number),
      data: {
        cliCommandFlags,
        opDetailsStr: 'All static assets for the App Builder application in workspace: testWorkspace were successfully deployed to the CDN.\n Files deployed - '
      }
    })
  })

  test('should throw error if project is missing', () => {
    expect(() => auditLogger.getAuditLogEvent(cliCommandFlags, null, auditLogger.OPERATIONS.AB_APP_DEPLOY)).toThrow('Project is required')
  })

  test('should throw error if project org is missing', () => {
    expect(() => auditLogger.getAuditLogEvent(cliCommandFlags, {}, auditLogger.OPERATIONS.AB_APP_DEPLOY)).toThrow('Project org is required')
  })

  test('should throw error if project workspace is missing', () => {
    expect(() => auditLogger.getAuditLogEvent(cliCommandFlags, { org: { id: 'org123' } }, auditLogger.OPERATIONS.AB_APP_DEPLOY)).toThrow('Project workspace is required')
  })

  test('should throw error if event is not found in OPERATIONS', () => {
    expect(() => auditLogger.getAuditLogEvent(cliCommandFlags, project, 'UNKNOWN_OPERATION')).toThrow('Invalid operation: UNKNOWN_OPERATION')
  })
})
