/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const inquirer = require('inquirer')
const fs = require('fs-extra')

// mock prompt before import
const mockPrompt = jest.fn()
inquirer.createPromptModule.mockReturnValue(mockPrompt)

const { importConsoleConfig, downloadConsoleConfigToBuffer } = require('../../../src/lib/import')
const { SERVICE_API_KEY_ENV, IMS_OAUTH_S2S_ENV } = require('../../../src/lib/defaults')

jest.mock('fs-extra')

beforeEach(() => {
  jest.clearAllMocks()
})

test('exports', () => {
  expect(importConsoleConfig).toBeDefined()
  expect(importConsoleConfig).toBeInstanceOf(Function)

  expect(downloadConsoleConfigToBuffer).toBeDefined()
  expect(downloadConsoleConfigToBuffer).toBeInstanceOf(Function)
})

describe('importConsoleConfig', () => {
  test('with oauth_server_to_server credentials, unpacks IMS_OAUTH_S2S_* env vars', async () => {
    const configContent = fixtureFile('oauths2s/valid.config.json')
    // The file is read twice: once by importConsoleConfig (loadFunc) and once by importConfigJson
    fs.readFileSync.mockReturnValue(configContent)

    const config = await importConsoleConfig('/some/config/path', { overwrite: true })

    expect(config).toBeDefined()
    expect(config.project.name).toEqual('TestProject123')

    const envWriteCall = fs.writeFile.mock.calls.find(call => call[0].endsWith('.env'))
    expect(envWriteCall).toBeDefined()
    const envContent = envWriteCall[1]
    expect(envContent).toContain(SERVICE_API_KEY_ENV)
    expect(envContent).toContain(IMS_OAUTH_S2S_ENV)

    // Credential is unpacked into IMS_OAUTH_S2S_* vars
    expect(envContent).toContain('IMS_OAUTH_S2S_CLIENT_ID=CXCXCXCXCXCXCXCXC')
    expect(envContent).toContain('IMS_OAUTH_S2S_CLIENT_SECRET=SFSFSFSFSFSFSFSFSFSFSFSFSFS')
    expect(envContent).toContain('IMS_OAUTH_S2S_ORG_ID=XOXOXOXOXOXOX@AdobeOrg')
    expect(envContent).toContain('IMS_OAUTH_S2S_SCOPES=["openid","AdobeID"]') // stringified array
  })

  test('with jwt credentials only, does not add IMS_OAUTH_S2S to env vars', async () => {
    const configContent = fixtureFile('valid.config.json')
    // The file is read twice: once by importConsoleConfig (loadFunc) and once by importConfigJson
    fs.readFileSync.mockReturnValue(configContent)

    const config = await importConsoleConfig('/some/config/path', { overwrite: true })

    expect(config).toBeDefined()
    expect(config.project.name).toEqual('TestProject123')

    // Check that writeFile was called without the IMS_OAUTH_S2S_ENV variable
    const envWriteCall = fs.writeFile.mock.calls.find(call => call[0].endsWith('.env'))
    expect(envWriteCall).toBeDefined()
    expect(envWriteCall[1]).toContain(SERVICE_API_KEY_ENV)
    expect(envWriteCall[1]).not.toContain(IMS_OAUTH_S2S_ENV)
  })
})

// The functions in this module are largely tested by use.test.js
