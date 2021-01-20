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
const dataMocks = require('@adobe/generator-aio-console/test/data-mocks')

jest.mock('@adobe/generator-aio-console/lib/console-cli.js')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli.js')
const mockConsoleCLIInstance = {
  getEnabledServicesForOrg: jest.fn(),
  promptForRemoveServiceSubscriptions: jest.fn(),
  subscribeToServices: jest.fn(),
  getServicePropertiesFromWorkspace: jest.fn(),
  confirmNewServiceSubscriptions: jest.fn()
}
LibConsoleCLI.init.mockResolvedValue(mockConsoleCLIInstance)
/** @private */
function resetMockConsoleCLI () {
  Object.keys(mockConsoleCLIInstance).forEach(
    k => mockConsoleCLIInstance[k].mockReset()
  )
  LibConsoleCLI.init.mockClear()
}

/** @private */
function setDefaultMockConsoleCLI () {
  mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(dataMocks.enabledServices)
  mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(dataMocks.serviceProperties.slice(1))
  mockConsoleCLIInstance.subscribeToServices.mockResolvedValue(dataMocks.subscribeServicesResponse)
  mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(dataMocks.serviceProperties)
  // mock add service confirmation to true by default to avoid infinite loops
  mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(true)
}

// mock config
const config = require('@adobe/aio-lib-core-config')
jest.mock('@adobe/aio-lib-core-config')
const mockConfigProject = {
  id: '1234567890123456789',
  name: 'testp',
  title: 'a test project',
  org: {
    id: '45678',
    name: 'Adobe IO DEV',
    ims_org_id: '6578A55456E84E247F000101@AdobeOrg',
    details: {
      services: []
    }
  },
  workspace: {
    id: '0123456789012345678',
    name: 'testw',
    title: 'a test workspace',
    action_url: 'https://45678-testp-testw.adobeioruntime.net',
    app_url: 'https://45678-testp-testw.adobeio-static.net',
    details: {
      credentials: [
        {
          id: '111111',
          name: 'aio-2234567892098573738',
          integration_type: 'service'
        }
      ],
      services: [
        {
          code: 'FirstSDK',
          name: 'First SDK'
        }
      ]
    }
  }
}

// mock login - mocks underlying methods behind getCliInfo
const mockAccessToken = 'some-access-token'
const mockGetCli = jest.fn(() => {})
const mockSetCli = jest.fn()
jest.mock('@adobe/aio-lib-ims', () => {
  return {
    context: {
      getCli: () => mockGetCli(),
      setCli: () => mockSetCli()
    },
    getToken: () => mockAccessToken
  }
})

const TheCommand = require('../../../../src/commands/app/delete/service')
const BaseCommand = require('../../../../src/BaseCommand')

beforeEach(() => {
  resetMockConsoleCLI()
  setDefaultMockConsoleCLI()

  config.get.mockReset()
  config.set.mockReset()
  config.get.mockReturnValue(mockConfigProject)
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
    expect(TheCommand.aliases).toEqual(['app:add:services'])
  })
})

describe('Run', () => {
  test('config is missing', async () => {
    config.get.mockReturnValue(undefined)
    await expect(TheCommand.run([])).rejects.toThrow('Incomplete .aio configuration')
  })

  test('selects')
})
