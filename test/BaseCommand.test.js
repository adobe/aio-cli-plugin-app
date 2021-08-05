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
const { Command } = require('@oclif/command')

jest.mock('@adobe/aio-lib-core-config')
const mockAioConfig = require('@adobe/aio-lib-core-config')

const mockConfigLoader = require('@adobe/aio-cli-lib-app-config')
jest.mock('@adobe/aio-cli-lib-app-config')
const getMockConfig = require('./data-mocks/config-loader')

const libEnv = require('@adobe/aio-lib-env')
jest.mock('@adobe/aio-lib-env')

jest.mock('@adobe/aio-lib-ims')
const { getToken } = require('@adobe/aio-lib-ims')

jest.mock('@adobe/generator-aio-console/lib/console-cli.js')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli.js')
LibConsoleCLI.init.mockResolvedValue({})

const TheCommand = require('../src/BaseCommand')

jest.mock('inquirer')
const inquirer = require('inquirer')
const mockExtensionPrompt = jest.fn()
inquirer.createPromptModule = jest.fn().mockReturnValue(mockExtensionPrompt)

beforeEach(() => {
  libEnv.getCliEnv.mockReturnValue('prod')
  mockConfigLoader.mockReset()
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
  expect(TheCommand.args).toEqual([])
})

test('basecommand defines method', async () => {
  const cmd = new TheCommand()
  expect(cmd.getLaunchUrlPrefix).toBeDefined()
  expect(typeof cmd.getLaunchUrlPrefix).toBe('function')
  mockAioConfig.get.mockReturnValue('http://prefix?fake=')
  expect(cmd.getLaunchUrlPrefix()).toBe('http://prefix?fake=')
  mockAioConfig.get.mockReturnValue(null)
  expect(cmd.getLaunchUrlPrefix()).toEqual(expect.stringContaining('https://'))
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
  expect(cmd.getLaunchUrlPrefix()).toBe('https://experience-stage.adobe.com/?devMode=true#/custom-apps/?localDevUrl=')
})

describe('getFullConfig', () => {
  test('keeps cache', () => {
    const cmd = new TheCommand()
    mockConfigLoader.mockReturnValue({ a: 'hello' })
    const config = cmd.getFullConfig()
    const config2 = cmd.getFullConfig()
    expect(config).toEqual({ a: 'hello' })
    expect(config).toEqual(config2)
    expect(mockConfigLoader).toHaveBeenCalledTimes(1)
  })
  test('with options', () => {
    const cmd = new TheCommand()
    mockConfigLoader.mockReturnValue({ a: 'hello' })
    const config = cmd.getFullConfig({ someOptions: {} })
    expect(config).toEqual({ a: 'hello' })
    expect(mockConfigLoader).toHaveBeenCalledWith({ someOptions: {} })
  })
})

describe('getConfigFileForKey', () => {
  test('returns empty object if not found', () => {
    mockConfigLoader.mockReturnValue(getMockConfig('exc', {}))
    const cmd = new TheCommand()
    expect(cmd.getConfigFileForKey('notexist.key.abc')).toEqual({})
  })
  test('returns file and key if found', () => {
    const config = getMockConfig('exc', {})
    const cmd = new TheCommand()
    mockConfigLoader.mockReturnValue(config)
    expect(cmd.getConfigFileForKey('extensions')).toEqual(config.includeIndex.extensions)
  })
})

describe('getRuntimeManifestConfigFile', () => {
  test('no actions', () => {
    mockConfigLoader.mockReturnValue(getMockConfig('app-no-actions', {}))
    const cmd = new TheCommand()
    expect(cmd.getRuntimeManifestConfigFile('application')).toEqual({ file: 'app.config.yaml', key: 'application.runtimeManifest' })
  })
  test('multiple implementations', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(cmd.getRuntimeManifestConfigFile('application')).toEqual({ file: 'app.config.yaml', key: 'application.runtimeManifest' })
    expect(cmd.getRuntimeManifestConfigFile('dx/asset-compute/worker/1')).toEqual({ file: 'src/dx-asset-compute-worker-1/ext.config.yaml', key: 'runtimeManifest' })
    expect(cmd.getRuntimeManifestConfigFile('dx/excshell/1')).toEqual({ file: 'src/dx-excshell-1/ext.config.yaml', key: 'runtimeManifest' })
  })
})

describe('getAppExtConfigs', () => {
  test('no extension flags', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(cmd.getAppExtConfigs({})).toEqual(config.all)
  })
  test('with options', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(cmd.getAppExtConfigs({}, { some: 'options' })).toEqual(config.all)
    expect(mockConfigLoader).toHaveBeenCalledWith({ some: 'options' })
  })
  test('-e exc -e asset', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(cmd.getAppExtConfigs({ extension: ['exc', 'asset'] }))
      .toEqual({
        'dx/excshell/1': config.all['dx/excshell/1'],
        'dx/asset-compute/worker/1': config.all['dx/asset-compute/worker/1']
      })
  })
  test('-e application', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(cmd.getAppExtConfigs({ extension: ['application'] }))
      .toEqual({ application: config.all.application })
  })

  test('-e exc -e notexists', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(() => cmd.getAppExtConfigs({ extension: ['exc', 'notexists'] }))
      .toThrow('No matching extension implementation found for flag \'-e notexists\'')
  })

  test('-e dx (matches more than one)', () => {
    const config = getMockConfig('app-exc-nui', {})
    mockConfigLoader.mockReturnValue(config)
    const cmd = new TheCommand()
    expect(() => cmd.getAppExtConfigs({ extension: ['dx'] }))
      .toThrow('Flag \'-e dx\' matches multiple extension implementation')
  })
})

describe('getLibConsoleCLI', () => {
  test('test cache', async () => {
    const cmd = new TheCommand()
    const a = await cmd.getLibConsoleCLI()
    const b = await cmd.getLibConsoleCLI()
    expect(a).toBe(b)
    expect(LibConsoleCLI.init).toHaveBeenCalledTimes(1)
  })
  test('prod env ', async () => {
    getToken.mockReturnValue('hola')
    libEnv.getCliEnv.mockReturnValue('prod')
    const cmd = new TheCommand()
    await cmd.getLibConsoleCLI()
    expect(LibConsoleCLI.init).toHaveBeenCalledWith({ env: 'prod', accessToken: 'hola', apiKey: expect.any(String) })
  })
  test('stage env ', async () => {
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
