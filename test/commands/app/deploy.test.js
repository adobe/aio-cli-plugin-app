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

jest.mock('../../../src/lib/config-loader', () => {
  return () => mockConfigData
})

jest.mock('cli-ux')
const { cli } = require('cli-ux')

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

const mockLibConsoleCLI = {
  updateExtensionPoints: jest.fn(),
  updateExtensionPointsWithoutOverwrites: jest.fn()
}

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  helpers.writeConfig.mockReset()
  helpers.runScript.mockReset()
  helpers.buildExtensionPointPayloadWoMetadata.mockReset()
  helpers.buildExcShellViewExtensionMetadata.mockReset()
  jest.restoreAllMocks()

  helpers.wrapError.mockImplementation(msg => msg)
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
  expect(TheCommand.flags.action.exclusive).toEqual(['extension'])

  expect(typeof TheCommand.flags['skip-actions']).toBe('object')
  expect(typeof TheCommand.flags['skip-actions'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-static']).toBe('object')
  expect(typeof TheCommand.flags['skip-static'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-web-assets']).toBe('object')
  expect(typeof TheCommand.flags['skip-web-assets'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-deploy']).toBe('object')
  expect(typeof TheCommand.flags['skip-deploy'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-build']).toBe('object')
  expect(typeof TheCommand.flags['skip-build'].description).toBe('string')

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
  expect(TheCommand.flags.publish.exclusive).toEqual(['action'])

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
    command.config = { runCommand: jest.fn() }
    command.buildOneExt = jest.fn()
    command.getAppExtConfigs = jest.fn()
    command.getLibConsoleCLI = jest.fn(() => mockLibConsoleCLI)
    command.getFullConfig = jest.fn()

    mockRuntimeLib.deployActions.mockResolvedValue({})
    mockWebLib.bundle.mockResolvedValue({ run: mockBundleFunc })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build & deploy an App with no flags', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    await command.run()
    // expect(command.error).toHaveBeenCalledWith(0)
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App verbose', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, verbose: true }), expect.anything())
  })

  test('build & deploy --skip-static', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'skip-static': true }), expect.anything())
  })

  test('build & deploy --skip-web-assets', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'skip-web-assets': true }), expect.anything())
  })

  test('build & deploy only some actions using --action', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-static', '-a', 'a', '-a', 'b', '--action', 'c']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)

    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'skip-static': true, action: ['a', 'b', 'c'] }), expect.anything())
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledWith(appConfig.application, {
      filterEntities: { actions: ['a', 'b', 'c'] }
    },
    expect.any(Function))
  })

  test('build & deploy actions with no actions folder and no manifest', async () => {
    command.appConfig.app.hasFrontend = true
    command.appConfig.app.hasBackend = false
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'skip-static': true }), expect.anything())
  })

  test('build & deploy actions with no actions folder but with a manifest', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'skip-actions': true }), expect.anything())
  })

  test('build & deploy with --skip-actions with no static folder', async () => {
    command.appConfig.app.hasFrontend = false
    command.appConfig.app.hasBackend = false
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, 'skip-actions': true }), expect.anything())
  })

  test('build & deploy with no manifest.yml', async () => {
    command.appConfig.app.hasFrontend = true
    command.appConfig.app.hasBackend = false
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true }), expect.anything())
  })

  test('--skip-deploy', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-deploy']
    await command.run()
    expect(command.error).not.toHaveBeenCalled()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true }), expect.anything())
  })

  test('--skip-deploy --verbose', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--skip-deploy', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': true, verbose: true }), expect.anything())
  })

  test('--skip-deploy --skip-static', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-deploy', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
  })

  test('--skip-build', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-build']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --verbose', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-build', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-actions', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-build', '--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-static', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-build', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.buildOneExt).toHaveBeenCalledTimes(0)
  })

  test('--no-force-build', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    command.argv = ['--no-force-build']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledTimes(1)
    expect(command.buildOneExt).toHaveBeenCalledWith('application', appConfig.application, expect.objectContaining({ 'force-build': false }), expect.anything()) // force-build is true by default for build cmd
  })

  test('deploy should show ui url', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should open ui url with --open', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    cli.open = jest.fn()
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')

    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(cli.open).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    mockConfig.get.mockReturnValue('http://prefix?fake=')

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
  })

  test('deploy should show ui and open exc url if AIO_LAUNCH_PREFIX_URL is set and --open', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
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

  test('deploy should show action urls', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    mockRuntimeLib.deployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action' },
        { name: 'pkg/actionNoUrl' }
      ]
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  })

  test('should fail if scripts.deployActions fails', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const error = new Error('mocklfailure')
    mockRuntimeLib.deployActions.mockRejectedValue(error)

    await expect(command.run()).rejects.toEqual(error)
    expect(command.buildOneExt).toHaveBeenCalled()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.deployWeb fails', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const error = new Error('mock failure')
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockRejectedValue(error)

    await expect(command.run()).rejects.toEqual(error)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on deployWeb call , with verbose', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
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
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })

    await command.run()
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('deploy (--skip-actions and --skip-static) for application - nothing to be done', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()

    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.error).toHaveBeenCalledWith('Nothing to be done 🚫')
  })

  test('deploy (--skip-actions and --skip-static) for extension - publish', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig, 'exc'))
    command.getFullConfig.mockReturnValue({
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
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()

    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPoints).toHaveBeenCalledTimes(0)
    expect(mockLibConsoleCLI.updateExtensionPointsWithoutOverwrites).toHaveBeenCalledTimes(1)
  })

  test('deploy (--skip-actions)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-actions']
    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('deploy (--skip-static)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-static']
    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('deploy (has deploy-actions and deploy-static hooks)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    const childProcess = {}
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(childProcess) // deploy-actions (uses hook)
      .mockResolvedValueOnce(childProcess) // deploy-static (uses hook)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('deploy (pre and post hooks have errors)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    helpers.runScript
      .mockRejectedValueOnce('error-pre-app-deploy') // pre-app-deploy
      .mockResolvedValueOnce(undefined) // deploy-actions
      .mockResolvedValueOnce(undefined) // deploy-static
      .mockRejectedValueOnce('error-post-app-deploy') // post-app-deploy

    command.argv = []
    await command.run()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledWith('error-pre-app-deploy')
    expect(command.log).toHaveBeenCalledWith('error-post-app-deploy')
  })

  test('deploy (deploy-actions hook has an error)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy (no error)
      .mockRejectedValueOnce('error-deploy-actions') // deploy-actions (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // deploy-static (will not reach here)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy (will not reach here)

    await expect(command.run()).rejects.toEqual('error-deploy-actions')
    expect(command.log).toHaveBeenCalledTimes(0)
  })

  test('deploy (deploy-static hook has an error)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy (no error)
      .mockResolvedValueOnce(noScriptFound) // deploy-actions (uses inbuilt, no error)
      .mockRejectedValueOnce('error-deploy-static') // deploy-static (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy (will not reach here)

    await expect(command.run()).rejects.toEqual('error-deploy-static')
    expect(command.log).toHaveBeenCalledTimes(0)
  })

  test('nothing to be published (--no-publish, --no-web-assets, --no-actions)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-publish', '--no-web-assets', '--no-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith(expect.stringMatching(/Nothing to be done/))
  })

  test('nothing to be done for exc (--no-publish, --no-build, --skip-deploy)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig, 'exc'))

    command.argv = ['--no-publish', '--no-build', '--skip-deploy']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith(expect.stringMatching(/Nothing to be done/))
  })

  test('publish phase (no force, exc+nui payload)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.getFullConfig.mockReturnValue({
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
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.getFullConfig.mockReturnValue({
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
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig, 'exc'))
    command.getFullConfig.mockReturnValue({
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
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    // set hooks (command the same as hook name, for easy reference)
    appConfig.application.hooks = {
      'pre-app-deploy': 'pre-app-deploy',
      'deploy-actions': 'deploy-actions',
      'deploy-static': 'deploy-static',
      'post-app-deploy': 'post-app-deploy'
    }

    const scriptSequence = []
    helpers.runScript.mockImplementation(script => {
      scriptSequence.push(script)
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)

    expect(helpers.runScript).toHaveBeenCalledTimes(4)
    expect(scriptSequence.length).toEqual(4)
    expect(scriptSequence[0]).toEqual('pre-app-deploy')
    expect(scriptSequence[1]).toEqual('deploy-actions')
    expect(scriptSequence[2]).toEqual('deploy-static')
    expect(scriptSequence[3]).toEqual('post-app-deploy')
  })
})
