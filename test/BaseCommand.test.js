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

const { stdout } = require('stdout-stderr')
const { Command } = require('@oclif/core')

jest.mock('@adobe/aio-lib-core-config')
const mockAioConfig = require('@adobe/aio-lib-core-config')

const mockConfigLoader = require('@adobe/aio-cli-lib-app-config')
jest.mock('@adobe/aio-cli-lib-app-config')
const getMockConfig = require('./data-mocks/config-loader')

const libEnv = require('@adobe/aio-lib-env')
jest.mock('@adobe/aio-lib-env')

jest.mock('@adobe/aio-lib-ims')
const { getToken } = require('@adobe/aio-lib-ims')

jest.mock('@adobe/aio-cli-lib-console')
const LibConsoleCLI = require('@adobe/aio-cli-lib-console')
LibConsoleCLI.init.mockResolvedValue({})

const TheCommand = require('../src/BaseCommand')

jest.mock('inquirer')
const inquirer = require('inquirer')
const mockExtensionPrompt = jest.fn()
inquirer.createPromptModule = jest.fn().mockReturnValue(mockExtensionPrompt)

beforeEach(() => {
  libEnv.getCliEnv.mockReturnValue('prod')
  mockConfigLoader.load.mockReset()
  LibConsoleCLI.init.mockClear()
  LibConsoleCLI.cleanStdOut.mockClear()

  inquirer.createPromptModule.mockClear()
  mockExtensionPrompt.mockReset()
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof Command).toBeTruthy()
})

test('flags', async () => {
  expect(typeof TheCommand.flags.version).toBe('object')
  expect(typeof TheCommand.flags.version.description).toBe('string')

  expect(typeof TheCommand.flags.verbose).toBe('object')
  expect(TheCommand.flags.verbose.char).toBe('v')
  expect(typeof TheCommand.flags.verbose.description).toBe('string')
})

test('args', async () => {
  expect(TheCommand.args).toEqual({})
})

test('basecommand defines method', async () => {
  const cmd = new TheCommand()

  expect(cmd.getLaunchUrlPrefix).toBeDefined()
  expect(typeof cmd.getLaunchUrlPrefix).toBe('function')
  expect(cmd.preRelease).toBeDefined()
  expect(typeof cmd.preRelease).toBe('function')
})

test('preRelease() outputs to log', async () => {
  const cmd = new TheCommand()
  cmd.log = jest.fn()

  cmd.preRelease()
  expect(cmd.log).toHaveBeenCalledWith(expect.stringMatching('Pre-release warning: This command is in pre-release, and not suitable for production.'))
})

test('getLaunchUrlPrefix() warns on older url', async () => {
  const cmd = new TheCommand()

  mockAioConfig.get.mockReturnValue('some-url/apps/some-param')
  expect(cmd.getLaunchUrlPrefix()).toBe('some-url/custom-apps/some-param')
  expect(stdout.output).toMatch('Warning: your environment variables contains an older version of AIO_LAUNCH_URL_PREFIX')

  mockAioConfig.get.mockReturnValue('some-url/myapps/some-param')
  expect(cmd.getLaunchUrlPrefix()).toBe('some-url/custom-apps/some-param')
  expect(stdout.output).toMatch('Warning: your environment variables contains an older version of AIO_LAUNCH_URL_PREFIX')

  mockAioConfig.get.mockReturnValue('some-url/custom-apps/some-param')
  expect(cmd.getLaunchUrlPrefix()).toBe('some-url/custom-apps/some-param')
  expect(stdout.output).toMatch('')

  mockAioConfig.get.mockReturnValue(null)
  expect(cmd.getLaunchUrlPrefix()).toEqual(expect.stringContaining('https://'))
})

test('getLaunchUrlPrefix() uses stage launch prefix', async () => {
  const cmd = new TheCommand()
  libEnv.getCliEnv.mockReturnValue('stage')
  mockAioConfig.get.mockReturnValue(0)
  expect(cmd.getLaunchUrlPrefix()).toBe('https://experience-stage.adobe.com/?devMode=true#/custom-apps/?localDevUrl=')
})

