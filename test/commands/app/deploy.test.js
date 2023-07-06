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

const TheCommand = require('../../../src/commands/app/deploy')
const BaseCommand = require('../../../src/BaseCommand')
const cloneDeep = require('lodash.clonedeep')
const dataMocks = require('../../data-mocks/config-loader')
const helpersActual = jest.requireActual('../../../src/lib/app-helper.js')

const mockBundleFunc = jest.fn()

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

const mockWebLib = require('@adobe/aio-lib-web')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

const mockConfigData = {
  app: {
    hasFrontend: true,
    hasBackend: true
  },
  web: {
    injectedConfig: 'asldkfj'
  }
}

jest.mock('@oclif/core', () => {
  return {
    ...jest.requireActual('@oclif/core'),
    CliUx: {
      ux: {
        cli: {
          open: jest.fn()
        }
      }
    }
  }
})
const { CliUx: { ux: cli } } = require('@oclif/core')

jest.mock('../../../src/lib/log-forwarding', () => {
  const orig = jest.requireActual('../../../src/lib/log-forwarding')
  return {
    ...orig,
    init: jest.fn()
  }
})
const LogForwarding = require('../../../src/lib/log-forwarding')

const createWebExportAnnotation = (value) => ({
  annotations: { 'web-export': value }
})

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  // change this, dataMocks allows to inject custom configuration
  if (appFixtureName.includes('app')) {
    appConfig.application = { ...appConfig.application, ...aioConfig }
  }
  return appConfig
}

const mockExtRegExcShellPayload = () => {
  const payload = {
    endpoints: {
      'dx/excshell/1': {
        view: [
          { metadata: {} }
        ]
      }
    }
  }
  helpers.buildExtensionPointPayloadWoMetadata.mockReturnValueOnce(payload)
  mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites.mockReturnValueOnce(payload)
  mockLibConsoleCLI.updateExtensionPoints.mockReturnValueOnce(payload)
}

const mockExtRegExcShellAndNuiPayload = () => {
  const payload = {
    endpoints: {
      'dx/excshell/1': {
        view: [
          { metadata: {} }
        ]
      },
      'dx/asset-compute/worker/1': {
        workerProcess: [
        ]
      }
    }
  }
  helpers.buildExtensionPointPayloadWoMetadata.mockReturnValueOnce(payload)
  mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites.mockReturnValueOnce(payload)
  mockLibConsoleCLI.updateExtensionPoints.mockReturnValueOnce(payload)
}

const mockGetExtensionPointsRetractedApp = () => {
  const payload = [{
    status: 'RETRACTED',
    appId: '1234'
  }]
  mockLibConsoleCLI.getApplicationExtensions.mockReturnValueOnce(payload)
}

const mockGetExtensionPointsPublishedApp = () => {
  const payload = [{
    status: 'PUBLISHED',
    appId: '1234'
  }]
  mockLibConsoleCLI.getApplicationExtensions.mockReturnValueOnce(payload)
}

const mockGetProject = () => {
  const payload = {
    appId: '1234'
  }
  mockLibConsoleCLI.getProject.mockReturnValueOnce(payload)
}

const mockLibConsoleCLI = {
  updateExtensionPoints: jest.fn(),
  updateExtensionPointsWithoutOverwrites: jest.fn(),
  getProject: jest.fn(),
  getApplicationExtensions: jest.fn()
}

const mockLogForwarding = {
  isLocalConfigChanged: jest.fn(),
  getLocalConfigWithSecrets: jest.fn(),
  updateServerConfig: jest.fn()
}

afterAll(() => {
  jest.clearAllMocks()
  jest.resetAllMocks()
})

beforeEach(() => {
  helpers.writeConfig.mockReset()
  helpers.runInProcess.mockReset()
  helpers.buildExtensionPointPayloadWoMetadata.mockReset()
  helpers.buildExcShellViewExtensionMetadata.mockReset()
  helpers.createWebExportFilter.mockReset()
  mockLogForwarding.isLocalConfigChanged.mockReset()
  mockLogForwarding.getLocalConfigWithSecrets.mockReset()
  mockLogForwarding.updateServerConfig.mockReset()

  jest.clearAllMocks()

  helpers.wrapError.mockImplementation(msg => msg)
  helpers.createWebExportFilter.mockImplementation(filterValue => helpersActual.createWebExportFilter(filterValue))

  LogForwarding.init.mockResolvedValue(mockLogForwarding)
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual([])
})

