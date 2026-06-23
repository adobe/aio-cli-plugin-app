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
import actionsWatcher from '../../../src/lib/actions-watcher.js'
import chokidar from 'chokidar'
import mockLogger from '@adobe/aio-lib-core-logging'
import buildActions from '../../../src/lib/build-actions.js'
import deployActions from '../../../src/lib/deploy-actions.js'
import buildAndDeploy from '../../../src/lib/deploy-actions.js'
import util from 'util'
import dataMocks from '../../data-mocks/config-loader.js'
const sleep = util.promisify(setTimeout)
import cloneDeep from 'lodash.clonedeep'

vi.mock('chokidar')
vi.mock('../../../src/lib/build-actions')
vi.mock('../../../src/lib/deploy-actions')
vi.mock('../../../src/lib/app-helper')

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

beforeEach(() => {
  vi.useFakeTimers()

  chokidar.watch.mockReset()
  mockLogger.mockReset()

  buildActions.mockReset()
  deployActions.mockReset()
  buildAndDeploy.mockReset()
})

test('exports', () => {
  expect(typeof actionsWatcher).toEqual('function')
})

test('run and cleanup', async () => {
  let onChangeHandler = null

  const mockWatcherInstance = {
    on: vi.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: vi.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = vi.fn()
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
    on: vi.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: vi.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = vi.fn()
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
    on: vi.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: vi.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = vi.fn()
  const { application } = createAppConfig()
  await actionsWatcher({ config: application, log })
  expect(typeof onChangeHandler).toEqual('function')

  // first onchange
  deployActions.mockImplementation(async () => await sleep(2000))
  onChangeHandler('actions')
  deployActions.mockImplementation(async () => { throw new Error() })

  // second onchange
  onChangeHandler('actions')

  await vi.runAllTimers()

  expect(buildActions).toHaveBeenCalledTimes(1)
  expect(deployActions).toHaveBeenCalledTimes(1)
})

test('onChange handler calls buildActions with filterActions', async () => {
  let onChangeHandler = null
  const mockWatcherInstance = {
    on: vi.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: vi.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = vi.fn()
  const { application } = createAppConfig()
  await actionsWatcher({ config: application, log })
  expect(typeof onChangeHandler).toEqual('function')

  const filePath = process.platform === 'win32' ? '\\myactions\\action.js' : '/myactions/action.js'

  deployActions.mockImplementation(async () => await sleep(5000))
  onChangeHandler(filePath)

  await vi.runAllTimers()

  expect(buildActions).toHaveBeenCalledWith(
    application, ['action']
  )
})

test('on non-action file changed, skip build&deploy', async () => {
  const { application } = createAppConfig()
  const cloneApplication = cloneDeep(application)
  Object.entries(cloneApplication.manifest.full.packages).forEach(([, pkg]) => {
    if (pkg.actions) {
      delete pkg.actions
    }
  })
  let onChangeHandler = null
  const mockWatcherInstance = {
    on: vi.fn((event, handler) => {
      if (event === 'change') {
        onChangeHandler = handler
      }
    }),
    close: vi.fn()
  }
  chokidar.watch.mockImplementation(() => mockWatcherInstance)

  const log = vi.fn()
  await actionsWatcher({ config: cloneApplication, log })
  expect(typeof onChangeHandler).toEqual('function')

  buildAndDeploy.mockImplementation(async () => await sleep(2000))
  onChangeHandler('/myactions/utils.js')

  await vi.runAllTimers()

  expect(buildAndDeploy).not.toHaveBeenCalled()
})
