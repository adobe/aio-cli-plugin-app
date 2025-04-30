const fetch = require('node-fetch')
const { sendAppDeployAuditLog, sendAppUndeployAuditLog, sendAppAssetsDeployedAuditLog, sendAppAssetsUndeployedAuditLog } = require('../../src/lib/audit-logger')

jest.mock('node-fetch')

describe('audit-logger', () => {
  const mockAccessToken = 'mock-token'
  const mockEnv = 'stage'
  const mockAppInfo = {
    name: 'test-app',
    version: '1.0.0',
    project: {
      id: 'project-1',
      org: {
        id: 'org-1'
      },
      workspace: {
        id: 'workspace-1',
        name: 'test-workspace'
      }
    }
  }
  const mockCliCommandFlags = {
    actions: true,
    build: true,
    'web-assets': true
  }
  const mockOpItems = [
    '3 Javascript file(s)',
    '2 CSS file(s)',
    '5 image(s)',
    '1 HTML page(s)'
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    fetch.mockResolvedValue({
      status: 200,
      text: () => Promise.resolve('success')
    })
  })

  describe('sendAppDeployAuditLog', () => {
    test('should send deploy audit log successfully', async () => {
      await sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        env: mockEnv
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audit-log-api/event-post'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: expect.stringContaining('ab_app_deploy')
        })
      )
    })

    test('should handle missing access token', async () => {
      await sendAppDeployAuditLog({
        accessToken: null,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        env: mockEnv
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: ''
          })
        })
      )
    })

    test('should throw error on failed request', async () => {
      fetch.mockResolvedValue({
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      })

      await expect(sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        env: mockEnv
      })).rejects.toThrow('Failed to send audit log')
    })
  })

  describe('sendAppUndeployAuditLog', () => {
    test('should send undeploy audit log successfully', async () => {
      await sendAppUndeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        env: mockEnv
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audit-log-api/event-post'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: expect.stringContaining('ab_app_undeploy')
        })
      )
    })
  })

  describe('sendAppAssetsDeployedAuditLog', () => {
    test('should send assets deployed audit log successfully', async () => {
      await sendAppAssetsDeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        opItems: mockOpItems,
        env: mockEnv
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audit-log-api/event-post'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: expect.stringContaining('ab_app_assets_deployed')
        })
      )
    })

    test('should include operation items in the log event', async () => {
      await sendAppAssetsDeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        opItems: mockOpItems,
        env: mockEnv
      })

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body)
      expect(requestBody.event.data.opItems).toEqual(mockOpItems)
    })
  })

  describe('sendAppAssetsUndeployedAuditLog', () => {
    test('should send assets undeployed audit log successfully', async () => {
      await sendAppAssetsUndeployedAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: mockAppInfo,
        env: mockEnv
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audit-log-api/event-post'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-type': 'application/json'
          },
          body: expect.stringContaining('ab_app_assets_undeployed')
        })
      )
    })
  })

  describe('error cases', () => {
    test('should throw error when project and runtimeNamespace are missing', async () => {
      const invalidAppInfo = {
        name: 'test-app',
        version: '1.0.0'
      }

      await expect(sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: invalidAppInfo,
        env: mockEnv
      })).rejects.toThrow('Either project or runtimeNamespace is required')
    })

    test('should throw error when project org is missing', async () => {
      const invalidAppInfo = {
        name: 'test-app',
        version: '1.0.0',
        project: {
          id: 'project-1',
          workspace: {
            id: 'workspace-1',
            name: 'test-workspace'
          }
        }
      }

      await expect(sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: invalidAppInfo,
        env: mockEnv
      })).rejects.toThrow('Project org is required')
    })

    test('should throw error when project workspace is missing', async () => {
      const invalidAppInfo = {
        name: 'test-app',
        version: '1.0.0',
        project: {
          id: 'project-1',
          org: {
            id: 'org-1'
          }
        }
      }

      await expect(sendAppDeployAuditLog({
        accessToken: mockAccessToken,
        cliCommandFlags: mockCliCommandFlags,
        appInfo: invalidAppInfo,
        env: mockEnv
      })).rejects.toThrow('Project workspace is required')
    })
  })
}) 