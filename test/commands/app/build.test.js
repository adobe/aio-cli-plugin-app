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

const mockFS = require('fs-extra')

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
beforeEach(() => {
  mockWebLib.deployWeb.mockReset()
  mockWebLib.bundle.mockReset()
  mockBundleFunc.mockReset()
  mockWebLib.bundle.mockResolvedValue({ run: mockBundleFunc })
  mockFS.existsSync.mockReset()
  helpers.writeConfig.mockReset()
  helpers.runPackageScript.mockReset()
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
  expect(TheCommand.flags.action.exclusive).toEqual(['skip-actions'])

  expect(typeof TheCommand.flags['skip-actions']).toBe('object')
  expect(typeof TheCommand.flags['skip-actions'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-static']).toBe('object')
  expect(typeof TheCommand.flags['skip-static'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-web-assets']).toBe('object')
  expect(typeof TheCommand.flags['skip-web-assets'].description).toBe('string')
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = { app: { hasFrontend: true, hasBackend: true }, web: { injectedConfig: 'config.json' } }
    mockRuntimeLib.buildActions.mockReset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build should write to config.json', async () => {
    command.appConfig = sampleAppConfig
    command.appConfig.ow.defaultApihost = global.defaultOwApihost
    command.appConfig.app.defaultHostname = global.defaultAppHostName
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
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledWith('undefined/index.html', undefined,
      expect.objectContaining({ shouldDisableCache: true, shouldContentHash: true, logLevel: 'warn', shouldOptimize: false }),
      expect.any(Function)
    )
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App with --no-content-hash', async () => {
    command.argv = ['--no-content-hash']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledWith('undefined/index.html', undefined,
      expect.objectContaining({ shouldDisableCache: true, shouldContentHash: false, logLevel: 'warn', shouldOptimize: false }),
      expect.any(Function)
    )
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App with --no-content-hash --verbose', async () => {
    command.argv = ['--no-content-hash', '-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledWith('undefined/index.html', undefined,
      expect.objectContaining({ shouldDisableCache: true, shouldContentHash: false, logLevel: 'verbose', shouldOptimize: false }),
      expect.any(Function)
    )
    expect(mockBundleFunc).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App with no force-build but build exists', async () => {
    command.argv = ['--no-force-build']
    command.appConfig.actions = { dist: 'actions' }
    command.appConfig.web.distProd = 'dist'
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy an App verbose', async () => {
    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('build & deploy --skip-static', async () => {
    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy --skip-web-assets', async () => {
    command.argv = ['--skip-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy only some actions using --action', async () => {
    command.argv = ['--skip-static', '-a', 'a', '-a', 'b', '--action', 'c']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledWith(command.appConfig, ['a', 'b', 'c'])
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('build & deploy actions with no backend', async () => {
    command.appConfig = {
      app: {
        hasFrontend: true,
        hasBackend: false
      },
      web: {
        src: 'web-src'
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions', async () => {
    command.argv = ['--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
  })

  test('build & deploy with --skip-actions with no frontend', async () => {
    command.argv = ['--skip-actions']
    command.appConfig = { app: { hasFrontend: false, hasBackend: true } }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('should fail if scripts.buildActions fails', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure')
    mockRuntimeLib.buildActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(0)
  })

  test('spinner should be called for progress logs on bundle call , with verbose', async () => {
    mockWebLib.bundle.mockImplementation(async (config, onProgress) => {
      onProgress('progress log')
      return 'ok'
    })
    command.argv = ['-v']
    await command.run()
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on bundle call , without verbose', async () => {
    mockWebLib.bundle.mockImplementation(async (config, onProgress) => {
      onProgress('progress log')
      return 'ok'
    })
    await command.run()
    expect(mockWebLib.bundle).toHaveBeenCalledTimes(1)
  })

  test('build (--skip-actions and --skip-static)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Nothing to build/))
  })

  test('build (--skip-actions)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Build success, your app is ready to be deployed/))
  })

  test('build (--skip-actions) calls provided log function', async () => {
    mockWebLib.bundle.mockImplementation((a, b, c, log) => {
      log('ok')
      return { run: mockBundleFunc }
    })

    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Build success, your app is ready to be deployed/))
  })

  test('build (--skip-actions, --verbose) calls provided other log function', async () => {
    mockWebLib.bundle.mockImplementation((a, b, c, log) => {
      log('ok')
      return { run: mockBundleFunc }
    })

    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-actions', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Build success, your app is ready to be deployed/))
  })

  test('build (--skip-static)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Build success, your actions are ready to be deployed/))
  })

  test('build (has build-actions and build-static hooks)', async () => {
    const noScriptFound = undefined
    const childProcess = {}
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build
      .mockResolvedValueOnce(childProcess) // build-actions (uses hook)
      .mockResolvedValueOnce(childProcess) // build-static (uses hook)
      .mockResolvedValueOnce(noScriptFound) // post-app-build

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Build success, your app is ready to be deployed/))
  })

  test('build (pre and post hooks have errors, --skip-actions and --skip-static)', async () => {
    helpers.runPackageScript
      .mockRejectedValueOnce('error-pre-app-build') // pre-app-build (logs error)
      .mockRejectedValueOnce('error-post-app-build') // post-app-build (logs error)

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(3)
    expect(command.log).toHaveBeenCalledWith('error-pre-app-build')
    expect(command.log).toHaveBeenCalledWith('error-post-app-build')
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Nothing to build/))
  })

  test('build (build-actions hook has an error)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build (no error)
      .mockRejectedValueOnce('error-build-actions') // build-actions (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // build-static (will not reach here)
      .mockResolvedValueOnce(noScriptFound) // post-app-build (will not reach here)

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith('error-build-actions')

    expect(command.log).toHaveBeenCalledTimes(0)
  })

  test('build (build-static hook has an error)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-build (no error)
      .mockResolvedValueOnce(noScriptFound) // build-actions (uses inbuilt, no error)
      .mockRejectedValueOnce('error-build-static') // build-static (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // post-app-build (will not reach here)

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith('error-build-static')

    expect(command.log).toHaveBeenCalledTimes(0)
  })
})
