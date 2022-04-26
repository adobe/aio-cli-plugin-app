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
const { runLocalRuntime } = require('../../../src/lib/run-local-runtime')
const cloneDeep = require('lodash.clonedeep')
const dataMocks = require('../../data-mocks/config-loader')
const defaults = require('../../../src/lib/defaults')
const getPort = require('get-port')

const VsCode = require('../../../src/lib/vscode')
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

jest.mock('../../../src/lib/run-local-runtime')
jest.mock('../../../src/lib/actions-watcher')
jest.mock('../../../src/lib/app-helper')
jest.mock('../../../src/lib/cleanup')
jest.mock('../../../src/lib/vscode')
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
  runLocalRuntime.mockReset()
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

  VsCode.mockImplementation(() => {
    return {
      update: jest.fn(),
      cleanup: jest.fn()
    }
  })
})

test('no parameters (exception before processing)', async () => {
  const result = runDev()
  await expect(result).rejects.toThrow()
})

test('test port to use', async () => {
  const config = cloneDeep(createAppConfig().application)
  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

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

test('devRemote false', async () => {
  const config = cloneDeep(createAppConfig().application)
  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

  const result = runDev(config, DATA_DIR, { devRemote: false })
  await expect(result).resolves.toEqual(FRONTEND_URL)

  expect(runLocalRuntime).toHaveBeenCalled() // only called when options.devRemote is false
  expect(buildActions).toHaveBeenCalled() // only with backend, and !options.skipActions
  expect(deployActions).toHaveBeenCalled() // only with backend
  expect(bundle).toHaveBeenCalled() // only with frontend + !options.skipServe + !build-static hook
  expect(serve).not.toHaveBeenCalled() // only with frontend + !options.skipServe + build-static hook
  expect(bundleServe).toHaveBeenCalled() // only with frontend + !options.skipServe + !build-static hook + !serve-static hook
  expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalled() // only if it has frontend and backend (config.json write)
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).not.toHaveBeenCalled() // only called when options.devRemote is true
  expect(logPoller.run).not.toHaveBeenCalled() // only with backend and options.fetchLogs
  expect(actionsWatcher).toHaveBeenCalled() // only with backend
})

test('devRemote false, fetchLogs true, cleanup coverage', async () => {
  const config = cloneDeep(createAppConfig().application)
  const mockCleanup = {
    runLocalRuntime: jest.fn(),
    actionsWatcher: jest.fn(),
    bundleServe: jest.fn(),
    vscode: jest.fn(),
    logPoller: jest.fn()
  }

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
        fns.forEach(fn => fn())
      })
    }
  })

  VsCode.mockImplementation(() => {
    return {
      update: jest.fn(),
      cleanup: mockCleanup.vscode
    }
  })

  runLocalRuntime.mockImplementation(() => ({ config, cleanup: mockCleanup.runLocalRuntime }))
  actionsWatcher.mockImplementation(() => ({ cleanup: mockCleanup.actionsWatcher }))
  bundleServe.mockImplementation(() => ({ url: FRONTEND_URL, cleanup: mockCleanup.bundleServe }))
  logPoller.run.mockImplementation(() => ({ cleanup: mockCleanup.logPoller }))

  const result = runDev(config, DATA_DIR, { devRemote: false, fetchLogs: true })
  await expect(result).resolves.toEqual(FRONTEND_URL)

  expect(mockCleanup.runLocalRuntime).toHaveBeenCalled()
  expect(mockCleanup.actionsWatcher).toHaveBeenCalled()
  expect(mockCleanup.bundleServe).toHaveBeenCalled()
  expect(mockCleanup.logPoller).toHaveBeenCalled()
  expect(mockCleanup.vscode).toHaveBeenCalled()
})

test('devRemote false, fetchLogs true', async () => {
  const config = cloneDeep(createAppConfig().application)
  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

  const result = runDev(config, DATA_DIR, { devRemote: false, fetchLogs: true })
  await expect(result).resolves.toEqual(FRONTEND_URL)
})

test('devRemote false, exception thrown while processing', async () => {
  const config = cloneDeep(createAppConfig().application)
  runLocalRuntime.mockRejectedValue('error')

  const result = runDev(config, DATA_DIR, { devRemote: false })
  await expect(result).rejects.toEqual('error')
})

test('devRemote false, frontend false, backend false', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = false
  config.app.hasBackend = false

  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

  const result = runDev(config, DATA_DIR, { devRemote: false })
  await expect(result).resolves.toEqual(undefined) // no frontend, no url

  // nothing is called because there is nothing to do
  expect(runLocalRuntime).not.toHaveBeenCalled()
  expect(buildActions).not.toHaveBeenCalled()
  expect(deployActions).not.toHaveBeenCalled()
  expect(bundle).not.toHaveBeenCalled()
  expect(serve).not.toHaveBeenCalled()
  expect(bundleServe).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).not.toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).not.toHaveBeenCalled()
})

