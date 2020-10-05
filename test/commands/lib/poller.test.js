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
global.mockFs()
const EventPoller = require('../../../src/lib/poller')
jest.useFakeTimers()

const mockAIOConfig = require('@adobe/aio-lib-core-config')
const execa = require('execa')
jest.mock('execa')

const fetch = require('node-fetch')
jest.mock('node-fetch')

process.exit = jest.fn()

const loadConfig = require('../../../src/lib/config-loader')
const runDev = require('../../../src/lib/runDev')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const DeployActions = mockRuntimeLib.deployActions

jest.mock('../../../src/lib/app-helper.js')

describe('runDev logListener', () => {
  const ref = {}
  beforeEach(async () => {
    process.env.REMOTE_ACTIONS = 'true'
    global.addSampleAppFiles()
    global.fakeFileSystem.removeKeys(['/web-src/index.html'])
    mockAIOConfig.get.mockReturnValue(global.fakeConfig.local)
    process.chdir('/')
    ref.config = loadConfig()

    execa.mockReturnValue({
      stdout: jest.fn(),
      kill: jest.fn()
    })
    fetch.mockResolvedValue({
      ok: true
    })
    DeployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action' },
        { name: 'pkg/actionNoUrl' }
      ]
    })
    process.exit.mockReset()
    process.removeAllListeners('SIGINT')
  })

  afterEach(async () => {
    global.fakeFileSystem.reset()
    fetch.mockReset()
    execa.mockReset()
    mockRuntimeLib.printActionLogs.mockReset()
  })

  test('should throw error on error from getLogs', async () => {
    mockRuntimeLib.printActionLogs.mockReset()
    mockRuntimeLib.printActionLogs.mockRejectedValue('error')
    await runDev([], ref.config, { fetchLogs: true })
    jest.runAllTimers()
    expect(mockRuntimeLib.printActionLogs).toHaveBeenCalled()
    process.emit('SIGINT')
  })

  test('should get action logs', async () => {
    mockRuntimeLib.printActionLogs.mockResolvedValueOnce({ lastActivationTime: 0 })
    await runDev([], ref.config, { fetchLogs: true })
    jest.runAllTimers()
    expect(mockRuntimeLib.printActionLogs).toHaveBeenCalled()
    process.emit('SIGINT')
  })

  test('no args -> codecov', async () => {
    await expect(runDev()).rejects.toThrow()
  })
})

describe('poller', () => {
  test('poll', () => {
    const poller = new EventPoller(1234)
    poller.emit = jest.fn()

    poller.poll('some fake args')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1234)
    jest.runAllTimers()
    expect(poller.emit).toHaveBeenCalledWith('poll', 'some fake args')
  })

  test('onPoll', () => {
    const poller = new EventPoller(1234)
    poller.on = jest.fn()

    const a = () => {}
    poller.onPoll(a)
    expect(poller.on).toHaveBeenCalledWith('poll', a)
  })
})
