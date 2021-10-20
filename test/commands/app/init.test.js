/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const fs = require('fs-extra')
const path = require('path')
jest.mock('fs-extra')

// mock config load
const mockImport = {
  loadAndValidateConfigFile: jest.fn(),
  importConfigJson: jest.fn()
}
jest.mock('../../../src/lib/import', () => mockImport)

// mock generators
jest.mock('yeoman-environment')
const yeoman = require('yeoman-environment')
const mockGenInstantiate = jest.fn()
const mockRun = jest.fn()
yeoman.createEnv.mockReturnValue({
  instantiate: mockGenInstantiate,
  runGenerator: mockRun
})

// mock login
jest.mock('@adobe/aio-lib-ims')

// mock console calls
jest.mock('@adobe/aio-cli-lib-console')
const LibConsoleCLI = require('@adobe/aio-cli-lib-console')
const mockConsoleCLIInstance = {
  getEnabledServicesForOrg: jest.fn(),
  promptForSelectOrganization: jest.fn(),
  getOrganizations: jest.fn(),
  getProjects: jest.fn(),
  promptForSelectProject: jest.fn(),
  promptForCreateProjectDetails: jest.fn(),
  createProject: jest.fn(),
  getWorkspaces: jest.fn(),
  promptForSelectWorkspace: jest.fn(),
  getServicePropertiesFromWorkspace: jest.fn(),
  subscribeToServices: jest.fn(),
  getWorkspaceConfig: jest.fn(),
  createWorkspace: jest.fn()
  // promptForServiceSubscriptionsOperation: jest.fn(),
  // confirmNewServiceSubscriptions: jest.fn(),
  // promptForSelectServiceProperties: jest.fn()
}
LibConsoleCLI.init.mockResolvedValue(mockConsoleCLIInstance)
/** @private */
function resetMockConsoleCLI () {
  Object.keys(mockConsoleCLIInstance).forEach(
    k => mockConsoleCLIInstance[k].mockReset()
  )
  LibConsoleCLI.init.mockClear()
}

jest.mock('@adobe/generator-aio-app', () => ({
  application: 'fake-gen-application',
  'base-app': 'fake-gen-base-app',
  'add-ci': 'fake-gen-add-ci',
  extensions: {
    'dx/excshell/1': 'fake-gen-excshell',
    'dx/asset-compute/worker/1': 'fake-gen-nui'
  }
}))

// mock prompt hardcoded generator list
jest.mock('inquirer')
const inquirer = require('inquirer')
const mockExtensionPrompt = jest.fn()
inquirer.createPromptModule = jest.fn().mockReturnValue(mockExtensionPrompt)
const { implPromptChoices } = require('../../../src/lib/defaults')
const extChoices = implPromptChoices
const excshellSelection = [implPromptChoices.find(c => c.value.name === 'dx/excshell/1').value]
const assetComputeSelection = [implPromptChoices.find(c => c.value.name === 'dx/asset-compute/worker/1').value]

// mock install app helper
const mockInstallPackages = jest.fn()
jest.mock('../../../src/lib/app-helper.js', () => ({
  installPackages: mockInstallPackages,
  atLeastOne: () => true,
  getCliInfo: () => ({ accessToken: 'fake', env: 'prod' }) // for base command
}))

// mock cwd
let fakeCwd
const savedChdir = process.chdir
const savedCwd = process.cwd
beforeEach(() => {
  fakeCwd = 'cwd'
  process.chdir = jest.fn().mockImplementation(dir => { fakeCwd = dir })
  process.cwd = jest.fn().mockImplementation(() => fakeCwd)
  process.chdir.mockClear()
  process.cwd.mockClear()
})
afterAll(() => {
  process.chdir = savedChdir
  process.cwd = savedCwd
})

const TheCommand = require('../../../src/commands/app/init')
const BaseCommand = require('../../../src/BaseCommand')
const runtimeLib = require('@adobe/aio-lib-runtime') // eslint-disable-line no-unused-vars

const savedDataDir = process.env.XDG_DATA_HOME
beforeEach(() => {
  mockGenInstantiate.mockReset()
  mockRun.mockReset()
  yeoman.createEnv.mockClear()
  fs.ensureDirSync.mockClear()
  fs.unlinkSync.mockClear()
  // set config.dataDir in oclif
  process.env.XDG_DATA_HOME = 'data-dir'

  resetMockConsoleCLI()
  mockExtensionPrompt.mockReset()
  mockInstallPackages.mockClear()

  // default
  mockImport.importConfigJson.mockReset()
  mockImport.loadAndValidateConfigFile.mockReset()
})
afterAll(() => {
  process.env.XDG_DATA_HOME = savedDataDir
})

