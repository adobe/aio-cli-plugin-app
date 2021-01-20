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

const mockWorkspace = { name: mockConfigProject.workspace.name, id: mockConfigProject.workspace.id }
const mockProject = { name: mockConfigProject.name, id: mockConfigProject.id }
const mockOrgId = mockConfigProject.org.id

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

  test('no services are attached', async () => {
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockReturnValue([])
    await expect(TheCommand.run([])).rejects.toThrow('No Services are attached')
  })

  test('no services are selected for deletion', async () => {
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockReturnValue(null)
    await expect(TheCommand.run([])).resolves.toEqual(null)
  })

  test('does not confirm deletion', async () => {
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockReturnValue(false)
    await expect(TheCommand.run([])).resolves.toEqual(null)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('selects some services for deletion and confirm', async () => {
    const newServiceProperties = dataMocks.serviceProperties.slice(1)
    // returns current service - selected for deletion
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockReturnValue(newServiceProperties)
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      null,
      newServiceProperties
    )
  })

  test('updates config, no confirmation', async () => {
    const fakeServiceProps = [
      { name: 'first', sdkCode: 'firsts', code: 'no such field', a: 'hello', type: 'no such field' },
      { name: 'sec', sdkCode: 'secs', code: 'no such field', b: 'hello', type: 'no such field' }
    ]
    const fakeOrgServices = [
      { name: 'first', code: 'firsts', sdkCode: 'no such field', type: 'a' },
      { name: 'sec', code: 'secs', sdkCode: 'no such field', type: 'b' },
      { name: 'third', code: 'thirds', sdkCode: 'no such field', type: 'a' }
    ]
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockReturnValue(false)
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockReturnValue(fakeServiceProps.slice(1))
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockReturnValue(fakeOrgServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServiceProps)
    await TheCommand.run([])
    // before adding services updates config even if no confirmation
    expect(config.set).toHaveBeenCalledTimes(2)
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'first', code: 'firsts' },
        { name: 'sec', code: 'secs' }
      ]
    )
    expect(config.set).toHaveBeenCalledWith(
      'project.org.details.services', [
        { name: 'first', code: 'firsts', type: 'a' },
        { name: 'sec', code: 'secs', type: 'b' },
        { name: 'third', code: 'thirds', type: 'a' }
      ]
    )
  })
  test('updates config, with confirmation', async () => {
    const fakeServiceProps = [
      { name: 'first', sdkCode: 'firsts', code: 'no such field', a: 'hello', type: 'no such field' },
      { name: 'sec', sdkCode: 'secs', code: 'no such field', b: 'hello', type: 'no such field' }
    ]
    const fakeOrgServices = [
      { name: 'first', code: 'firsts', sdkCode: 'no such field', type: 'a' },
      { name: 'sec', code: 'secs', sdkCode: 'no such field', type: 'b' },
      { name: 'third', code: 'thirds', sdkCode: 'no such field', type: 'a' }
    ]
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockReturnValue(true)
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockReturnValue(fakeServiceProps.slice(1))
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockReturnValue(fakeOrgServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServiceProps)
    await TheCommand.run([])
    // updates before and after deletion
    expect(config.set).toHaveBeenCalledTimes(3)
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'first', code: 'firsts' },
        { name: 'sec', code: 'secs' }
      ]
    )
    expect(config.set).toHaveBeenCalledWith(
      'project.org.details.services', [
        { name: 'first', code: 'firsts', type: 'a' },
        { name: 'sec', code: 'secs', type: 'b' },
        { name: 'third', code: 'thirds', type: 'a' }
      ]
    )
    // after deletion
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'sec', code: 'secs' }
      ]
    )
  })
})