test('devRemote false, frontend true, backend false', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = true
  config.app.hasBackend = false

  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

  const result = runDev(config, DATA_DIR, { devRemote: false })
  await expect(result).resolves.toEqual(FRONTEND_URL)

  expect(runLocalRuntime).not.toHaveBeenCalled()
  expect(buildActions).not.toHaveBeenCalled()
  expect(deployActions).not.toHaveBeenCalled()
  expect(bundle).toHaveBeenCalled()
  expect(serve).not.toHaveBeenCalled()
  expect(bundleServe).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).not.toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).not.toHaveBeenCalled()
})

test('devRemote false, frontend true, skipActions true', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = true
  config.app.hasBackend = false

  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

  const result = runDev(config, DATA_DIR, { devRemote: false, skipActions: true })
  await expect(result).resolves.toEqual(FRONTEND_URL)

  expect(runLocalRuntime).not.toHaveBeenCalled()
  expect(buildActions).not.toHaveBeenCalled()
  expect(deployActions).not.toHaveBeenCalled()
  expect(bundle).toHaveBeenCalled()
  expect(serve).not.toHaveBeenCalled()
  expect(bundleServe).toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).not.toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).not.toHaveBeenCalled()
})

test('devRemote false, frontend true, backend true, skipServe true', async () => {
  const config = cloneDeep(createAppConfig().application)
  config.app.hasFrontend = true
  config.app.hasBackend = false

  runLocalRuntime.mockImplementation(() => ({
    config,
    cleanup: jest.fn()
  })
  )

  const result = runDev(config, DATA_DIR, { devRemote: false, skipServe: true })
  await expect(result).resolves.toEqual(undefined) // nothing was served, no url

  expect(runLocalRuntime).not.toHaveBeenCalled()
  expect(buildActions).not.toHaveBeenCalled()
  expect(deployActions).not.toHaveBeenCalled()
  expect(bundle).not.toHaveBeenCalled()
  expect(serve).not.toHaveBeenCalled()
  expect(bundleServe).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.getActionUrls).not.toHaveBeenCalled()
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).not.toHaveBeenCalled()
  expect(logPoller.run).not.toHaveBeenCalled()
  expect(actionsWatcher).not.toHaveBeenCalled()
})

test('devRemote true', async () => {
  const config = cloneDeep(createAppConfig().application)

  const result = runDev(config, DATA_DIR, { devRemote: true })
  await expect(result).resolves.toEqual(FRONTEND_URL)

  expect(runLocalRuntime).not.toHaveBeenCalled() // only called when options.devRemote is false
  expect(buildActions).toHaveBeenCalled() // only with backend, and !options.skipActions
  expect(deployActions).toHaveBeenCalled() // only with backend
  expect(bundle).toHaveBeenCalled() // only with frontend and !options.skipServe and build-static hook *not* set
  expect(serve).not.toHaveBeenCalled() // only with frontend and if we don't use the default bundler (build-static hook *is* set)
  expect(bundleServe).toHaveBeenCalled() // only with frontend and if we use the default bundler (build-static hook *not* set)
  expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalled() // only if it has frontend and backend (config.json write)
  expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalled() // only called when options.devRemote is true
  expect(logPoller.run).not.toHaveBeenCalled() // only with backend and options.fetchLogs
  expect(actionsWatcher).toHaveBeenCalled() // only with backend
})

test('devRemote true, build-static hook set, serve-static hook set)', async () => {
  const config = cloneDeep(createAppConfig().application)
  // script contents are the hook names, for easy reference
  config.hooks['build-static'] = 'build-static'
  config.hooks['serve-static'] = 'serve-static'

  appHelper.runScript.mockImplementation(script => {
    if (script === 'build-static' || script === 'serve-static') {
      return {}
    }
  })

  const result = runDev(config, DATA_DIR, { devRemote: true })
  await expect(result).resolves.toEqual(undefined) // since serve-static is an app hook

  expect(runLocalRuntime).not.toHaveBeenCalled()
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

test('devRemote true, build-static hook set, serve-static hook not set)', async () => {
  const config = cloneDeep(createAppConfig().application)
  // script contents are the hook names, for easy reference
  config.hooks['build-static'] = 'build-static'

  appHelper.runScript.mockImplementation(script => {
    if (script === 'build-static') {
      return {}
    }
  })

  const result = runDev(config, DATA_DIR, { devRemote: true })
  await expect(result).resolves.toEqual(FRONTEND_URL) // we use our own serve

  expect(runLocalRuntime).not.toHaveBeenCalled()
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
