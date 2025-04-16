/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const runDev = require('../../../src/lib/run-dev')
const cloneDeep = require('lodash.clonedeep')
const dataMocks = require('../../data-mocks/config-loader')
const defaults = require('../../../src/lib/defaults')
const getPort = require('get-port')

const { bundle } = require('@adobe/aio-lib-web')
const bundleServe = require('../../../src/lib/bundle-serve')
const serve = require('../../../src/lib/serve')
const Cleanup = require('../../../src/lib/cleanup')
const buildActions = require('../../../src/lib/build-actions')
const deployActions = require('../../../src/lib/deploy-actions')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const logPoller = require('../../../src/lib/log-poller')
const appHelper = require('../../../src/lib/app-helper')
const actionsWatcher = require('../../../src/lib/actions-watcher')

jest.mock('../../../src/lib/actions-watcher')
jest.mock('../../../src/lib/app-helper')
jest.mock('../../../src/lib/cleanup')
jest.mock('../../../src/lib/bundle-serve')
jest.mock('../../../src/lib/serve')
jest.mock('../../../src/lib/build-actions')
jest.mock('../../../src/lib/deploy-actions')
jest.mock('../../../src/lib/log-poller')
jest.mock('get-port')

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

const DATA_DIR = 'data-dir'
const FRONTEND_URL = `https://localhost:${defaults.defaultHttpServerPort}`

/// START OF TESTS /////////////////////

beforeEach(() => {
  buildActions.mockReset()
  deployActions.mockReset()
  bundle.mockReset()
  serve.mockReset()
  bundleServe.mockReset()
  actionsWatcher.mockReset()
  logPoller.run.mockReset()
  mockRuntimeLib.utils.getActionUrls.mockReset()
  mockRuntimeLib.utils.checkOpenWhiskCredentials.mockReset()

  appHelper.runScript.mockReset()
  getPort.mockReset()

  getPort.mockImplementation(() => {
    return defaults.defaultHttpServerPort
  })

  logPoller.run.mockImplementation(() => ({
    cleanup: jest.fn()
  }))

  actionsWatcher.mockImplementation(() => ({
    cleanup: jest.fn()
  }))

  bundle.mockImplementation(() => ({
    bundler: {},
    cleanup: jest.fn()
  }))
  serve.mockImplementation(() => ({
    url: FRONTEND_URL,
    cleanup: jest.fn()
  }))
  bundleServe.mockImplementation(() => ({
    url: FRONTEND_URL,
    cleanup: jest.fn()
  }))

  Cleanup.mockImplementation(() => {
    return {
      add: jest.fn(),
      run: jest.fn(),
      wait: jest.fn()
    }
  })
})

test('no parameters (exception before processing)', async () => {
  const result = runDev()
  await expect(result).rejects.toThrow()
})

test('port to use', async () => {
  const config = cloneDeep(createAppConfig().application)

  // use default port
  getPort.mockImplementationOnce(params => {
    expect(params.port).toEqual(defaults.defaultHttpServerPort)
  })
  await runDev(config, DATA_DIR)

  // set PORT env var
  const oldPort = process.env.PORT
  process.env.PORT = 1234
  getPort.mockImplementationOnce(params => {
    expect(params.port).toEqual(1234)
  })
  await runDev(config, DATA_DIR)
  process.env.PORT = oldPort

  // coverage: getPort returns some different port to use (than the one expected)
  getPort.mockImplementationOnce(_ => {
    return 4567
  })
  await runDev(config, DATA_DIR)
})

test('isLocal false, build-static hook set, serve-static hook set)', async () => {
  const config = cloneDeep(createAppConfig().application)
  // script contents are the hook names, for easy reference
  config.hooks['build-static'] = 'build-static'
  config.hooks['serve-static'] = 'serve-static'

  appHelper.runScript.mockImplementation(script => {
    if (script === 'build-static' || script === 'serve-static') {
      return {}
    }
  })

  const result = runDev(config, DATA_DIR)
  await expect(result).resolves.toEqual(undefined) // since serve-static is an app hook

  expect(buildActions).toHaveBeenCalled()
  expect(deployActions).toHaveBeenCalled()
  expect(bundle).not.toHaveBeenCalled()
  expect(serve).not.toHaveBeenCalled()
  expect(bundleServe).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).toHaveBeenCalled()
})

