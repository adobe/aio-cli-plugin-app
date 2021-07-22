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
const TheCommand = require('../../../src/commands/app/use')
const BaseCommand = require('../../../src/BaseCommand')
const importLib = require('../../../src/lib/import')
const inquirer = require('inquirer')
const { EOL } = require('os')

// mock inquirer
const mockPrompt = jest.fn()
inquirer.createPromptModule.mockReturnValue(mockPrompt)

// mock LibConsoleCLI
const consoleDataMocks = require('@adobe/generator-aio-console/test/data-mocks')
jest.mock('@adobe/generator-aio-console/lib/console-cli.js')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli.js')
const mockConsoleCLIInstance = {
  getWorkspaces: jest.fn(),
  promptForSelectWorkspace: jest.fn(),
  getEnabledServicesForOrg: jest.fn(),
  subscribeToServices: jest.fn(),
  getServicePropertiesFromWorkspace: jest.fn(),
  getWorkspaceConfig: jest.fn()
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
  mockConsoleCLIInstance.subscribeToServices.mockResolvedValue(consoleDataMocks.subscribeServicesResponse)
  mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(consoleDataMocks.serviceProperties)
  mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue({ fake: 'config' })
}

// mock config
jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')
let fakeCurrentConfig = {}
let fakeGlobalConfig = {}
/** @private */
function setConfigMock () {
  mockConfig.get.mockImplementation(k => {
    if (k === 'project') {
      return fakeCurrentConfig
    }
    if (k === 'console') {
      return fakeGlobalConfig
    }
  })
}
// mock login
const mockAccessToken = 'some-access-token'
const mockGetCli = jest.fn()
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

// mock import config
jest.mock('../../../src/lib/import')
/** @private */
function mockConsoleImportConfig ({ name = 'projectname', credentials = null } = {}) {
  const project = {
    name,
    workspace: {
      details: {
        credentials
      }
    }
  }
  importLib.loadAndValidateConfigFile.mockReturnValue({
    values: { project }
  })

  return project
}
/** @private */
function mockInvalidConsoleImportConfig () {
  importLib.loadAndValidateConfigFile.mockImplementation(() => { throw new Error('fake error') })
}

// mock data dir
const savedDataDir = process.env.XDG_DATA_HOME
process.env.XDG_DATA_HOME = 'data-dir'
const path = require('path')
const certDir = path.join('data-dir', '@adobe', 'aio-cli-plugin-app', 'entp-int-certs')

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCli.mockReturnValue({})
  importLib.loadConfigFile.mockReset()
  importLib.validateConfig.mockReset()
  resetMockConsoleCLI()
  setDefaultMockConsoleCLI()

  fakeCurrentConfig = {
    name: 'projectname',
    id: 'projectid',
    org: { name: 'org name', id: 'org-id' },
    workspace: { name: 'workspacename', id: 'workspaceid' }
  }
  fakeGlobalConfig = {
    org: { name: 'org name', id: 'org-id' },
    project: { name: 'projectname2', id: 'projectid2' },
    workspace: { name: 'workspacename2', id: 'workspaceid2' }
  }
  // mock config
  mockConfig.get.mockReset()
  setConfigMock()

  mockPrompt.mockReset()
})
afterAll(() => {
  process.env.XDG_DATA_HOME = savedDataDir
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
  expect(typeof TheCommand.description).toBe('string')
})

test('flags/args', async () => {
  expect(TheCommand.args[0].name).toEqual('config_file_path')
  expect(TheCommand.args[0].required).not.toEqual(true)

  expect(TheCommand.flags.overwrite).toBeDefined()
  expect(TheCommand.flags.overwrite.default).toEqual(false)
  expect(TheCommand.flags.overwrite.exclusive).toEqual(['merge'])

  expect(TheCommand.flags.merge).toBeDefined()
  expect(TheCommand.flags.merge.default).toEqual(false)
  expect(TheCommand.flags.merge.exclusive).toEqual(['overwrite'])

  expect(TheCommand.flags.global).toBeDefined()
  expect(TheCommand.flags.global.char).toEqual('g')
  expect(TheCommand.flags.global.default).toEqual(false)
  expect(TheCommand.flags.global.exclusive).toEqual(['workspace'])

  expect(TheCommand.flags.workspace).toBeDefined()
  expect(TheCommand.flags.workspace.char).toEqual('w')
  expect(TheCommand.flags.workspace.default).toEqual('')
  expect(TheCommand.flags.workspace.exclusive).toEqual(['global'])

  expect(TheCommand.flags['no-service-sync']).toBeDefined()
  expect(TheCommand.flags['no-service-sync'].default).toEqual(false)
  expect(TheCommand.flags['no-service-sync'].exclusive).toEqual(['confirm-service-sync'])

  expect(TheCommand.flags['confirm-service-sync']).toBeDefined()
  expect(TheCommand.flags['confirm-service-sync'].default).toEqual(false)
  expect(TheCommand.flags['confirm-service-sync'].exclusive).toEqual(['no-service-sync'])

  expect(TheCommand.flags['no-input']).toBeDefined()
  expect(TheCommand.flags['no-input'].default).toEqual(false)
})

