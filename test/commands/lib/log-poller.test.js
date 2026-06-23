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
import { EventPoller, run as logPoller } from '../../../src/lib/log-poller.js'
import { printActionLogs } from '@adobe/aio-lib-runtime'
import mockLogger from '@adobe/aio-lib-core-logging'

vi.mock('../../../src/lib/app-helper.js')
vi.mock('@adobe/aio-lib-runtime')

test('exports', () => {
  expect(typeof EventPoller).toEqual('function')
  expect(typeof logPoller).toEqual('function')
})

describe('logPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    mockLogger.mockReset()
    printActionLogs.mockReset()
  })

  test('run (no errors)', async () => {
    printActionLogs.mockImplementation(() => ({
      lastActivationTime: 1
    }))

    const { poller, cleanup } = await logPoller({}, 1000)
    vi.advanceTimersByTime(1000)
    cleanup()

    expect(typeof poller).toEqual('object')
    expect(typeof cleanup).toEqual('function')
    expect(printActionLogs).toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  test('run (has errors)', async () => {
    printActionLogs.mockImplementation(() => {
      throw new Error('error')
    })

    const { poller, cleanup } = await logPoller({}, 1000)
    vi.advanceTimersByTime(1000)
    cleanup()

    expect(typeof poller).toEqual('object')
    expect(typeof cleanup).toEqual('function')
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('cleanup', async () => {
    const { poller, cleanup } = await logPoller({})

    poller.stop = vi.fn()
    await cleanup()
    expect(poller.stop).toHaveBeenCalled()
  })
})

describe('EventPoller', () => {
  test('start', () => {
    const poller = new EventPoller(1234)
    poller.emit = vi.fn()
    vi.spyOn(global, 'setTimeout')

    poller.start('some fake args')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1234)
    vi.runAllTimers()
    expect(poller.emit).toHaveBeenCalledWith('poll', 'some fake args')
  })

  test('stop', () => {
    const poller = new EventPoller(1234)
    poller.emit = vi.fn()
    vi.spyOn(global, 'setTimeout')

    poller.start('some fake args')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1234)
    vi.runAllTimers()
    expect(poller.emit).toHaveBeenCalledWith('poll', 'some fake args')
    poller.stop()
  })

  test('onPoll', () => {
    const poller = new EventPoller(1234)
    poller.on = vi.fn()

    const a = () => {}
    poller.onPoll(a)
    expect(poller.on).toHaveBeenCalledWith('poll', a)
  })
})