// universal path
const certDir = path.join('data-dir', '@adobe', 'aio-cli-plugin-app', 'entp-int-certs')

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
  test('flags', async () => {
    expect(TheCommand.flags).toEqual(expect.objectContaining(BaseCommand.flags))

    expect(typeof TheCommand.flags.import).toBe('object')
    expect(TheCommand.flags.import.char).toBe('i')

    expect(typeof TheCommand.flags.yes).toBe('object')
    expect(TheCommand.flags.yes.char).toBe('y')
    expect(TheCommand.flags.yes.default).toBe(false)

    expect(typeof TheCommand.flags['skip-install']).toBe('object')
    expect(TheCommand.flags['skip-install'].char).toBe('s')
    expect(TheCommand.flags['skip-install'].default).toBe(false)

    expect(TheCommand.flags.login.allowNo).toBe(true)
    expect(TheCommand.flags.login.default).toBe(true)

    expect(TheCommand.flags.workspace.default).toBe('Stage')
    expect(TheCommand.flags.workspace.char).toBe('w')
    expect(TheCommand.flags.workspace.exclusive).toEqual(['import'])
  })

  test('args', async () => {
    expect(TheCommand.args).toEqual(expect.arrayContaining([{
      name: 'path',
      description: 'Path to the app directory',
      default: '.'
    }]))
  })
})

describe('bad args/flags', () => {
  test('unknown', async () => {
    await expect(TheCommand.run(['.', '--wtf'])).rejects.toThrow('Unexpected argument')
  })
  test('--no-login and --workspace', async () => {
    await expect(TheCommand.run(['--no-login', '--workspace', 'dev'])).rejects.toThrow('--no-login and --workspace flags cannot be used together.')
  })
  test('--no-login and --extension does not exist', async () => {
    await expect(TheCommand.run(['--no-login', '--extension', 'dev'])).rejects.toThrow('--extension=dev not found.')
  })
})