describe('bad args/flags', () => {
  test('unknown', async () => {
    await expect(TheCommand.run(['.', '--wtf'])).rejects.toThrow(
      'Unexpected argument: --wtf\nSee more help with --help'
    )
  })
  test('arg=console.json --global', async () => {
    await expect(TheCommand.run(['console.json', '--global'])).rejects.toThrow(
      'Flags \'--workspace\' and \'--global\' cannot be used together with arg \'config_file_path\''
    )
  })
  test('arg=console.json --workspace', async () => {
    await expect(TheCommand.run(['console.json', '--workspace', 'wkspce'])).rejects.toThrow(
      'Flags \'--workspace\' and \'--global\' cannot be used together with arg \'config_file_path\''
    )
  })
  test('--no-input', async () => {
    await expect(TheCommand.run(['--no-input'])).rejects.toThrow(
      'Flag \'--no-input\', requires one of: arg \'config_file_path\', flag \'--workspace\' or flag \'--global\''
    )
  })
  // NOTE other combination of flags errors are handled by oclif
})

describe('run with config file arg', () => {
  test('config-file', async () => {
    mockConsoleImportConfig()
    await TheCommand.run(['config-file'])
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      'config-file',
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
  })
  test('config-file --merge', async () => {
    mockConsoleImportConfig()
    await TheCommand.run(['config-file', '--merge'])
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      'config-file',
      process.cwd(),
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: '' }
    )
  })

  test('config-file --overwrite', async () => {
    mockConsoleImportConfig()
    await TheCommand.run(['config-file', '--overwrite'])
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      'config-file',
      process.cwd(),
      { merge: false, overwrite: true, interactive: false },
      { SERVICE_API_KEY: '' }
    )
  })

  test('config-file --no-input', async () => {
    mockConsoleImportConfig()
    await TheCommand.run(['config-file', '--no-input'])
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      'config-file',
      process.cwd(),
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: '' }
    )
  })

  test('config-file --no-input, config has credentials (SERVICE_API_KEY)', async () => {
    mockConsoleImportConfig({
      credentials: [
        { oauth: { client_id: 'hola' } },
        { jwt: { client_id: 'apikey' } }
      ]
    })
    await TheCommand.run(['config-file', '--no-input'])
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      'config-file',
      process.cwd(),
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: 'apikey' }
    )
  })

  test('config-file is invalid', async () => {
    mockInvalidConsoleImportConfig()
    await expect(TheCommand.run(['config-file'])).rejects.toThrow('fake error')
  })
})