test('isLocal false, build-static hook set, serve-static hook not set)', async () => {
  const config = cloneDeep(createAppConfig().application)
  // script contents are the hook names, for easy reference
  config.hooks['build-static'] = 'build-static'

  appHelper.runScript.mockImplementation(script => {
    if (script === 'build-static') {
      return {}
    }
  })

  const result = runDev(config, DATA_DIR, { })
  await expect(result).resolves.toEqual(FRONTEND_URL) // we use our own serve

  expect(buildActions).toHaveBeenCalled()
  expect(deployActions).toHaveBeenCalled()
  expect(bundle).not.toHaveBeenCalled()
  expect(serve).toHaveBeenCalled()
  expect(bundleServe).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).toHaveBeenCalled()
})

test('fetchLogs true)', async () => {
  const config = cloneDeep(createAppConfig().application)

  const result = runDev(config, DATA_DIR, { fetchLogs: true })
  await expect(result).resolves.toEqual(FRONTEND_URL) // we use our own serve

  expect(buildActions).toHaveBeenCalled()
  expect(deployActions).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalled()
  expect(logPoller.run).toHaveBeenCalled()
  expect(actionsWatcher).toHaveBeenCalled()
})

test('fetchLogs false)', async () => {
  const config = cloneDeep(createAppConfig().application)

  const result = runDev(config, DATA_DIR, { fetchLogs: false })
  await expect(result).resolves.toEqual(FRONTEND_URL) // we use our own serve

  expect(buildActions).toHaveBeenCalled()
  expect(deployActions).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).toHaveBeenCalled()
})

test('runDev does not always force builds', async () => {
  const config = cloneDeep(createAppConfig().application)

  await runDev(config, DATA_DIR)

  expect(buildActions).toHaveBeenCalled()
  expect(buildActions).toHaveBeenCalledWith(expect.any(Object) /* config */,
    null /* filterActions */,
    false /* forceBuild */)
})

test('calls cleanup on exception - hasBackend:false', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = true
  config.app.hasBackend = false

  Cleanup.mockImplementation(() => {
    const fns = []
    return {
      add: jest.fn((fn) => {
        fns.push(fn)
      }),
      run: jest.fn(() => {
        fns.forEach(fn => fn())
      }),
      wait: jest.fn(() => {
        throw new Error('Expect the unexpected')
      })
    }
  })

  const result = runDev(config, DATA_DIR)
  await expect(result).rejects.toThrow('Expect the unexpected')
})

test('calls cleanup on exception - hasFrontend:false', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = false
  config.app.hasBackend = false

  Cleanup.mockImplementation(() => {
    const fns = []
    return {
      add: jest.fn((fn) => {
        fns.push(fn)
      }),
      run: jest.fn(() => {
        fns.forEach(fn => fn())
      }),
      wait: jest.fn(() => {
        throw new Error('Expect the unexpected')
      })
    }
  })

  const result = runDev(config, DATA_DIR)
  await expect(result).rejects.toThrow('Expect the unexpected')
})

test('calls cleanup on exception - hasBackend && !skipActions', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = false
  config.app.hasBackend = true

  Cleanup.mockImplementation(() => {
    const fns = []
    return {
      add: jest.fn((fn) => {
        fns.push(fn)
      }),
      run: jest.fn(() => {
        fns.forEach(fn => fn())
      }),
      wait: jest.fn(() => {
        throw new Error('Expect the unexpected')
      })
    }
  })

  const result = runDev(config, DATA_DIR, { skipActions: false })
  await expect(result).rejects.toThrow('Expect the unexpected')
})

test('calls cleanup on exception - hasFrontend && !skipActions && skipServe && fetchLogs: true', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = true
  config.app.hasBackend = true

  Cleanup.mockImplementation(() => {
    const fns = []
    return {
      add: jest.fn((fn) => {
        fns.push(fn)
      }),
      run: jest.fn(() => {
        fns.forEach(fn => fn())
      }),
      wait: jest.fn(() => {
        throw new Error('Expect the unexpected')
      })
    }
  })

  const result = runDev(config, DATA_DIR, { skipActions: false, skipServe: true, fetchLogs: true })
  await expect(result).rejects.toThrow('Expect the unexpected')
})

test('calls cleanup on exception)', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = true
  config.app.hasBackend = true

  Cleanup.mockImplementation(() => {
    const fns = []
    return {
      add: jest.fn((fn) => {
        fns.push(fn)
      }),
      run: jest.fn(() => {
        fns.forEach(fn => fn())
      }),
      wait: jest.fn(() => {
        throw new Error('Expect the unexpected')
      })
    }
  })

  const result = runDev(config, DATA_DIR, { skipActions: true })
  await expect(result).rejects.toThrow('Expect the unexpected')
})
