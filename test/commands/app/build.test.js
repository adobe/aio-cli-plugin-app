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

const TheCommand = require('../../../src/commands/app/build')
const BaseCommand = require('../../../src/BaseCommand')
const path = require('path')
const cloneDeep = require('lodash.clonedeep')
const dataMocks = require('../../data-mocks/config-loader')

const ora = require('ora')
jest.mock('ora')

const mockFS = require('fs-extra')
jest.mock('fs-extra')

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

const mockWebLib = require('@adobe/aio-lib-web')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const mockBundleFunc = jest.fn()

jest.mock('@adobe/aio-lib-core-config')

jest.mock('cli-ux')

const sampleAppConfig = {
  app: {
    hasFrontend: true,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app',
    hostname: 'adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        __APP_PACKAGE__: {
          license: 'Apache-2.0',
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:12'
            },
            'action-zip': {
              function: 'actions/action-zip',
              web: 'yes',
              runtime: 'nodejs:12'
            }
          },
          sequences: {
            'action-sequence': { actions: 'action, action-zip', web: 'yes' }
          },
          triggers: { trigger1: null },
          rules: {
            rule1: { trigger: 'trigger1', action: 'action', rule: true }
          },
          apis: {
            api1: {
              base: { path: { action: { method: 'get' } } }
            }
          },
          dependencies: { dependency1: { location: 'fake.com/package' } }
        }
      }
    },
    package: {
      license: 'Apache-2.0',
      actions: {
        action: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:12'
        },
        'action-zip': {
          function: 'actions/action-zip',
          web: 'yes',
          runtime: 'nodejs:12'
        }
      },
      sequences: {
        'action-sequence': { actions: 'action, action-zip', web: 'yes' }
      },
      triggers: { trigger1: null },
      rules: { rule1: { trigger: 'trigger1', action: 'action', rule: true } },
      apis: {
        api1: {
          base: { path: { action: { method: 'get' } } }
        }
      },
      dependencies: { dependency1: { location: 'fake.com/package' } }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: path.resolve('test/__fixtures__/sample-app')
}

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