describe('run with global configuration', () => {
  test('select prompt global, no flags, crendentials without jwt apikey', async () => {
    mockConsoleImportConfig({
      credentials: [
        { oauth: { client_id: 'hola' } },
        { jwt: { client_id_bad_key: 'apikey' } }
      ]
    })
    mockPrompt.mockReturnValueOnce({ res: 'global' })
    await TheCommand.run([])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
    // services are same in both workspaces in default mock
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('-g, global config === current config', async () => {
    // mock fake global config to have a different org
    fakeGlobalConfig = {
      org: fakeCurrentConfig.org,
      workspace: fakeCurrentConfig.workspace,
      project: { id: fakeCurrentConfig.id, name: fakeCurrentConfig.name }
    }
    setConfigMock()
    await expect(TheCommand.run(['-g']))
      .rejects.toThrow('The selected configuration is the same as the current configuration')
  })

  test('-g --no-input', async () => {
    mockConsoleImportConfig()
    await TheCommand.run(['-g', '--no-input'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: '' }
    )
    // no-input sets no-service-sync
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('-g --no-input --confirm-service-sync, same services', async () => {
    mockConsoleImportConfig()
    await TheCommand.run(['-g', '--no-input', '--confirm-service-sync'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: '' }
    )
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('-g --no-input --confirm-service-sync, services to be synced', async () => {
    mockConsoleImportConfig()
    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['-g', '--no-input', '--confirm-service-sync'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: '' }
    )
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    // sync services from current workspace into globally selected project/workspace
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project,
      fakeGlobalConfig.workspace,
      certDir,
      currentServices
    )
  })

  test('-g, confirm prompt = true, services to be synced', async () => {
    // mock confirmation prompt for sync services to true
    mockPrompt.mockReturnValueOnce({ res: true })
    mockConsoleImportConfig()
    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['-g'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    // sync services from current workspace into globally selected project/workspace
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project,
      fakeGlobalConfig.workspace,
      certDir,
      currentServices
    )
  })

  test('-g, confirm prompt = true, services to be synced, incomplete local config', async () => {
    // mock confirmation prompt for sync services to true
    mockPrompt.mockReturnValueOnce({ res: true })
    mockConsoleImportConfig()
    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    delete fakeCurrentConfig.name // project name
    setConfigMock()
    await TheCommand.run(['-g'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
    // when current config is not complete, we can switch to global config but not sync services
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).not.toHaveBeenCalled()
    // sync services from current workspace into globally selected project/workspace
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalledWith()
  })

  test('-g, confirm prompt = false, services to be synced', async () => {
    // mock confirmation prompt for sync services to false
    mockPrompt.mockReturnValueOnce({ res: false })
    mockConsoleImportConfig()
    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['-g'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    // make sure there are no service sync when confirmation = false
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('-g, confirm prompt = true, services to be synced, but orgs are not the same', async () => {
    // mock fake global config to have a different org
    fakeGlobalConfig.org.id = 'other'
    setConfigMock()

    // mock confirmation prompt for sync services to true
    mockPrompt.mockReturnValueOnce({ res: true })
    mockConsoleImportConfig()
    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['-g'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeGlobalConfig.org.id,
      fakeGlobalConfig.project.id,
      fakeGlobalConfig.workspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
    // service sync is not supported when orgs are not the same
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
    // but we still check service properties to display a warning if some are missing
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
  })

  test('incomplete global config missing org', async () => {
    delete fakeGlobalConfig.org
    setConfigMock()
    await expect(TheCommand.run(['-g'])).rejects.toThrow(
      `Your global Console configuration is incomplete.${EOL}Use the \`aio console\` commands to select your Organization, Project, and Workspace.`
    )
  })
  test('incomplete global config missing project', async () => {
    delete fakeGlobalConfig.project
    setConfigMock()
    await expect(TheCommand.run(['-g'])).rejects.toThrow(
      `Your global Console configuration is incomplete.${EOL}Use the \`aio console\` commands to select your Organization, Project, and Workspace.`
    )
  })
  test('incomplete global config missing workspace', async () => {
    delete fakeGlobalConfig.workspace
    setConfigMock()
    await expect(TheCommand.run(['-g'])).rejects.toThrow(
      `Your global Console configuration is incomplete.${EOL}Use the \`aio console\` commands to select your Organization, Project, and Workspace.`
    )
  })
  test('incomplete global config, missing all', async () => {
    fakeGlobalConfig = null
    setConfigMock()
    await expect(TheCommand.run(['-g'])).rejects.toThrow(
      `Your global Console configuration is incomplete.${EOL}Use the \`aio console\` commands to select your Organization, Project, and Workspace.`
    )
  })
})

describe('switch to a workspace in the same org', () => {
  test('select prompt workspace, no flags', async () => {
    mockConsoleImportConfig()
    // first prompt: choose mode
    mockPrompt.mockReturnValueOnce({ res: 'workspace' })
    // second prompt: choose workspace
    const newWorkspace = { name: 'newworkspace', id: 'newid' }
    mockConsoleCLIInstance.promptForSelectWorkspace.mockReturnValueOnce(newWorkspace)

    await TheCommand.run([])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      fakeCurrentConfig.id,
      newWorkspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )
    // services are same in both workspaces in default mock
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('--workspace existing, prompt confirm sync = true, services are different', async () => {
    mockConsoleImportConfig()
    const newWorkspace = consoleDataMocks.workspaces[1]

    mockPrompt.mockReturnValueOnce({ res: true })

    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['--workspace', newWorkspace.name])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      fakeCurrentConfig.id,
      newWorkspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )

    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      { id: fakeCurrentConfig.id, name: fakeCurrentConfig.name },
      { id: newWorkspace.id, name: newWorkspace.name },
      certDir,
      currentServices
    )
  })

  test('--workspace existing, prompt confirm sync = false, services are different', async () => {
    mockConsoleImportConfig()
    const newWorkspace = consoleDataMocks.workspaces[1]

    mockPrompt.mockReturnValueOnce({ res: false })

    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['--workspace', newWorkspace.name])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      fakeCurrentConfig.id,
      newWorkspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )

    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('--workspace existing, --no-input, services are different', async () => {
    mockConsoleImportConfig()
    const newWorkspace = consoleDataMocks.workspaces[1]

    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[2]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['--workspace', newWorkspace.name, '--no-input'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      fakeCurrentConfig.id,
      newWorkspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      // --no-input sets --merge to true
      { merge: true, overwrite: false, interactive: false },
      { SERVICE_API_KEY: '' }
    )

    // --no-input sets --no-service-sync to true
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
  })

  test('--workspace Production, services are different, confirm sync service', async () => {
    mockConsoleImportConfig()
    mockPrompt.mockReturnValueOnce({ res: true })
    const newWorkspace = consoleDataMocks.workspaces.find(w => w.name === 'Production')
    const logSpy = jest.spyOn(console, 'error')

    const currentServices = [consoleDataMocks.serviceProperties[0], consoleDataMocks.serviceProperties[1]]
    const servicesInTargetWorkspace = [consoleDataMocks.serviceProperties[0]]
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(currentServices)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValueOnce(servicesInTargetWorkspace)

    await TheCommand.run(['--workspace', 'Production'])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      fakeCurrentConfig.id,
      newWorkspace.id,
      consoleDataMocks.enabledServices
    )
    expect(importLib.importConfigJson).toHaveBeenCalledWith(
      expect.any(Buffer),
      process.cwd(),
      // --no-input sets --merge to true
      { merge: false, overwrite: false, interactive: true },
      { SERVICE_API_KEY: '' }
    )

    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(2)
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      fakeCurrentConfig.org.id,
      { id: fakeCurrentConfig.id, name: fakeCurrentConfig.name },
      { id: newWorkspace.id, name: newWorkspace.name },
      certDir,
      currentServices
    )
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`⚠ Warning: you are authorizing to overwrite Services in your *Production* Workspace in Project '${fakeCurrentConfig.name}'`))
  })

  test('--workspace not-existing', async () => {
    mockConsoleImportConfig()
    await expect(TheCommand.run(['--workspace', 'not-existing'])).rejects.toThrow(
      '--workspace=not-existing does not exist in current Project projectname'
    )
  })

  test('--workspace sameascurrent', async () => {
    mockConsoleImportConfig()
    await expect(TheCommand.run(['--workspace', fakeCurrentConfig.workspace.name])).rejects.toThrow(
      '--workspace=workspacename is the same as the currently selected workspace, nothing to be done'
    )
  })

  test('--workspace <no-value>', async () => {
    mockConsoleImportConfig()
    await expect(TheCommand.run(['--workspace'])).rejects.toThrow(
      'Flag --workspace expects a value'
    )
  })
  test('incomplete current config, missing org', async () => {
    delete fakeCurrentConfig.org
    setConfigMock()
    await expect(TheCommand.run(['--workspace', 'some'])).rejects.toThrow(
      `Incomplete .aio configuration. Cannot select a new Workspace in same Project.${EOL}Please import a valid Adobe Developer Console configuration file via \`aio app use <config>.json\``
    )
  })
  test('incomplete current config, missing project', async () => {
    delete fakeCurrentConfig.id
    delete fakeCurrentConfig.name
    setConfigMock()
    await expect(TheCommand.run(['--workspace', 'some'])).rejects.toThrow(
      `Incomplete .aio configuration. Cannot select a new Workspace in same Project.${EOL}Please import a valid Adobe Developer Console configuration file via \`aio app use <config>.json\``
    )
  })
  test('incomplete current config, missing workspace', async () => {
    delete fakeCurrentConfig.workspace
    setConfigMock()
    await expect(TheCommand.run(['--workspace', 'some'])).rejects.toThrow(
      `Incomplete .aio configuration. Cannot select a new Workspace in same Project.${EOL}Please import a valid Adobe Developer Console configuration file via \`aio app use <config>.json\``
    )
  })
  test('incomplete current config, missing all', async () => {
    fakeCurrentConfig = null
    setConfigMock()
    await expect(TheCommand.run(['--workspace', 'some'])).rejects.toThrow(
      `Incomplete .aio configuration. Cannot select a new Workspace in same Project.${EOL}Please import a valid Adobe Developer Console configuration file via \`aio app use <config>.json\``
    )
  })
})
