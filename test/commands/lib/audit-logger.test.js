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
const {
  OPERATIONS,
  AUDIT_SERVICE_ENDPOINTS,
  getAuditLogEvent,
  sendAppDeployAuditLog,
  sendAppUndeployAuditLog,
  sendAppAssetsDeployedAuditLog,
  sendAppAssetsUndeployedAuditLog
} = require('../../../src/lib/audit-logger')

jest.mock('node-fetch')

describe('audit-logger', () => {
  const mockAccessToken = 'fake-token'
  const mockProject = {
    org: { id: 'fake-org-id' },
    id: 'fake-project-id',
    workspace: {
      id: 'fake-workspace-id',
      name: 'fake-workspace'
    }
  }
  const mockCliFlags = { flag1: 'value1' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAuditLogEvent', () => {
    it('should create a valid audit log event for app deploy', () => {
      const event = getAuditLogEvent(mockCliFlags, mockProject, OPERATIONS.AB_APP_DEPLOY)

      expect(event).toEqual({
        orgId: 'fake-org-id',
        projectId: 'fake-project-id',
        workspaceId: 'fake-workspace-id',
        workspaceName: 'fake-workspace',
        operation: OPERATIONS.AB_APP_DEPLOY,
        timestamp: expect.any(Number),
        data: {
          cliCommandFlags: mockCliFlags,
          opDetailsStr: expect.stringContaining('Starting deployment for the App Builder application')
        }
      })
    })

    it('should create a valid audit log event for app undeploy', () => {
      const event = getAuditLogEvent(mockCliFlags, mockProject, OPERATIONS.AB_APP_UNDEPLOY)

      expect(event).toEqual({
        orgId: 'fake-org-id',
        projectId: 'fake-project-id',
        workspaceId: 'fake-workspace-id',
        workspaceName: 'fake-workspace',
        operation: OPERATIONS.AB_APP_UNDEPLOY,
        timestamp: expect.any(Number),
        data: {
          cliCommandFlags: mockCliFlags,
          opDetailsStr: expect.stringContaining('Starting undeployment for the App Builder application')
        }
      })
    })

    it('should throw error if project is missing', () => {
      expect(() => getAuditLogEvent(mockCliFlags, null, OPERATIONS.AB_APP_DEPLOY))
        .toThrow('Project is required')
    })

    it('should throw error if project org is missing', () => {
      const invalidProject = { ...mockProject, org: null }
      expect(() => getAuditLogEvent(mockCliFlags, invalidProject, OPERATIONS.AB_APP_DEPLOY))
        .toThrow('Project org is required')
    })

    it('should throw error if project workspace is missing', () => {
      const invalidProject = { ...mockProject, workspace: null }
      expect(() => getAuditLogEvent(mockCliFlags, invalidProject, OPERATIONS.AB_APP_DEPLOY))
        .toThrow('Project workspace is required')
    })

    it('should throw error for invalid operation', () => {
      expect(() => getAuditLogEvent(mockCliFlags, mockProject, 'invalid_operation'))
        .toThrow('Invalid operation: invalid_operation')
    })
  })

  describe('sendAppDeployAuditLog', () => {
    it('should send app deploy audit log successfully', async () => {
      fetch.mockResolvedValueOnce({ status: 200 })

      await sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        project: mockProject
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          }
        })
      )
    })
  })

  describe('sendAppUndeployAuditLog', () => {
    it('should send app undeploy audit log successfully', async () => {
      fetch.mockResolvedValueOnce({ status: 200 })

      await sendAppUndeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        project: mockProject
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          }
        })
      )
    })
  })

  describe('sendAppAssetsDeployedAuditLog', () => {
    it('should send app assets deployed audit log successfully', async () => {
      fetch.mockResolvedValueOnce({ status: 200 })
      const mockOpItems = ['file1.js', 'file2.css']

      await sendAppAssetsDeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        project: mockProject,
        opItems: mockOpItems
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: expect.stringContaining(JSON.stringify(mockOpItems))
        })
      )
    })
  })

  describe('sendAppAssetsUndeployedAuditLog', () => {
    it('should send app assets undeployed audit log successfully', async () => {
      fetch.mockResolvedValueOnce({ status: 200 })

      await sendAppAssetsUndeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        project: mockProject
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          }
        })
      )
    })
  })

  describe('error handling', () => {
    it('should throw error when audit service returns non-200 status', async () => {
      fetch.mockResolvedValueOnce({
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      })

      await expect(sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        project: mockProject
      })).rejects.toThrow('Failed to send audit log - 500 Internal Server Error')
    })

    it('should use prod endpoint when invalid environment is provided', async () => {
      fetch.mockResolvedValueOnce({ status: 200 })

      await sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        project: mockProject,
        env: 'invalid-env'
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          }
        })
      )
    })
  })
})