beforeEach(() => {
  mockWebLib.deployWeb.mockReset()
  mockWebLib.bundle.mockReset()
  mockBundleFunc.mockReset()
  mockWebLib.bundle.mockResolvedValue({ run: mockBundleFunc })
  mockFS.existsSync.mockReset()
  helpers.writeConfig.mockReset()
  helpers.runScript.mockReset()
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
  expect(TheCommand.flags.action.multiple).toBe(true)
  expect(typeof TheCommand.flags.action.description).toBe('string')
  expect(TheCommand.flags.action.exclusive).toEqual(['extension'])

  expect(typeof TheCommand.flags['skip-actions']).toBe('object')
  expect(typeof TheCommand.flags['skip-actions'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-static']).toBe('object')
  expect(typeof TheCommand.flags['skip-static'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-web-assets']).toBe('object')
  expect(typeof TheCommand.flags['skip-web-assets'].description).toBe('string')

  expect(typeof TheCommand.flags.actions).toBe('object')
  expect(typeof TheCommand.flags.actions.description).toBe('string')
  expect(TheCommand.flags.actions.exclusive).toEqual(['action'])

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
  expect(TheCommand.flags.extension.exclusive).toEqual(['action'])
})

let spinner

describe('run', () => {
  let command
  beforeEach(() => {
    spinner = ora()
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getAppExtConfigs = jest.fn()
    command.appConfig = cloneDeep(sampleAppConfig)

    mockRuntimeLib.buildActions.mockReset()
    mockRuntimeLib.buildActions.mockReturnValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build should write to config.json', async () => {
    command.appConfig.ow.defaultApihost = global.defaultOwApihost
    command.appConfig.app.defaultHostname = global.defaultAppHostName

    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    const mockUtils = mockRuntimeLib.utils
    mockRuntimeLib.utils = jest.requireActual('@adobe/aio-lib-runtime').utils
    await command.run()
    mockRuntimeLib.utils = mockUtils

    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
    expect(helpers.writeConfig).toHaveBeenCalledWith('/web-src/src/config.json', { action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action', 'action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence', 'action-zip': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip' })
  })

  test('build & deploy an App with no flags', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledWith('/web-src/index.html', '/dist/web-src-prod',
      expect.objectContaining({ shouldDisableCache: true, shouldContentHash: true, logLevel: 'warn', shouldOptimize: false }),
      expect.any(Function)
    )
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App with --no-content-hash', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-content-hash']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledWith('/web-src/index.html', '/dist/web-src-prod',
      expect.objectContaining({ shouldDisableCache: true, shouldContentHash: false, logLevel: 'warn', shouldOptimize: false }),
      expect.any(Function)
    )
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App with --no-content-hash --verbose', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-content-hash', '-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledWith('/web-src/index.html', '/dist/web-src-prod',
      expect.objectContaining({ shouldDisableCache: true, shouldContentHash: false, logLevel: 'verbose', shouldOptimize: false }),
      expect.any(Function)
    )
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App with no force-build but build exists', async () => {
    command.appConfig.actions.dist = 'actions'
    command.appConfig.web.distProd = 'dist'
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--no-force-build']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy an App verbose', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('build & deploy --skip-static', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy --skip-web-assets', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))
    command.argv = ['--skip-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy only some actions using --action', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)
    command.argv = ['--skip-static', '-a', 'a', '-a=b', '--action', 'c']
    mockRuntimeLib.buildActions.mockReturnValue(['a', 'b', 'c'])
    await command.run()
    expect(spinner.start).toBeCalledWith('Building actions for \'application\'')
    expect(spinner.succeed).toBeCalledWith(expect.stringContaining('Built 3 action(s) for \'application\''))
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledWith(appConfig.application, ['a', 'b', 'c'])
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy actions with no backend', async () => {
    command.appConfig.app.hasFrontend = true
    command.appConfig.app.hasBackend = false
    command.appConfig.web.src = 'web-src'
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
  })

  test('build & deploy with --skip-actions with no frontend', async () => {
    command.appConfig.app.hasFrontend = false
    command.appConfig.app.hasBackend = true
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('should fail if scripts.buildActions fails', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure')
    mockRuntimeLib.buildActions.mockRejectedValue(error)
    await expect(command.run()).rejects.toThrow(error)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('spinner should be called for progress logs on bundle call , with verbose', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    command.argv = ['-v']
    await command.run()
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on bundle call , without verbose', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    await command.run()
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('app hook sequence', async () => {
    const appConfig = createAppConfig(command.appConfig)
    command.getAppExtConfigs.mockReturnValueOnce(appConfig)

    // set hooks (command the same as hook name, for easy reference)
    appConfig.application.hooks = {
      'pre-app-build': 'pre-app-build',
      'build-actions': 'build-actions',
      'build-static': 'build-static',
      'post-app-build': 'post-app-build'
    }

    const scriptSequence = []
    helpers.runScript.mockImplementation(script => {
      scriptSequence.push(script)
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)

    expect(helpers.runScript).toHaveBeenCalledTimes(4)
    expect(scriptSequence.length).toEqual(4)
    expect(scriptSequence[0]).toEqual('pre-app-build')
    expect(scriptSequence[1]).toEqual('build-actions')
    expect(scriptSequence[2]).toEqual('build-static')
    expect(scriptSequence[3]).toEqual('post-app-build')
  })

  test('build (--skip-actions and --skip-static)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith(expect.stringMatching(/Nothing to be done/))
  })

  test('build (--skip-actions)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    mockWebLib.bundle.mockImplementation((a, b, c, log) => {
      log('ok')
      return { run: mockBundleFunc }
    })

    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
  })

  test('build (--skip-actions, --verbose) (coverage)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    mockWebLib.bundle.mockImplementation((a, b, c, log) => {
      log('ok')
      return { run: mockBundleFunc }
    })

    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
  })

  test('build (--skip-static)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
  })

  test('build (has build-actions and build-static hooks)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    const noScriptFound = undefined
    const childProcess = {}
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(childProcess) // build-actions (uses hook)
      .mockResolvedValueOnce(childProcess) // build-static (uses hook)
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
  })

  test('build (pre and post hooks have errors, --skip-actions and --skip-static)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    helpers.runScript
      .mockRejectedValueOnce('error-pre-app-build') // pre-app-build (logs error)
      .mockRejectedValueOnce('error-post-app-build') // post-app-build (logs error)

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1) // nothing to be done, because of the flags
    expect(command.error).toHaveBeenCalledWith(expect.stringMatching(/Nothing to be done/))
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(2)
    expect(command.log).toHaveBeenCalledWith('error-pre-app-build')
    expect(command.log).toHaveBeenCalledWith('error-post-app-build')
  })

  test('build (build-actions hook has an error)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    const errorString = 'error-build-actions'
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build (no error)
      .mockRejectedValueOnce(errorString) // build-actions (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // build-static (will not reach here)
      .mockResolvedValueOnce(noScriptFound) // post-app-build (will not reach here)

    await expect(command.run()).rejects.toEqual(errorString)
  })

  test('build (build-static hook has an error)', async () => {
    command.getAppExtConfigs.mockReturnValueOnce(createAppConfig(command.appConfig))

    const errorString = 'error-build-static'
    const noScriptFound = undefined
    helpers.runScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build (no error)
      .mockResolvedValueOnce(noScriptFound) // build-actions (uses inbuilt, no error)
      .mockRejectedValueOnce(errorString) // build-static (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // post-app-build (will not reach here)

    await expect(command.run()).rejects.toEqual(errorString)
  })
})