describe('run', () => {
  test('--no-login, select excshell', async () => {
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['--no-login'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).not.toHaveBeenCalled()
  })

  test('--no-login, select excshell, arg: /otherdir', async () => {
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['--no-login', '/otherdir'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'otherdir', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'otherdir', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).not.toHaveBeenCalled()

    expect(fs.ensureDirSync).toHaveBeenCalledWith(path.resolve('/otherdir'))
    expect(process.chdir).toHaveBeenCalledWith(path.resolve('/otherdir'))
  })

  test('--no-login, select both', async () => {
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection.concat(assetComputeSelection) })
    await TheCommand.run(['--no-login'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(4)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-nui',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).not.toHaveBeenCalled()
  })

  test('--no-login --no-extensions', async () => {
    await TheCommand.run(['--no-login', '--no-extensions'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-application',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).not.toHaveBeenCalled()
    expect(mockImport.importConfigJson).not.toHaveBeenCalled()
  })

  test('--no-login --yes --skip-install, select excshell', async () => {
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['--no-login', '--yes', '--skip-install'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': true, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': true, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': true, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).not.toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).not.toHaveBeenCalled()
  })

  test('--no-login --yes --skip-install, --extension dx/asset-compute/worker/1', async () => {
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['--no-login', '--yes', '--skip-install', '--extension', 'dx/asset-compute/worker/1'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': true, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': true, 'project-name': 'cwd', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-nui',
      { options: { 'skip-prompt': true, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).not.toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).not.toHaveBeenCalled()
    expect(mockImport.importConfigJson).not.toHaveBeenCalled()
  })

  // fake imported config
  const fakeConfig = {
    project: {
      name: 'hola',
      title: 'hola world',
      org: { name: 'bestorg' },
      workspace: {
        details: {
          credentials: [
            {
              jwt: {
                client_id: 'fakeclientid'
              }
            }
          ]
        }
      }
    }
  }
  const fakeConfigNoCredentials = {
    project: {
      name: 'hola',
      title: 'hola world',
      org: { name: 'bestorg' },
      workspace: {
        details: {
        }
      }
    }
  }

  test('--import fakeconfig.json, select excshell', async () => {
    mockImport.loadAndValidateConfigFile.mockReturnValue({ values: fakeConfig })
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['--import', 'fakeconfig.json'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
  })

  test('--import fakeconfig.json, select excshell, no client id', async () => {
    mockImport.loadAndValidateConfigFile.mockReturnValue({ values: fakeConfigNoCredentials })
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['--import', 'fakeconfig.json'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).not.toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfigNoCredentials)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: '' }
    )
  })

  // some fake data
  const fakeSupportedOrgServices = [{ code: 'AssetComputeSDK', properties: {} }, { code: 'another', properties: {} }]
  const fakeSupportedOrgServicesNoAssetCompute = [{ code: 'another', properties: {} }]
  const fakeProject = { id: 'fakeprojid', name: 'bestproject', title: 'best project' }
  const fakeOrg = { id: 'fakeorgid', name: 'bestorg' }
  const fakeWorkspaces = [{ id: 'fakewspcid1', name: 'Stage' }, { id: 'fkewspcid2', name: 'dev' }]
  const fakeServicePropertiesNoAssetCompute = [{ sdkCode: 'another' }]

  test('with login, select excshell', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServices)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)

    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run([])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(fakeOrg.id, fakeProject.id, fakeWorkspaces[0].id, fakeSupportedOrgServices)
    // exchshell has no required service to be added
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.createProject).not.toHaveBeenCalled()
  })

  test('with login, select asset-compute', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServices)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)

    mockExtensionPrompt.mockReturnValue({ res: assetComputeSelection })
    await TheCommand.run([])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-nui',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(fakeOrg.id, fakeProject.id, fakeWorkspaces[0].id, fakeSupportedOrgServices)
    // adding the required nui service (exchshell has no required service)
    expect(mockConsoleCLIInstance.subscribeToServices).toHaveBeenCalledWith(
      fakeOrg.id,
      fakeProject,
      fakeWorkspaces[0],
      expect.stringContaining(certDir),
      [{ sdkCode: 'another' }, { sdkCode: 'AssetComputeSDK' }]
    )
    expect(mockConsoleCLIInstance.createProject).not.toHaveBeenCalled()
  })

  test('with login, select excshell, no asset compute service in org', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServicesNoAssetCompute)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)

    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run([])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining(
      {
        choices: [
        // exc shell
          extChoices[0],
          extChoices[1],
          // disabled nui
          expect.objectContaining({
            disabled: true,
            name: expect.stringContaining('missing service(s) in Org: \'AssetComputeSDK\''),
            value: expect.any(Object)
          })
        ]
      })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(fakeOrg.id, fakeProject.id, fakeWorkspaces[0].id, fakeSupportedOrgServicesNoAssetCompute)
    // exchshell has no required service to be added
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.createProject).not.toHaveBeenCalled()
  })

  test('with login, select excshell, create new project', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(null) // null = user selects to create a project
    mockConsoleCLIInstance.createProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServices)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)
    mockConsoleCLIInstance.promptForCreateProjectDetails.mockResolvedValue('fakedetails')
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run([])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(fakeOrg.id, fakeProject.id, fakeWorkspaces[0].id, fakeSupportedOrgServices)
    // exchshell has no required service to be added
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.createProject).toHaveBeenCalledWith(fakeOrg.id, 'fakedetails')
  })

  test('with login, --extension excshell, create new project', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(null) // null = user selects to create a project
    mockConsoleCLIInstance.createProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServices)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)
    mockConsoleCLIInstance.promptForCreateProjectDetails.mockResolvedValue('fakedetails')
    mockExtensionPrompt.mockReturnValue({})

    await TheCommand.run(['--extension', 'dx/excshell/1'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).toHaveBeenCalled()
    expect(mockExtensionPrompt).not.toHaveBeenCalled()
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(fakeOrg.id, fakeProject.id, fakeWorkspaces[0].id, fakeSupportedOrgServices)
    // exchshell has no required service to be added
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.createProject).toHaveBeenCalledWith(fakeOrg.id, 'fakedetails')
  })

  test('with login, select excshell, -w dev', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServices)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)

    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    await TheCommand.run(['-w', 'dev'])
    expect(mockGenInstantiate).toHaveBeenCalledTimes(3)
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-base-app',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-add-ci',
      { options: { 'skip-prompt': false, 'project-name': 'hola', 'skip-install': true } }
    )
    expect(mockGenInstantiate).toHaveBeenCalledWith(
      'fake-gen-excshell',
      { options: { 'skip-prompt': false, force: true, 'skip-install': true } }
    )
    expect(mockInstallPackages).toHaveBeenCalled()
    expect(LibConsoleCLI.init).toHaveBeenCalled()
    expect(mockExtensionPrompt).toBeCalledWith([expect.objectContaining({ choices: extChoices })])
    expect(mockImport.importConfigJson).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(fakeConfig)),
      'cwd',
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeclientid' }
    )
    // get config for dev workspace (fakeWorkspaces[1])
    expect(mockConsoleCLIInstance.getWorkspaceConfig).toHaveBeenCalledWith(fakeOrg.id, fakeProject.id, fakeWorkspaces[1].id, fakeSupportedOrgServices)
    // exchshell has no required service to be added
    expect(mockConsoleCLIInstance.subscribeToServices).not.toHaveBeenCalled()
    expect(mockConsoleCLIInstance.createProject).not.toHaveBeenCalled()
  })

  test('with login, select excshell, -w notexists, create workspace', async () => {
    mockConsoleCLIInstance.promptForSelectOrganization.mockResolvedValue(fakeOrg)
    mockConsoleCLIInstance.promptForSelectProject.mockResolvedValue(fakeProject)
    mockConsoleCLIInstance.getWorkspaces.mockResolvedValue(fakeWorkspaces)
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue(fakeServicePropertiesNoAssetCompute)
    mockConsoleCLIInstance.getEnabledServicesForOrg.mockResolvedValue(fakeSupportedOrgServices)
    mockConsoleCLIInstance.getWorkspaceConfig.mockResolvedValue(fakeConfig)
    mockExtensionPrompt.mockReturnValue({ res: excshellSelection })
    mockConsoleCLIInstance.createWorkspace.mockResolvedValue(fakeWorkspaces[0])

    await TheCommand.run(['-w', 'notexists'])
    expect(mockConsoleCLIInstance.createWorkspace).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ name: 'notexists', title: '' }))
  })
})
