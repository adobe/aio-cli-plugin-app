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
  getWorkspaces: jest.fn(),
  promptForSelectWorkspace: jest.fn(),
  getEnabledServicesForOrg: jest.fn(),
  promptForServiceSubscriptionsOperation: jest.fn(),
  subscribeToServices: jest.fn(),
  getServicePropertiesFromWorkspace: jest.fn(),
  confirmNewServiceSubscriptions: jest.fn(),
  promptForSelectServiceProperties: jest.fn()
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
  mockConsoleCLIInstance.promptForSelectWorkspace.mockResolvedValue(consoleDataMocks.workspace)
  mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(consoleDataMocks.workspaces)
  mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(consoleDataMocks.enabledServices)
  mockConsoleCLIInstance.promptForSelectServiceProperties.mockResolvedValue(consoleDataMocks.serviceProperties)
  mockConsoleCLIInstance.subscribeToServices.mockResolvedValue(consoleDataMocks.subscribeServicesResponse)
  mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(consoleDataMocks.serviceProperties)
  mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('nop')
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

// mock data dir
const savedDataDir = process.env.XDG_DATA_HOME
process.env.XDG_DATA_HOME = 'data-dir'
const path = require('path')
const certDir = path.join('data-dir', '@adobe', 'aio-cli-plugin-app', 'entp-int-certs')

const logSpy = jest.spyOn(console, 'error')

const TheCommand = require('../../../../src/commands/app/add/service')
const BaseCommand = require('../../../../src/BaseCommand')

beforeEach(() => {
  resetMockConsoleCLI()
  setDefaultMockConsoleCLI()

  config.get.mockReset()
  config.set.mockReset()
  setDefaultMockConfig()

  logSpy.mockClear()
})
afterAll(() => {
  process.env.XDG_DATA_HOME = savedDataDir
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

  test('escape', async () => {
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('nop')
    await expect(TheCommand.run([])).resolves.toBe(null)
  })

  test('try to select but all services from org are already attached', async () => {
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('select')
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue([
      { name: 'first', code: 'firstcode' },
      { name: 'second', code: 'secondcode' }
    ])
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue([
      { name: 'first', sdkCode: 'firstcode' },
      { name: 'second', sdkCode: 'secondcode' }
    ])

    await expect(TheCommand.run([])).rejects.toThrow('All supported Services in the Organization have already been added')
  })

  test('select new services', async () => {
    const currentServiceProps = consoleDataMocks.serviceProperties.slice(1)
    const additionalServiceProps = [consoleDataMocks.serviceProperties[0]]
    const enabledServices = consoleDataMocks.enabledServices
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('select')
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(enabledServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(currentServiceProps)
    // mock selection
    mockConsoleCLIInstance.promptForSelectServiceProperties.mockResolvedValue(additionalServiceProps)
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      certDir,
      consoleDataMocks.serviceProperties
    )
    expect(mockConsoleCLIInstance.promptForSelectServiceProperties).toHaveBeenCalledWith(
      mockWorkspace.name,
      expect.not.arrayContaining(currentServiceProps.map(s => ({ name: s.name, value: s })))
    )
  })

  test('clone services from another workspace', async () => {
    const currentServiceProps = consoleDataMocks.serviceProperties.slice(2)
    const otherServiceProps = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    const enabledServices = consoleDataMocks.enabledServices
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('clone')
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(enabledServices)
    // first time retrieve from current wkspce
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServiceProps)
    // second call is to retrieve src wkspce services
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(otherServiceProps)
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      certDir,
      otherServiceProps
    )
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(
      `Service subscriptions in Workspace '${mockWorkspace.name}' will be overwritten.`
    ))
  })

  test('clone services from another workspace into a workspace with no services', async () => {
    const currentServiceProps = []
    const otherServiceProps = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    const enabledServices = consoleDataMocks.enabledServices
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('clone')
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(enabledServices)
    // first time retrieve from current wkspce
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServiceProps)
    // second call is to retrieve src wkspce services
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(otherServiceProps)
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      certDir,
      otherServiceProps
    )
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining(
      `Service subscriptions in Workspace '${mockWorkspace.name}' will be overwritten.`
    ))
  })

  test('clone services from another workspace into Production Workspace', async () => {
    const currentServiceProps = consoleDataMocks.serviceProperties.slice(2)
    const otherServiceProps = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    const enabledServices = consoleDataMocks.enabledServices
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('clone')
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(enabledServices)
    // first time retrieve from current wkspce
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServiceProps)
    // second call is to retrieve src wkspce services
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(otherServiceProps)
    mockConfigProject.workspace.name = 'Production'
    mockWorkspace.name = 'Production'
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      mockOrgId,
      mockProject,
      mockWorkspace,
      certDir,
      otherServiceProps
    )
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(
      `⚠ Warning: you are authorizing to overwrite Services in your *Production* Workspace in Project '${mockProject.name}'.`
    ))
  })

  test('does not confirm addition of services', async () => {
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(false)
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('select')
    await expect(TheCommand.run([])).resolves.toEqual(null)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('updates config, nop', async () => {
    const fakeServiceProps = [
      { name: 'first', sdkCode: 'firsts', code: 'no such field', a: 'hello', type: 'no such field' },
      { name: 'sec', sdkCode: 'secs', code: 'no such field', b: 'hello', type: 'no such field' }
    ]
    const fakeOrgServices = [
      { name: 'first', code: 'firsts', sdkCode: 'no such field', type: 'a' },
      { name: 'sec', code: 'secs', sdkCode: 'no such field', type: 'b' },
      { name: 'third', code: 'thirds', sdkCode: 'no such field', type: 'a' }
    ]
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('nop')
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
  test('updates config, with selection and update', async () => {
    const fakeServiceProps = [
      { name: 'first', sdkCode: 'firsts', code: 'no such field', a: 'hello', type: 'no such field' },
      { name: 'sec', sdkCode: 'secs', code: 'no such field', b: 'hello', type: 'no such field' }
    ]
    const fakeOrgServices = [
      { name: 'first', code: 'firsts', sdkCode: 'no such field', type: 'entp' },
      { name: 'sec', code: 'secs', sdkCode: 'no such field', type: 'entp' },
      { name: 'third', code: 'thirds', sdkCode: 'no such field', type: 'entp' }
    ]
    mockConsoleCLIInstance.confirmNewServiceSubscriptions.mockResolvedValue(true)
    mockConsoleCLIInstance.promptForServiceSubscriptionsOperation.mockResolvedValue('select')
    mockConsoleCLIInstance.promptForSelectServiceProperties.mockResolvedValue([fakeServiceProps[1]])
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeOrgServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue([fakeServiceProps[0]])
    await TheCommand.run([])
    // updates before and after adding services
    expect(config.set).toHaveBeenCalledTimes(3)
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'first', code: 'firsts' }
      ],
      true
    )
    expect(config.set).toHaveBeenCalledWith(
      'project.org.details.services', [
        { name: 'first', code: 'firsts', type: 'entp' },
        { name: 'sec', code: 'secs', type: 'entp' },
        { name: 'third', code: 'thirds', type: 'entp' }
      ],
      true
    )
    // after addition
    expect(config.set).toHaveBeenCalledWith(
      'project.workspace.details.services', [
        { name: 'sec', code: 'secs' },
        { name: 'first', code: 'firsts' }
      ],
      true
    )
  })
})
