/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../src/commands/app/clean')
const BaseCommand = require('../../../src/BaseCommand')
const cloneDeep = require('lodash.clonedeep')
const fs = require('fs-extra')
jest.mock('fs-extra')

const ora = require('ora')
jest.mock('ora')

const path = require('node:path')
const dataMocks = require('../../data-mocks/config-loader')

const sampleAppConfig = {
  pjson: {
    name: 'sample-app',
    version: '1.0.0',
    description: 'Sample aio app',
  },
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
  actions: { src: '/actions', dist: '/dist/actions', isLocal: true },
  root: path.resolve('test/__fixtures__/sample-app')
}

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

let command
let spinner
beforeEach(() => {
  jest.clearAllMocks()
  spinner = ora()
  command = new TheCommand([])
  command.error = jest.fn()
  command.log = jest.fn()
  command.getAppExtConfigs = jest.fn()
  command.appConfig = cloneDeep(sampleAppConfig)
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.description).toBe('string')
  })

  test('args', async () => {
    expect(TheCommand.args).toEqual({})
  })
})

describe('bad flags', () => {
  test('unknown flag', async () => {
    const errorMessage = 'Nonexistent flag: --wtf\nSee more help with --help'
    command.argv = ['--wtf']
    await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(errorMessage) }))
  })

  test('unknown arg', async () => {
    const errorMessage = 'Unexpected argument: */*.txt'
    command.argv = ['*/*.txt']
    await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(errorMessage) }))
  })
})

describe('cleans various app types', () => {
  test('cleans a legacy app', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    await command.run()
    expect(fs.remove).toHaveBeenCalledTimes(5)
    expect(fs.remove).toHaveBeenCalledWith(sampleAppConfig.actions.dist)
    expect(fs.remove).toHaveBeenCalledWith(sampleAppConfig.web.distDev)
    expect(fs.remove).toHaveBeenCalledWith(sampleAppConfig.web.distProd)
    expect(fs.remove).toHaveBeenCalledWith(path.join(sampleAppConfig?.root, 'dist', 'last-built-actions.json'))
    expect(fs.remove).toHaveBeenCalledWith(path.join(sampleAppConfig?.root, 'dist', 'last-deployed-actions.json'))
  })

  test('cleans an extension app', async () => {
    command.getAppExtConfigs.mockResolvedValueOnce(createAppConfig(command.appConfig))
    await command.run()
    expect(fs.remove).toHaveBeenCalledTimes(5)
    expect(fs.remove).toHaveBeenCalledWith(sampleAppConfig.actions.dist)
    expect(fs.remove).toHaveBeenCalledWith(sampleAppConfig.web.distDev)
    expect(fs.remove).toHaveBeenCalledWith(sampleAppConfig.web.distProd)
    expect(fs.remove).toHaveBeenCalledWith(path.join(sampleAppConfig?.root, 'dist', 'last-built-actions.json'))
    expect(fs.remove).toHaveBeenCalledWith(path.join(sampleAppConfig?.root, 'dist', 'last-deployed-actions.json'))
  })

//   test('cleans an app with a frontend', async () => {
//     return expect(1).toBeTruthy()
//   })

//   test('cleans an app with a backend', async () => {
//     return expect(1).toBeTruthy()
//   })

//   test('cleans an app with a frontend and backend', async () => {
//     return expect(1).toBeTruthy()
//   })

//   test('cleans a legacy app', async () => {
//     return expect(1).toBeTruthy()
//   })

//   test('cleans an exc app', async () => {
//     return expect(1).toBeTruthy()
//   })

//   test('cleans an app with multiple extensions', async () => {
//     return expect(1).toBeTruthy()
//   })
})
