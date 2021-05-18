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
const consoleDataMocks = require('@adobe/generator-aio-console/test/data-mocks')

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
  mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(consoleDataMocks.enabledServices)
  mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(consoleDataMocks.serviceProperties.slice(1))
  mockConsoleCLIInstance.subscribeToServices.mockResolvedValue(consoleDataMocks.subscribeServicesResponse)
  mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(consoleDataMocks.serviceProperties)
  // mock add service confirmation to true by default to avoid infinite loops
  mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(true)
}

// mock config
const config = require('@adobe/aio-lib-core-config')
jest.mock('@adobe/aio-lib-core-config')
let mockConfigProject, mockWorkspace, mockProject, mockOrgId
/** @private */
function setDefaultMockConfig () {
  mockConfigProject = fixtureJson('valid.config.json').project
  mockWorkspace = { name: mockConfigProject.workspace.name, id: mockConfigProject.workspace.id }
  mockProject = { name: mockConfigProject.name, id: mockConfigProject.id }
  mockOrgId = mockConfigProject.org.id
  config.get.mockReturnValue(mockConfigProject)
}

// mock login - mocks underlying methods behind getCliInfo
const mockAccessToken = 'some-access-token'
const mockSetCli = jest.fn()
jest.mock('@adobe/aio-lib-ims', () => {
  return {
    context: {
      setCli: () => mockSetCli()
    },
    getToken: () => mockAccessToken
  }
})
jest.mock('@adobe/aio-lib-env', () => {
  return {
    getCliEnv: () => 'prod'
  }
})

const logSpy = jest.spyOn(console, 'error')

const TheCommand = require('../../../../src/commands/app/delete/service')
const BaseCommand = require('../../../../src/BaseCommand')

beforeEach(() => {
  resetMockConsoleCLI()
  setDefaultMockConsoleCLI()

  config.get.mockReset()
  config.set.mockReset()
  setDefaultMockConfig()

  logSpy.mockClear()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
    expect(TheCommand.aliases).toEqual(['app:delete:services'])
  })
})

describe('Run', () => {
  test('config is missing', async () => {
    config.get.mockReturnValue(undefined)
    await expect(TheCommand.run([])).rejects.toThrow('Incomplete .aio configuration')
  })

  test('no services are attached', async () => {
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue([])
    await expect(TheCommand.run([])).rejects.toThrow('No Services are attached')
  })

  test('no services are selected for deletion', async () => {
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(null)
    await expect(TheCommand.run([])).resolves.toEqual(null)
  })

  test('does not confirm deletion', async () => {
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(false)
    await expect(TheCommand.run([])).resolves.toEqual(null)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('selects some services for deletion and confirm', async () => {
    const newServiceProperties = consoleDataMocks.serviceProperties.slice(1)
    // returns current service - selected for deletion
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(newServiceProperties)
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      null,
      newServiceProperties
    )
  })

  test('selects some services in the Production workspace for deletion and confirm', async () => {
    const newServiceProperties = consoleDataMocks.serviceProperties.slice(1)
    // returns current service - selected for deletion
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(newServiceProperties)
    mockConfigProject.workspace.name = 'Production'
    mockWorkspace.name = 'Production'
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      null,
      newServiceProperties
    )
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('⚠ Warning: you are authorizing to overwrite Services in your *Production* Workspace'))
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
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(false)
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(fakeServiceProps.slice(1))
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeOrgServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServiceProps)
    await TheCommand.run([])
    // before adding services updates config even if no confirmation
    expect(config.set).toHaveBeenCalledTimes(2)
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'first', code: 'firsts' },
        { name: 'sec', code: 'secs' }
      ],
      true
    )
    expect(config.set).toHaveBeenCalledWith(
      'project.org.details.services', [
        { name: 'first', code: 'firsts', type: 'a' },
        { name: 'sec', code: 'secs', type: 'b' },
        { name: 'third', code: 'thirds', type: 'a' }
      ],
      true
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
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(true)
    mockConsoleCLIInstance.promptForRemoveServiceSubscriptions.mockResolvedValue(fakeServiceProps.slice(1))
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeOrgServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServiceProps)
    await TheCommand.run([])
    // updates before and after deletion
    expect(config.set).toHaveBeenCalledTimes(3)
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'first', code: 'firsts' },
        { name: 'sec', code: 'secs' }
      ],
      true
    )
    expect(config.set).toHaveBeenCalledWith(
      'project.org.details.services', [
        { name: 'first', code: 'firsts', type: 'a' },
        { name: 'sec', code: 'secs', type: 'b' },
        { name: 'third', code: 'thirds', type: 'a' }
      ],
      true
    )
    // after deletion
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'sec', code: 'secs' }
      ],
      true
    )
  })
})
