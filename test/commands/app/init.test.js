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

const TheCommand = require('../../../src/commands/app/init')
const BaseCommand = require('../../../src/BaseCommand')
const runtimeLib = require('@adobe/aio-lib-runtime') // eslint-disable-line no-unused-vars
const importLib = require('../../../src/lib/import')
jest.mock('../../../src/lib/import')

jest.mock('fs-extra')

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

jest.mock('yeoman-environment')
const yeoman = require('yeoman-environment')

const mockRegister = jest.fn()
const mockRun = jest.fn()
yeoman.createEnv.mockReturnValue({
  register: mockRegister,
  run: mockRun
})

// mock cwd
let fakeCwd
const savedChdir = process.chdir
const savedCwd = process.cwd
beforeEach(() => {
  fakeCwd = 'lifeisgood'
  process.chdir = jest.fn().mockImplementation(dir => { fakeCwd = dir })
  process.cwd = jest.fn().mockImplementation(() => fakeCwd)
  process.chdir.mockClear()
  process.cwd.mockClear()
})
afterAll(() => {
  process.chdir = savedChdir
  process.cwd = savedCwd
})

const savedDataDir = process.env.XDG_DATA_HOME
beforeEach(() => {
  mockRegister.mockReset()
  mockRun.mockReset()
  yeoman.createEnv.mockClear()
  fs.ensureDirSync.mockClear()
  fs.unlinkSync.mockClear()
  importLib.importConfigJson.mockReset()
  importLib.writeAio.mockReset()
  // set config.dataDir in oclif
  process.env.XDG_DATA_HOME = 'data-dir'
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
})

describe('template module cannot be registered', () => {
  test('unknown error', async () => {
    mockRegister.mockImplementation(() => { throw new Error('some error') })
    await expect(TheCommand.run(['.'])).rejects.toThrow('some error')
  })
})

const fakeCredentials = [
  {
    id: '1',
    fake: { client_id: 'notjwtId' }
  },
  {
    id: '2',
    jwt: { client_id: 'fakeId123' }
  }
]

const fakeWorkspaceServices = [
  {
    code: 'service1SDK',
    name: 'the first fake service'
  },
  {
    code: 'service2SDK',
    name: 'the second fake service'
  }
]
const fakeSupportedServices = [
  {
    code: 'service1SDK',
    name: 'the first fake service'
  },
  {
    code: 'service2SDK',
    name: 'the second fake service'
  },
  {
    code: 'service3SDK',
    name: 'the third fake service'
  },
  {
    code: 'service4SDK',
    name: 'the fourth fake service'
  }
]

/** @private */
function mockValidConfig ({ name = 'lifeisgood', workspaceServices = fakeWorkspaceServices, supportedServices = undefined, credentials = fakeCredentials } = {}) {
  const project = {
    name,
    org: {
      details: {
        services: supportedServices
      }
    },
    workspace: {
      details: {
        services: workspaceServices,
        credentials
      }
    }
  }
  // note: supportedServices config is not always defined, e.g. when importing the file
  if (supportedServices) {
    project.org.details = { services: supportedServices }
  }

  importLib.loadAndValidateConfigFile.mockReturnValue({
    values: { project }
  })

  return project
}

/** @private */
function mockInvalidConfig () {
  importLib.loadAndValidateConfigFile.mockImplementation(() => { throw new Error('fake error') })
}

