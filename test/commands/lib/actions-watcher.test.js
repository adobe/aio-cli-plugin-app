/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const actionsWatcher = require('../../../src/lib/actions-watcher')
const chokidar = require('chokidar')
const mockLogger = require('@adobe/aio-lib-core-logging')
const buildActions = require('../../../src/lib/build-actions')
const deployActions = require('../../../src/lib/deploy-actions')
const util = require('util')
const dataMocks = require('../../data-mocks/config-loader')
const sleep = util.promisify(setTimeout)
const cloneDeep = require('lodash.clonedeep')

jest.mock('chokidar')
jest.mock('../../../src/lib/build-actions')
jest.mock('../../../src/lib/deploy-actions')
jest.mock('../../../src/lib/app-helper')

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

beforeEach(() => {
  jest.useFakeTimers()

  chokidar.watch.mockReset()
  mockLogger.mockReset()

  buildActions.mockReset()
  deployActions.mockReset()
})

test('exports', () => {
  expect(typeof actionsWatcher).toEqual('function')
})

test('run and cleanup', async () => {
  let onChangeHandler = null

  const mockWatcherInstance = {
    on: jest.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: jest.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = jest.fn()
  const { application } = createAppConfig()
  const { watcher, cleanup } = await actionsWatcher({ config: application, log })
  expect(typeof watcher).toEqual('object')
  expect(typeof cleanup).toEqual('function')

  cleanup()

  expect(mockWatcherInstance.on).toHaveBeenCalledWith('change', onChangeHandler)
  expect(chokidar.watch).toHaveBeenCalledWith(application.actions.src)
  expect(mockWatcherInstance.close).toHaveBeenCalled()
})

test('onChange handler', async () => {
  let onChangeHandler = null
  const mockWatcherInstance = {
    on: jest.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: jest.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = jest.fn()
  const { application } = createAppConfig()
  await actionsWatcher({ config: application, log })
  expect(typeof onChangeHandler).toEqual('function')

  // first onchange
  await onChangeHandler('actions')
  expect(buildActions).toHaveBeenCalledTimes(1)
  expect(deployActions).toHaveBeenCalledTimes(1)
})

test('onChange handler called multiple times', async () => {
  let onChangeHandler = null
  const mockWatcherInstance = {
    on: jest.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: jest.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = jest.fn()
  const { application } = createAppConfig()
  await actionsWatcher({ config: application, log })
  expect(typeof onChangeHandler).toEqual('function')

  // first onchange
  deployActions.mockImplementation(async () => await sleep(2000))
  onChangeHandler('actions')
  deployActions.mockImplementation(async () => { throw new Error() })

  // second onchange
  onChangeHandler('actions')

  await jest.runAllTimers()

  expect(buildActions).toHaveBeenCalledTimes(1)
  expect(deployActions).toHaveBeenCalledTimes(1)
})

test('onChange handler calls buildActions with filterActions', async () => {
  let onChangeHandler = null
  const mockWatcherInstance = {
    on: jest.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: jest.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = jest.fn()
  const { application } = createAppConfig()
  await actionsWatcher({ config: application, log })
  expect(typeof onChangeHandler).toEqual('function')

  const filePath = process.platform === 'win32' ? '\\myactions\\action.js' : '/myactions/action.js'

  deployActions.mockImplementation(async () => await sleep(5000))
  onChangeHandler(filePath)

  await jest.runAllTimers()

  expect(buildActions).toHaveBeenCalledWith(
    expect.objectContaining({ filterActions: ['action'] })
  )
})

test('onChange handler calls buildActions without filterActions when actions are undefined', async () => {
  const { application } = createAppConfig()
  const newApplication = cloneDeep(application)
  Object.entries(newApplication.manifest.full.packages).forEach(([, pkg]) => {
    if (pkg.actions) {
      delete pkg.actions
    }
  })
  let onChangeHandler = null
  const mockWatcherInstance = {
    on: jest.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: jest.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = jest.fn()
  await actionsWatcher({ config: newApplication, log })
  expect(typeof onChangeHandler).toEqual('function')

  deployActions.mockImplementation(async () => await sleep(2000))
  onChangeHandler('/myactions/action.js')

  await jest.runAllTimers()

  expect(buildActions).toHaveBeenCalledWith(
    newApplication
  )
})