test('flags', async () => {
  expect(typeof TheCommand.flags.action).toBe('object')
  expect(TheCommand.flags.action.char).toBe('a')
  expect(typeof TheCommand.flags.action.description).toBe('string')
  expect(JSON.stringify(TheCommand.flags.action.exclusive)).toStrictEqual(JSON.stringify(['extension', { name: 'publish', when: () => {} }]))

  expect(typeof TheCommand.flags['web-assets']).toBe('object')
  expect(typeof TheCommand.flags['web-assets'].description).toBe('string')
  expect(TheCommand.flags['web-assets'].default).toEqual(true)
  expect(TheCommand.flags['web-assets'].allowNo).toEqual(true)

  expect(typeof TheCommand.flags['force-build']).toBe('object')
  expect(typeof TheCommand.flags['force-build'].description).toBe('string')
  expect(TheCommand.flags['force-build'].default).toEqual(true)
  expect(TheCommand.flags['force-build'].allowNo).toEqual(true)

  expect(typeof TheCommand.flags['content-hash']).toBe('object')
  expect(typeof TheCommand.flags['content-hash'].description).toBe('string')
  expect(TheCommand.flags['content-hash'].default).toEqual(true)
  expect(TheCommand.flags['content-hash'].allowNo).toEqual(true)

  expect(typeof TheCommand.flags.extension).toBe('object')
  expect(typeof TheCommand.flags.extension.description).toBe('string')
  expect(TheCommand.flags.extension.char).toEqual('e')
  expect(TheCommand.flags.extension.exclusive).toEqual(['action'])

  expect(typeof TheCommand.flags.publish).toBe('object')
  expect(typeof TheCommand.flags.publish.description).toBe('string')
  expect(TheCommand.flags.publish.default).toEqual(true)
  expect(TheCommand.flags.publish.allowNo).toEqual(true)

  expect(typeof TheCommand.flags['force-deploy']).toBe('object')
  expect(typeof TheCommand.flags['force-deploy'].description).toBe('string')
  expect(TheCommand.flags['force-deploy'].default).toEqual(false)

  expect(typeof TheCommand.flags['force-publish']).toBe('object')
  expect(typeof TheCommand.flags['force-publish'].description).toBe('string')
  expect(TheCommand.flags['force-publish'].default).toEqual(false)
  expect(TheCommand.flags['force-publish'].exclusive).toEqual(['action', 'publish'])

  expect(typeof TheCommand.flags.open).toBe('object')
  expect(typeof TheCommand.flags.open.description).toBe('string')
  expect(TheCommand.flags.open.default).toEqual(false)

  expect(typeof TheCommand.flags.build).toBe('object')
  expect(typeof TheCommand.flags.build.description).toBe('string')
  expect(TheCommand.flags.build.default).toEqual(true)
  expect(TheCommand.flags.build.allowNo).toEqual(true)

  expect(typeof TheCommand.flags.actions).toBe('object')
  expect(typeof TheCommand.flags.actions.description).toBe('string')
  expect(TheCommand.flags.actions.default).toEqual(true)
  expect(TheCommand.flags.actions.allowNo).toEqual(true)
  expect(TheCommand.flags.actions.exclusive).toEqual(['action'])
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = cloneDeep(mockConfigData)
    command.appConfig.actions = { dist: 'actions' }
    command.appConfig.web.distProd = 'dist'
    command.config = { runCommand: jest.fn(), runHook: jest.fn() }
    command.buildOneExt = jest.fn()
    command.getAppExtConfigs = jest.fn()
    command.getLibConsoleCLI = jest.fn(() => mockLibConsoleCLI)
    command.getFullConfig = jest.fn().mockReturnValue({
      aio: {
        project: {
          workspace: {
            name: 'foo'
          }
        }
      }
    })

    mockRuntimeLib.deployActions.mockResolvedValue({ actions: [] })
    mockWebLib.bundle.mockResolvedValue({ run: mockBundleFunc })

    mockLogForwarding.isLocalConfigChanged.mockReturnValue(true)
    const config = new LogForwarding.LogForwardingConfig('destination', { field: 'value' })
    mockLogForwarding.getLocalConfigWithSecrets.mockReturnValue(config)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build & deploy an App with no flags', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App verbose', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, verbose: true }), expect.anything())
  })

  test('build & deploy --no-web-assets', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'web-assets': false }), expect.anything())
  })

  test('build & deploy only some actions using --action', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-web-assets', '-a', 'a', '-a', 'b', '--action', 'c']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)

    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'web-assets': false, action: ['a', 'b', 'c'] }), expect.anything())
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledWith(appConfig.application, {
      filterEntities: { actions: ['a', 'b', 'c'] }
    },
    expect.any(Function))
  })

  test('build & deploy only an action using --action and --no-publish', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-web-assets', '--action', 'c', '--no-publish']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)

    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'web-assets': false, action: ['c'] }), expect.anything())
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledWith(appConfig.application, {
      filterEntities: { actions: ['c'] }
    },
    expect.any(Function))
  })

  test('build & deploy actions with no actions folder and no manifest', async () => {
    command.appConfig.app.hasFrontend = true
    command.appConfig.app.hasBackend = false
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'web-assets': false }), expect.anything())
  })

  test('build & deploy actions with no actions folder but with a manifest', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --no-actions', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, actions: false }), expect.anything())
  })

  test('build & deploy with --no-actions with no static folder', async () => {
    command.appConfig.app.hasFrontend = false
    command.appConfig.app.hasBackend = false
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, actions: false }), expect.anything())
  })

  test('build & deploy with no manifest.yml', async () => {
    command.appConfig.app.hasFrontend = true
    command.appConfig.app.hasBackend = false
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true }), expect.anything())
  })

  test('--no-build', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-build']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--no-build --verbose', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-build', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--no-build --no-actions', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-build', '--no-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--no-build --no-web-assets', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-build', '--no-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--no-force-build', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    command.argv = ['--no-force-build']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': false }), expect.anything()) // force-build is true by default for build cmd
  })

  test.each([
    [['--no-log-forwarding-update']],
    [['--no-actions']],
    [['--no-log-forwarding-update', '--no-actions']]
  ])('no log forwarding update due to %s arg(s) specified', async (args) => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)
    command.argv = args
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(LogForwarding.init).toHaveBeenCalledTimes(0)
  })

  test('deploy should show ui url', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should open ui url with --open', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    cli.open = jest.fn()
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')

    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(cli.open).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    mockConfig.get.mockReturnValue('http://prefix?fake=')

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
  })

  test('deploy should show ui and open exc url if AIO_LAUNCH_PREFIX_URL is set and --open', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    mockConfig.get.mockReturnValue('http://prefix?fake=')
    cli.open = jest.fn()

    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
    expect(cli.open).toHaveBeenCalledWith('http://prefix?fake=https://example.com')
  })

  test('deploy should show action urls (web-export: true)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockRuntimeLib.deployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action', ...createWebExportAnnotation(true) },
        { name: 'pkg/actionNoUrl', ...createWebExportAnnotation(true) }
      ]
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('web actions:'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  })

  test('deploy should show action urls (web-export: false)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockRuntimeLib.deployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action', ...createWebExportAnnotation(false) },
        { name: 'pkg/actionNoUrl', ...createWebExportAnnotation(false) }
      ]
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('non-web actions:'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  })

  test('should fail if scripts.deployActions fails', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const error = new Error('mocklfailure')
    mockRuntimeLib.deployActions.mockRejectedValue(error)

    await expect(command.run()).rejects.toEqual(error)
    expect(command.buildOneExt).toHaveBeenCalled()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.deployWeb fails', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const error = new Error('mock failure')
    mockRuntimeLib.deployActions.mockResolvedValue({ actions: [] })
    mockWebLib.deployWeb.mockRejectedValue(error)

    await expect(command.run()).rejects.toEqual(error)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('should fail if log forwarding config is invalid', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const error = new Error('mock failure')
    mockLogForwarding.getLocalConfigWithSecrets.mockImplementation(() => { throw error })
    await expect(command.run()).rejects.toEqual(error)
  })

  test('should fail if log forwarding update fails', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const error = new Error('mock failure')
    mockLogForwarding.updateServerConfig.mockImplementation(() => { throw error })
    await expect(command.run()).rejects.toEqual(error)
  })

  test('spinner should be called for progress logs on deployWeb call , with verbose', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockRuntimeLib.deployActions.mockResolvedValue({ actions: [] })
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })

    command.argv = ['-v']
    await command.run()
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on deployWeb call , without verbose', async () => {
    command.appConfig.web = { injectedConfig: 'sdf' }
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    mockRuntimeLib.deployActions.mockResolvedValue({ actions: [] })
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })

    await command.run()
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('deploy (--no-actions and --no-web-assets) for application - nothing to be done', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--no-actions', '--no-web-assets']
    await command.run()

    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.error).toHaveBeenCalledWith('Nothing to be done 🚫')
  })

  test('deploy (--no-actions and --no-web-assets) for extension - publish', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'exc'))
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'foo'
          }
        }
      }
    })
    mockExtRegExcShellPayload()
    const noScriptFound = undefined
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--no-actions', '--no-web-assets']
    await command.run()

    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(1)
  })

  test('deploy (--no-actions)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--no-actions']
    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('deploy (--no-web-assets)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--no-web-assets']
    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('deploy (has deploy-actions and deploy-static hooks)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    const childProcess = {}
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(childProcess) // deploy-actions (uses hook)
      .mockResolvedValueOnce(childProcess) // deploy-static (uses hook)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    mockRuntimeLib.deployActions.mockResolvedValue({ actions: [] })
    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('deploy (pre and post hooks have errors)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    helpers.runInProcess
      .mockRejectedValueOnce('error-pre-app-deploy') // pre-app-deploy

    command.error.mockImplementationOnce((msg) => { throw new Error(msg) })
    command.argv = ['--feature-event-hooks']
    await expect(command.run()).rejects.toThrowError('error-pre-app-deploy')

    expect(helpers.runInProcess).toHaveBeenCalledTimes(1)
    expect(command.config.runHook).not.toHaveBeenCalled()
    expect(mockRuntimeLib.deployActions).not.toHaveBeenCalled()
    expect(mockWebLib.deployWeb).not.toHaveBeenCalled()
  })

  test('deploy (post hooks have errors)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    helpers.runInProcess
      .mockResolvedValueOnce('error-pre-app-deploy') // pre-app-deploy
      .mockResolvedValueOnce(undefined) // deploy-actions
      .mockResolvedValueOnce(undefined) // deploy-static
      .mockRejectedValueOnce('error-post-app-deploy') // post-app-deploy

    command.error.mockImplementationOnce((msg) => { throw new Error(msg) })
    command.argv = ['--feature-event-hooks']
    await expect(command.run()).rejects.toThrowError('error-post-app-deploy')

    expect(command.config.runHook).toHaveBeenCalledWith('deploy-actions',
      expect.objectContaining({
        appConfig: expect.any(Object),
        filterEntities: [],
        isLocalDev: false
      }))
    expect(command.config.runHook).toHaveBeenCalledTimes(2)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('deploy (deploy-actions hook has an error)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy (no error)
      .mockRejectedValueOnce('error-deploy-actions') // deploy-actions (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // deploy-static (will not reach here)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy (will not reach here)

    await expect(command.run()).rejects.toEqual('error-deploy-actions')
    expect(command.log).toHaveBeenCalledTimes(0)
  })

  test('deploy (deploy-static hook has an error)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runInProcess
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy (no error)
      .mockResolvedValueOnce(noScriptFound) // deploy-actions (uses inbuilt, no error)
      .mockRejectedValueOnce('error-deploy-static') // deploy-static (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy (will not reach here)

    await expect(command.run()).rejects.toEqual('error-deploy-static')
    expect(command.log).toHaveBeenCalledTimes(0)
  })

  test('nothing to be published (--no-publish, --no-web-assets, --no-actions)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-publish', '--no-web-assets', '--no-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith(expect.stringMatching(/Nothing to be done/))
  })

  test('deploy for standalone app --no-publish (no login)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'exc'))
    mockGetExtensionPointsPublishedApp()
    mockGetProject()
    command.getFullConfig.mockResolvedValue({
      aio: {
      }
    })
    mockExtRegExcShellPayload()
    command.argv = ['--no-publish']
    await command.run()

    expect(mockLibConsoleCLI.getProject).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.getApplicationExtensions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(0)
  })

  test('deploy for PUBLISHED Production extension - no publish', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'exc'))
    mockGetExtensionPointsPublishedApp()
    mockGetProject()
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'Production'
          },
          org: {
            id: '1111'
          }
        }
      }
    })
    mockExtRegExcShellPayload()
    await command.run()

    expect(mockLibConsoleCLI.getProject).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.getApplicationExtensions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(0)
  })

  test('deploy for PUBLISHED Production extension - force deploy', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'exc'))
    mockGetExtensionPointsPublishedApp()
    mockGetProject()
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'Production'
          },
          org: {
            id: '1111'
          }
        }
      }
    })
    mockExtRegExcShellPayload()
    command.argv = ['--force-deploy']
    await command.run()

    expect(mockLibConsoleCLI.getProject).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.getApplicationExtensions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(1)
  })

  test('deploy for Production legacy app', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'Production'
          },
          org: {
            id: '1111'
          }
        }
      }
    })
    command.argv = []
    await command.run()

    expect(mockLibConsoleCLI.getProject).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.getApplicationExtensions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(0)
  })

  test('deploy for RETRACTED Production extension - publish', async () => {
    mockLibConsoleCLI.getApplicationExtensions.mockReset()

    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'exc'))
    mockGetExtensionPointsRetractedApp()
    mockGetProject()
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'Production'
          },
          org: {
            id: '1111'
          }
        }
      }
    })
    mockExtRegExcShellPayload()
    await command.run()

    expect(mockLibConsoleCLI.getProject).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.getApplicationExtensions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(1)
  })

  test('publish phase (no force, exc+nui payload)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'foo'
          }
        }
      }
    })
    mockExtRegExcShellAndNuiPayload()
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(helpers.buildExcShellViewExtensionMetadata).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(1)
  })

  test('publish phase (no force, nui payload + no view operation)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'foo'
          }
        }
      }
    })
    const payload = {
      endpoints: {
        'dx/excshell/1': {
          another: [
          ]
        }
      }
    }
    helpers.buildExtensionPointPayloadWoMetadata.mockReturnValueOnce(payload)
    mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites.mockReturnValueOnce(payload)
    mockLibConsoleCLI.updateExtensionPoints.mockReturnValueOnce(payload)
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(helpers.buildExcShellViewExtensionMetadata).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(1)
  })

  test('publish phase (--force-publish, exc+nui payload)', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig, 'exc'))
    command.getFullConfig.mockResolvedValue({
      aio: {
        project: {
          workspace: {
            name: 'foo'
          }
        }
      }
    })

    mockExtRegExcShellAndNuiPayload()
    command.argv = ['--force-publish']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(helpers.buildExcShellViewExtensionMetadata).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(1)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(0)
  })

  test('app hook sequence', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockResolvedValueOnce(appConfig)

    // set hooks (command the same as hook name, for easy reference)
    appConfig.application.hooks = {
      'pre-app-deploy': 'pre-app-deploy',
      'deploy-actions': 'deploy-actions',
      'deploy-static': 'deploy-static',
      'post-app-deploy': 'post-app-deploy'
    }

    const scriptSequence = []
    helpers.runInProcess.mockImplementation(script => {
      scriptSequence.push(script)
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)

    expect(helpers.runInProcess).toHaveBeenCalledTimes(4)
    expect(scriptSequence.length).toEqual(4)
    expect(scriptSequence[0]).toEqual('pre-app-deploy')
    expect(scriptSequence[1]).toEqual('deploy-actions')
    expect(scriptSequence[2]).toEqual('deploy-static')
    expect(scriptSequence[3]).toEqual('post-app-deploy')
  })

  test('should update log forwarding on server when local config is defined', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const expectedConfig = new LogForwarding.LogForwardingConfig('destination', { field: 'value' })
    await command.run()
    expect(mockLogForwarding.updateServerConfig).toBeCalledWith(expectedConfig)
  })

  test('log forwarding is not updated on server when local config is absent', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const config = new LogForwarding.LogForwardingConfig()
    mockLogForwarding.getLocalConfigWithSecrets.mockReturnValue(config)
    await command.run()
    expect(mockLogForwarding.updateServerConfig).toBeCalledTimes(0)
  })

  test('log forwarding is not updated on server when local config is absent --verbose', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    const config = new LogForwarding.LogForwardingConfig()
    mockLogForwarding.getLocalConfigWithSecrets.mockReturnValue(config)
    command.argv = ['--verbose']
    await command.run()
    expect(mockLogForwarding.updateServerConfig).toBeCalledTimes(0)
  })

  test('log forwarding is not updated on server when local config not changed', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    mockLogForwarding.isLocalConfigChanged.mockReturnValue(false)
    await command.run()
    expect(mockLogForwarding.updateServerConfig).toBeCalledTimes(0)
  })

  test('does NOT fire `event` hooks when feature flag is NOT enabled', async () => {
    const runHook = jest.fn()
    command.config = { runHook }
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    command.argv = []
    await command.run()
    expect(command.error).not.toHaveBeenCalled()
    expect(runHook).not.toHaveBeenCalledWith('pre-deploy-event-reg')
    expect(runHook).not.toHaveBeenCalledWith('post-deploy-event-reg')
  })

  test('DOES fire `event` hooks when feature flag IS enabled', async () => {
    const runHook = jest.fn()
    command.config = { runHook }
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    command.argv = ['--feature-event-hooks']
    await command.run()
    expect(command.error).not.toHaveBeenCalled()
    expect(runHook).toHaveBeenCalledWith('pre-deploy-event-reg', expect.any(Object))
    expect(runHook).toHaveBeenCalledWith('post-deploy-event-reg', expect.any(Object))
  })

  test('handles error and exits when first hook fails', async () => {
    const runHook = jest.fn().mockResolvedValueOnce({
      successes: [],
      failures: [{ plugin: { name: 'ifailedu' }, error: 'some error' }]
    })
    command.config = { runHook }
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    command.argv = ['--feature-event-hooks']
    await command.run()
    expect(runHook).toHaveBeenCalledWith('pre-deploy-event-reg', expect.any(Object))
    // technically, I think only the first hook should be called -jm
    expect(runHook).toHaveBeenCalledWith('post-deploy-event-reg', expect.any(Object))
    expect(command.error).toHaveBeenCalledTimes(1)
  })

  test('handles error and exits when second hook fails', async () => {
    const runHook = jest.fn()
      .mockResolvedValueOnce({
        successes: [{ plugin: { name: 'imsuccess' }, result: 'some string' }],
        failures: []
      })
      .mockResolvedValueOnce({
        successes: [],
        failures: [{ plugin: { name: 'ifailedu' }, error: 'some error' }]
      })
    command.config = { runHook }
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    command.argv = ['--feature-event-hooks']
    await command.run()
    expect(runHook).toHaveBeenCalledWith('pre-deploy-event-reg', expect.any(Object))
    expect(runHook).toHaveBeenCalledWith('post-deploy-event-reg', expect.any(Object))
    expect(command.error).toHaveBeenCalledTimes(1)
  })

  test('handles error and exits when third hook fails', async () => {
    const runHook = jest.fn()
      .mockResolvedValueOnce({
        successes: [{ plugin: { name: 'imsuccess' }, result: 'some string' }],
        failures: []
      })
      .mockResolvedValueOnce({
        successes: [{ plugin: { name: 'imsuccess' }, result: 'some string' }],
        failures: []
      })
      .mockResolvedValueOnce({
        successes: [],
        failures: [{ plugin: { name: 'ifailedu' }, error: 'some error' }]
      })
    command.config = { runHook }
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    command.argv = ['--feature-event-hooks']
    await command.run()
    expect(runHook).toHaveBeenCalledWith('pre-deploy-event-reg', expect.any(Object))
    expect(runHook).toHaveBeenCalledWith('post-deploy-event-reg', expect.any(Object))
    expect(command.error).toHaveBeenCalledTimes(1)
  })
})
