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

const TheCommand = require('../../../src/commands/app/get-url')
const BaseCommand = require('../../../src/BaseCommand')

const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const dataMocks = require('../../data-mocks/config-loader')
const { loadLocalDevConfig } = require('../../../src/lib/run-local-runtime')

const createFullConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig)
  return appConfig
}

beforeEach(() => {
  jest.clearAllMocks()
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
  expect(typeof TheCommand.flags.cdn).toBe('object')
  expect(typeof TheCommand.flags.cdn.description).toBe('string')

  expect(typeof TheCommand.flags.json).toBe('object')
  expect(typeof TheCommand.flags.json.description).toBe('string')

  expect(typeof TheCommand.flags.hson).toBe('object')
  expect(typeof TheCommand.flags.hson.description).toBe('string')

  expect(typeof TheCommand.flags.yml).toBe('object')
  expect(typeof TheCommand.flags.yml.description).toBe('string')
})

describe('run', () => {
  let command

  beforeEach(() => {
    mockRuntimeLib.utils.getActionUrls.mockReset()
    mockRuntimeLib.utils.getActionUrls.mockImplementation(jest.fn(
      (config, isRemoteDev, isLocalDev) => {
        if (isRemoteDev) {
          return {
            action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
          }
        }
        if (isLocalDev) {
          return {
            action: 'http://localhost:3233/api/v1/web/sample-app-1.0.0/action'
          }
        }
        // !isRemoteDev
        return {
          action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action'
        }
      }
    ))

    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = {}
    command.getFullConfig = jest.fn()
  })

  test('get all action urls', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)

    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
  })

  test('get empty action urls', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)

    const retVal = {
      runtime: {}
    }
    mockRuntimeLib.utils.getActionUrls.mockResolvedValue(undefined)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual(retVal)
  })

  test('get empty action urls -j', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)
    command.argv = ['--json']

    const retVal = { runtime: {} }
    mockRuntimeLib.utils.getActionUrls.mockResolvedValue({})
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual(retVal)
  })

  test('get empty action urls -y', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)
    command.argv = ['--yml']

    const retVal = { runtime: {} }
    mockRuntimeLib.utils.getActionUrls.mockResolvedValue({})
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual(retVal)
  })

  test('get empty action urls -h', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)
    command.argv = ['--hson']

    mockRuntimeLib.utils.getActionUrls.mockResolvedValue({})
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual({ runtime: {} })
  })

  test('get all action urls with cdn flag', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)
    command.argv = ['--cdn']

    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      },
      cdn: {
        action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.cdn.action))
  })

  test('get single action url', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)
    command.args = { action: 'action' }

    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
    })
    expect(urls).toEqual(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
  })

  test('get single action url with cdn flag', async () => {
    const appConfigParam = {
      manifest: {
        package: {
          actions: {
            action: {
            },
            action2: {
            }
          }
        }
      }
    }
    const appConfig = { ...createFullConfig(command.appConfig), ...appConfigParam }
    command.getFullConfig.mockResolvedValueOnce(appConfig)
    command.argv = ['action', '--cdn']
    // To check that only one action is sent to getActionUrls()
    delete appConfigParam.manifest.package.actions.action2
    const result = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      },
      cdn: {
        action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledTimes(2)
    Object.values(appConfig.all).forEach(config => {
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, true)
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(config, false)
    })

    expect(urls).toEqual(result)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.cdn.action))
  })

  test('get single action url with non existing action', async () => {
    command.appConfig = {
      manifest: {
        package: {
          actions: {
          }
        }
      }
    }
    command.getFullConfig.mockResolvedValueOnce(createFullConfig(command.appConfig))
    command.argv = ['invalid']

    await command.run()
    expect(command.error).toHaveBeenCalledWith(new Error('No action with name invalid found'))
  })

  test('get only cdn url', async () => {
    command.appConfig = {
      manifest: {
        package: {
          actions: {
          }
        }
      }
    }
    command.getFullConfig.mockResolvedValueOnce(createFullConfig(command.appConfig))
    command.argv = ['invalid']

    await command.run()
    expect(command.error).toHaveBeenCalledWith(new Error('No action with name invalid found'))
  })

  test('get local actions, --local', async () => {
    const appConfig = createFullConfig(command.appConfig)
    command.getFullConfig.mockResolvedValueOnce(appConfig)

    const res = {
      runtime: {
        action: 'http://localhost:3233/api/v1/web/sample-app-1.0.0/action'
      }
    }
    command.argv = ['--local']
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    Object.values(appConfig.all).forEach(config => {
      const localConfig = loadLocalDevConfig(config)
      expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledWith(localConfig, false, true)
    })
    expect(urls).toEqual(res)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
  })
})
