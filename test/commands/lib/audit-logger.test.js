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