describe('run', () => {
  test('some-path, --yes', async () => {
    mockValidConfig()
    const appFolder = 'some-path'
    await TheCommand.run([appFolder, '--yes'])

    // gen-console is skipped
    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': true,
      'skip-install': false,
      'project-name': appFolder,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.ensureDirSync).toHaveBeenCalledWith(expect.stringContaining('some-path'))
    expect(process.chdir).toHaveBeenCalledWith(expect.stringContaining('some-path'))
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('some-path, --yes --skip-install', async () => {
    mockValidConfig()
    const appFolder = 'some-path'
    await TheCommand.run([appFolder, '--yes', '--skip-install'])

    // gen-console is skipped
    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': true,
      'skip-install': true,
      'project-name': appFolder,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.ensureDirSync).toHaveBeenCalledWith(expect.stringContaining('some-path'))
    expect(process.chdir).toHaveBeenCalledWith(expect.stringContaining('some-path'))
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path, --yes', async () => {
    const project = mockValidConfig()
    await TheCommand.run(['--yes'])

    // gen-console is skipped
    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': true,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path, --no-login', async () => {
    const project = mockValidConfig()
    await TheCommand.run(['--no-login'])

    // gen-console is skipped
    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path, --yes --skip-install', async () => {
    const project = mockValidConfig()
    await TheCommand.run(['--yes', '--skip-install'])

    // gen-console is skipped
    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': true,
      'skip-install': true,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path, --skip-install', async () => {
    const project = mockValidConfig({ supportedServices: fakeSupportedServices })
    await TheCommand.run(['--skip-install'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': true,
      'project-name': project.name,
      'adobe-services': 'service1SDK,service2SDK',
      'supported-adobe-services': 'service1SDK,service2SDK,service3SDK,service4SDK'
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('getCliInfo error', async () => {
    mockSetCli.mockReset()
    mockSetCli.mockImplementationOnce(() => { throw new Error('Error') })

    const project = mockValidConfig()
    await TheCommand.run(['--skip-install'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': false,
      'skip-install': true,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path', async () => {
    const project = mockValidConfig({ supportedServices: fakeSupportedServices })
    await TheCommand.run([])

    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'service1SDK,service2SDK',
      'supported-adobe-services': 'service1SDK,service2SDK,service3SDK,service4SDK'
    })
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('no path, no supported services in console config file', async () => {
    const project = mockValidConfig({ supportedServices: [] })
    await TheCommand.run([])

    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'service1SDK,service2SDK',
      'supported-adobe-services': ''
    })
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('no path, no workspace services in console config file', async () => {
    const project = mockValidConfig({ workspaceServices: [], supportedServices: fakeSupportedServices })
    await TheCommand.run([])

    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': 'service1SDK,service2SDK,service3SDK,service4SDK'
    })
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('no path, no services at all in console config file', async () => {
    const project = mockValidConfig({ workspaceServices: [], supportedServices: [] })
    await TheCommand.run([])

    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('some-path', async () => {
    const project = mockValidConfig({ supportedServices: fakeSupportedServices })
    await TheCommand.run(['some-path'])

    expect(fs.ensureDirSync).toHaveBeenCalledWith(expect.stringContaining('some-path'))
    expect(process.chdir).toHaveBeenCalledWith(expect.stringContaining('some-path'))

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'service1SDK,service2SDK',
      'supported-adobe-services': 'service1SDK,service2SDK,service3SDK,service4SDK'
    })

    // we changed dir, console.json is in cwd
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('some-path no-supported-services', async () => {
    const project = mockValidConfig()
    await TheCommand.run(['some-path'])

    expect(fs.ensureDirSync).toHaveBeenCalledWith(expect.stringContaining('some-path'))
    expect(process.chdir).toHaveBeenCalledWith(expect.stringContaining('some-path'))

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenNthCalledWith(2, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'service1SDK,service2SDK',
      'supported-adobe-services': ''
    })

    // we changed dir, console.json is in cwd
    expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
  })

  test('no imports should write aio config', async () => {
    // the only way we write defaults if gen-console threw an error
    mockRun.mockImplementationOnce(() => { throw new Error('some error') })

    const project = mockValidConfig()
    await TheCommand.run([])

    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(2)
    const genConsole = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genConsole, {
      'access-token': mockAccessToken,
      'destination-file': 'console.json',
      'ims-env': 'prod',
      'allow-create': true,
      'cert-dir': certDir
    })
    const genApp = mockRegister.mock.calls[1][1]
    expect(mockRun).toHaveBeenCalledWith(genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': '',
      'supported-adobe-services': ''
    })
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path --import file=invalid config', async () => {
    mockInvalidConfig()
    await expect(TheCommand.run(['--import', 'config.json'])).rejects.toThrow('fake error')
  })

  test('no-path --import file={name: lifeisgood, services:AdobeTargetSDK,CampaignSDK, credentials:fake,jwt}', async () => {
    const project = mockValidConfig({
      name: 'lifeisgood',
      workspaceServices: [{ code: 'AdobeTargetSDK' }, { code: 'CampaignSDK' }]
    })
    await TheCommand.run(['--import', 'config.json'])

    // no args.path
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'AdobeTargetSDK,CampaignSDK',
      'supported-adobe-services': ''
    })

    expect(importLib.importConfigJson).toHaveBeenCalledWith(path.resolve('config.json'),
      process.cwd(),
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeId123' })
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path --import file={name: lifeisgood, workspaceServices:AdobeTargetSDK,CampaignSDK, credentials:fake}', async () => {
    const project = mockValidConfig({
      name: 'lifeisgood',
      workspaceServices: [{ code: 'AdobeTargetSDK' }, { code: 'CampaignSDK' }],
      credentials: [{ id: '1', fake: { client_id: 'notjwtId' } }]
    })
    await TheCommand.run(['--import', 'config.json'])

    // no args.path
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'AdobeTargetSDK,CampaignSDK',
      'supported-adobe-services': ''
    })

    expect(importLib.importConfigJson).toHaveBeenCalledWith(path.resolve('config.json'),
      process.cwd(),
      { interactive: false, merge: true },
      { SERVICE_API_KEY: '' })
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path --import file={name: lifeisgood, workspaceServices:AdobeTargetSDK,CampaignSDK, credentials:null}', async () => {
    const project = mockValidConfig({
      name: 'lifeisgood',
      workspaceServices: [{ code: 'AdobeTargetSDK' }, { code: 'CampaignSDK' }],
      credentials: null
    })
    await TheCommand.run(['--import', 'config.json'])

    // no args.path
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genApp = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenNthCalledWith(1, genApp, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'AdobeTargetSDK,CampaignSDK',
      'supported-adobe-services': ''
    })

    expect(importLib.importConfigJson).toHaveBeenCalledWith(path.resolve('config.json'),
      process.cwd(),
      { interactive: false, merge: true },
      { SERVICE_API_KEY: '' })
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('no-path --yes --import file={name: lifeisgood, supportedServices:AdobeTargetSDK,CampaignSDK, credentials:fake,jwt}', async () => {
    const project = mockValidConfig({
      name: 'lifeisgood',
      supportedServices: [{ code: 'AdobeTargetSDK' }, { code: 'CampaignSDK' }]
    })
    await TheCommand.run(['--yes', '--import', 'config.json'])

    // no args.path
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(process.chdir).not.toHaveBeenCalled()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': true,
      'skip-install': false,
      'project-name': project.name,
      'adobe-services': 'service1SDK,service2SDK',
      'supported-adobe-services': 'AdobeTargetSDK,CampaignSDK'
    })
    expect(importLib.importConfigJson).toHaveBeenCalledWith(path.resolve('config.json'),
      process.cwd(),
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeId123' })
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  test('some-path --import ../fake/config.json', async () => {
    await TheCommand.run(['some-path', '--import', '../fake/config.json'])
    // Note here path.resolve uses another cwd than the mocked process.cwd
    expect(importLib.importConfigJson).toHaveBeenCalledWith(path.resolve('../fake/config.json'),
      process.cwd(),
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeId123' })
  })

  test('some-path --import /abs/fake/config.json', async () => {
    await TheCommand.run(['some-path', '--import', '/abs/fake/config.json'])
    // Note here path.resolve uses another cwd than the mocked process.cwd
    expect(importLib.importConfigJson).toHaveBeenCalledWith(path.resolve('/abs/fake/config.json'),
      process.cwd(),
      { interactive: false, merge: true },
      { SERVICE_API_KEY: 'fakeId123' })
  })
})