describe('getFullConfig', () => {
  test('keeps cache', async () => {
    const cmd = new TheCommand()
    mockConfigLoader.load.mockResolvedValue({ a: 'hello' })
    const config = await cmd.getFullConfig()
    const config2 = await cmd.getFullConfig()
    expect(config).toEqual({ a: 'hello' })
    expect(config).toEqual(config2)
    expect(mockConfigLoader.load).toHaveBeenCalledTimes(1)
  })
  test('with options', async () => {
    const cmd = new TheCommand()
    mockConfigLoader.load.mockResolvedValue({ a: 'hello' })
    const config = await cmd.getFullConfig({ someOptions: {} })
    expect(config).toEqual({ a: 'hello' })
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ someOptions: {}, validateAppConfig: false })
  })
  test('with validateAppConfig=true', async () => {
    const cmd = new TheCommand()
    mockConfigLoader.load.mockResolvedValue({ a: 'hello' })
    const config = await cmd.getFullConfig({ someOptions: {}, validateAppConfig: true })
    expect(config).toEqual({ a: 'hello' })
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ someOptions: {}, validateAppConfig: true })
  })
})

describe('getConfigFileForKey', () => {
  test('returns empty object if not found', async () => {
    mockConfigLoader.load.mockResolvedValue(getMockConfig('exc', {}))
    const cmd = new TheCommand()
    expect(await cmd.getConfigFileForKey('notexist.key.abc')).toEqual({})
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ validateAppConfig: false })
  })
  test('returns file and key if found', async () => {
    const config = getMockConfig('exc', {})
    const cmd = new TheCommand()
    mockConfigLoader.load.mockResolvedValue(config)
    expect(await cmd.getConfigFileForKey('extensions')).toEqual(config.includeIndex.extensions)
  })
})

describe('getRuntimeManifestConfigFile', () => {
  test('no actions', async () => {
    mockConfigLoader.load.mockResolvedValue(getMockConfig('app-no-actions', {}))
    const cmd = new TheCommand()
    expect(await cmd.getRuntimeManifestConfigFile('application')).toEqual({ file: 'app.config.yaml', key: 'application.runtimeManifest' })
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ validateAppConfig: false })
  })
  test('multiple implementations', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getRuntimeManifestConfigFile('application')).toEqual({ file: 'app.config.yaml', key: 'application.runtimeManifest' })
    expect(await cmd.getRuntimeManifestConfigFile('dx/asset-compute/worker/1')).toEqual({ file: 'src/dx-asset-compute-worker-1/ext.config.yaml', key: 'runtimeManifest' })
    expect(await cmd.getRuntimeManifestConfigFile('dx/excshell/1')).toEqual({ file: 'src/dx-excshell-1/ext.config.yaml', key: 'runtimeManifest' })
  })
})

describe('getEventsConfigFile', () => {
  test('no events', async () => {
    mockConfigLoader.load.mockResolvedValue(getMockConfig('app-no-actions', {}))
    const cmd = new TheCommand()
    expect(await cmd.getEventsConfigFile('application')).toEqual({ file: 'app.config.yaml', key: 'application.events' })
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ validateAppConfig: false })
  })
  test('multiple implementations', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getEventsConfigFile('application')).toEqual({ file: 'app.config.yaml', key: 'application.events' })
    expect(await cmd.getEventsConfigFile('dx/asset-compute/worker/1')).toEqual({ file: 'src/dx-asset-compute-worker-1/ext.config.yaml', key: 'events' })
    expect(await cmd.getEventsConfigFile('dx/excshell/1')).toEqual({ file: 'src/dx-excshell-1/ext.config.yaml', key: 'events' })
  })
})

describe('getAppExtConfigs', () => {
  test('no extension flags', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getAppExtConfigs({})).toEqual(config.all)
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ validateAppConfig: false })
  })
  test('with options', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getAppExtConfigs({}, { some: 'options' })).toEqual(config.all)
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ some: 'options', validateAppConfig: false })
  })
  test('-e exc -e asset', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getAppExtConfigs({ extension: ['exc', 'asset'] }))
      .toEqual({
        'dx/excshell/1': config.all['dx/excshell/1'],
        'dx/asset-compute/worker/1': config.all['dx/asset-compute/worker/1']
      })
  })
  test('-e application', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getAppExtConfigs({ extension: ['application'] }))
      .toEqual({ application: config.all.application })
  })

  test('-e application, { validateAppConfig: true }', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    expect(await cmd.getAppExtConfigs({ extension: ['application'] }, { validateAppConfig: true }))
      .toEqual({ application: config.all.application })
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ validateAppConfig: true })
  })

  test('-e exc -e notexists', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    await expect(async () => await cmd.getAppExtConfigs({ extension: ['exc', 'notexists'] }))
      .rejects.toThrow('No matching extension implementation found for flag \'-e notexists\'')
  })

  test('-e dx (matches more than one)', async () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.load.mockResolvedValue(config)
    const cmd = new TheCommand()
    await expect(async () => await cmd.getAppExtConfigs({ extension: ['dx'] }))
      .rejects.toThrow('Flag \'-e dx\' matches multiple extension implementation')
  })
})

