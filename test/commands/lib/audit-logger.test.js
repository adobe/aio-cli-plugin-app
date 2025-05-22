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

const {
  OPERATIONS,
  AUDIT_SERVICE_ENDPOINT_ROUTE,
  AUDIT_SERVICE_ENDPOINTS,
  getAuditLogEvent,
  sendAppDeployAuditLog,
  sendAppUndeployAuditLog,
  sendAppAssetsDeployedAuditLog,
  sendAppAssetsUndeployedAuditLog,
  publishAuditLogs
} = require('../../../src/lib/audit-logger')

beforeEach(() => {
  setFetchMock(true, 200, {})
})

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
  const mockAppInfo = {
    name: 'test-app',
    version: '1.0.0',
    project: mockProject,
    runtimeNamespace: 'fake-namespace'
  }
  const mockCliFlags = { flag1: 'value1' }

  describe('getAuditLogEvent', () => {
    it('should create a valid audit log event for app deploy', () => {
      const event = getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: OPERATIONS.AB_APP_DEPLOY,
        appInfo: mockAppInfo
      })

      expect(event).toEqual({
        orgId: 'fake-org-id',
        projectId: 'fake-project-id',
        workspaceId: 'fake-workspace-id',
        workspaceName: 'fake-workspace',
        operation: OPERATIONS.AB_APP_DEPLOY,
        objectRef: 'test-app',
        objectRev: '1.0.0',
        objectName: 'test-app',
        timestamp: expect.any(Number),
        runtimeNamespace: 'fake-namespace',
        data: {
          cliCommandFlags: mockCliFlags
        }
      })
    })

    it('should create a valid audit log event for app undeploy', () => {
      const event = getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: OPERATIONS.AB_APP_UNDEPLOY,
        appInfo: mockAppInfo
      })

      expect(event).toEqual({
        orgId: 'fake-org-id',
        projectId: 'fake-project-id',
        workspaceId: 'fake-workspace-id',
        workspaceName: 'fake-workspace',
        operation: OPERATIONS.AB_APP_UNDEPLOY,
        objectRef: 'test-app',
        objectRev: '1.0.0',
        objectName: 'test-app',
        timestamp: expect.any(Number),
        runtimeNamespace: 'fake-namespace',
        data: {
          cliCommandFlags: mockCliFlags
        }
      })
    })

    it('should throw error if project is not provided', () => {
      const invalidAppInfo = {
        name: 'test-app',
        version: '1.0.0'
      }
      expect(() => getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: OPERATIONS.AB_APP_DEPLOY,
        appInfo: invalidAppInfo
      })).toThrow('Project is required')
    })

    it('should throw error if project org is missing', () => {
      const invalidAppInfo = {
        ...mockAppInfo,
        project: { ...mockProject, org: null }
      }
      expect(() => getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: OPERATIONS.AB_APP_DEPLOY,
        appInfo: invalidAppInfo
      })).toThrow('Project org is required')
    })

    it('should throw error if project workspace is missing', () => {
      const invalidAppInfo = {
        ...mockAppInfo,
        project: { ...mockProject, workspace: null }
      }
      expect(() => getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: OPERATIONS.AB_APP_DEPLOY,
        appInfo: invalidAppInfo
      })).toThrow('Project workspace is required')
    })

    it('should throw error if runtime namespace is missing', () => {
      const invalidAppInfo = {
        ...mockAppInfo,
        runtimeNamespace: null,
        project: { ...mockProject }
      }
      expect(() => getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: OPERATIONS.AB_APP_DEPLOY,
        appInfo: invalidAppInfo
      })).toThrow('Runtime namespace is required')
    })

    it('should throw error for invalid operation', () => {
      expect(() => getAuditLogEvent({
        cliCommandFlags: mockCliFlags,
        operation: 'invalid_operation',
        appInfo: mockAppInfo
      })).toThrow('Invalid operation: invalid_operation')
    })
  })

  describe('sendAppDeployAuditLog', () => {
    it('should send app deploy audit log successfully', async () => {
      setFetchMock(true, 200, {})

      await sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        appInfo: mockAppInfo
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod + AUDIT_SERVICE_ENDPOINT_ROUTE,
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
      setFetchMock(true, 200, {})

      await sendAppUndeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        appInfo: mockAppInfo
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod + AUDIT_SERVICE_ENDPOINT_ROUTE,
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
      setFetchMock(true, 200, {})

      const mockOpItems = ['file1.js', 'file2.css']

      await sendAppAssetsDeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        appInfo: mockAppInfo,
        opItems: mockOpItems
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod + AUDIT_SERVICE_ENDPOINT_ROUTE,
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
      setFetchMock(true, 200, {})

      await sendAppAssetsUndeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        appInfo: mockAppInfo
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod + AUDIT_SERVICE_ENDPOINT_ROUTE,
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
      setFetchMock(true, 500, 'Internal Server Error')

      await expect(sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        appInfo: mockAppInfo
      })).rejects.toThrow('Failed to send audit log - 500 Internal Server Error')
    })

    it('should use prod endpoint when invalid environment is provided', async () => {
      fetch.mockResolvedValueOnce({ status: 200 })

      await sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliFlags,
        appInfo: mockAppInfo,
        env: 'invalid-env'
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod + AUDIT_SERVICE_ENDPOINT_ROUTE,
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

  describe('publishAuditLogs', () => {
    const mockLogEvent = {
      orgId: 'fake-org-id',
      projectId: 'fake-project-id',
      operation: 'test-operation'
    }

    it('should publish audit logs successfully to prod environment', async () => {
      setFetchMock(true, 200, {})

      await publishAuditLogs({
        accessToken: mockAccessToken,
        logEvent: mockLogEvent,
        env: 'prod'
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.prod + AUDIT_SERVICE_ENDPOINT_ROUTE,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: JSON.stringify({ event: mockLogEvent })
        })
      )
    })

    it('should publish audit logs successfully to stage environment', async () => {
      setFetchMock(true, 200, {})

      await publishAuditLogs({
        accessToken: mockAccessToken,
        logEvent: mockLogEvent,
        env: 'stage'
      })

      expect(fetch).toHaveBeenCalledWith(
        AUDIT_SERVICE_ENDPOINTS.stage + AUDIT_SERVICE_ENDPOINT_ROUTE,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: JSON.stringify({ event: mockLogEvent })
        })
      )
    })

    it('should use custom URL when AIO_DEPLOY_SERVICE_URL is set', async () => {
      const customUrl = 'https://custom-service.example.com'
      process.env.AIO_DEPLOY_SERVICE_URL = customUrl
      setFetchMock(true, 200, {})

      await publishAuditLogs({
        accessToken: mockAccessToken,
        logEvent: mockLogEvent
      })

      expect(fetch).toHaveBeenCalledWith(
        customUrl + AUDIT_SERVICE_ENDPOINT_ROUTE,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: JSON.stringify({ event: mockLogEvent })
        })
      )

      delete process.env.AIO_DEPLOY_SERVICE_URL
    })

    it('should throw error when audit service returns non-200 status', async () => {
      setFetchMock(true, 500, 'Internal Server Error')

      await expect(publishAuditLogs({
        accessToken: mockAccessToken,
        logEvent: mockLogEvent
      })).rejects.toThrow('Failed to send audit log - 500 Internal Server Error')
    })
  })
})