describe('getLibConsoleCLI', () => {
  test('cache', async () => {
    const cmd = new TheCommand()
    const a = await cmd.getLibConsoleCLI()
    const b = await cmd.getLibConsoleCLI()
    expect(a).toBe(b)
    expect(LibConsoleCLI.init).toHaveBeenCalledTimes(1)
  })
  test('prod env', async () => {
    getToken.mockReturnValue('hola')
    libEnv.getCliEnv.mockReturnValue('prod')
    const cmd = new TheCommand()
    await cmd.getLibConsoleCLI()
    expect(LibConsoleCLI.init).toHaveBeenCalledWith({ env: 'prod', accessToken: 'hola', apiKey: expect.any(String) })
  })
  test('stage env', async () => {
    getToken.mockReturnValue('hola')
    libEnv.getCliEnv.mockReturnValue('stage')
    const cmd = new TheCommand()
    await cmd.getLibConsoleCLI()
    expect(LibConsoleCLI.init).toHaveBeenCalledWith({ env: 'stage', accessToken: 'hola', apiKey: expect.any(String) })
  })
})

test('init', async () => {
  const cmd = new TheCommand([])
  cmd.config = {}
  await cmd.init()
  expect(cmd.prompt).toBe(mockExtensionPrompt)
  expect(inquirer.createPromptModule).toHaveBeenCalledWith({ output: process.stderr })
})

test('catch', async () => {
  const cmd = new TheCommand([])
  cmd.error = jest.fn()
  await cmd.catch(new Error('fake error'))
  expect(cmd.error).toHaveBeenCalledWith('fake error')
})

test('will change error message when aio app outside of the application root', async () => {
  const cmd = new TheCommand([])
  cmd.error = jest.fn()
  await cmd.catch(new Error('ENOENT: no such file or directory, open \'package.json\''))

  const errorList = [
    'ENOENT: no such file or directory, open \'package.json\''
  ]
  expect(cmd.error).toHaveBeenCalledWith(errorList.join('\n'))
})

test('will change error message when aio app outside of the application root (--verbose)', async () => {
  const cmd = new TheCommand(['--verbose'])
  cmd.error = jest.fn()
  await cmd.catch(new Error('ENOENT: no such file or directory, open \'package.json\''))

  const errorList = [
    'Error: ENOENT: no such file or directory, open \'package.json\''
  ]
  expect(cmd.error).toHaveBeenCalledWith(expect.stringContaining(errorList.join('\n')))
})

test('will handle errors without stack traces when using --verbose flag', async () => {
  const cmd = new TheCommand(['--verbose'])
  cmd.error = jest.fn()
  const errorWithoutStack = new Error('fake error')
  delete errorWithoutStack.stack
  await cmd.catch(errorWithoutStack)

  expect(cmd.error).toHaveBeenCalledWith(expect.stringContaining('fake error'))
})

test('will handle errors without stack traces when not using --verbose flag', async () => {
  const cmd = new TheCommand([])
  cmd.error = jest.fn()
  const errorWithoutStack = new Error('fake error')
  delete errorWithoutStack.stack
  await cmd.catch(errorWithoutStack)

  expect(cmd.error).toHaveBeenCalledWith(expect.stringContaining('fake error'))
})

test('pjson', async () => {
  const cmd = new TheCommand([])
  cmd.config = { pjson: { name: 'fake', version: '0' } }
  expect(cmd.pjson).toEqual({ name: 'fake', version: '0' })
  expect(cmd.appName).toEqual('fake')
  expect(cmd.appVersion).toEqual('0')
})

test('cleanConsoleCLIOutput', async () => {
  const cmd = new TheCommand([])
  await cmd.cleanConsoleCLIOutput()
  expect(LibConsoleCLI.cleanStdOut).toHaveBeenCalled()
})
