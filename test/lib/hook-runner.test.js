/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// command tests automock app-helper, so the real flag parser is kept here
jest.mock('../../src/lib/app-helper', () => ({
  runInProcess: jest.fn(),
  isEnvEnabledForHook: jest.requireActual('../../src/lib/app-helper').isEnvEnabledForHook
}))
const { runInProcess } = require('../../src/lib/app-helper')
const { runHookOrLog } = require('../../src/lib/hook-runner')

beforeEach(() => {
  runInProcess.mockReset()
  delete process.env.AIO_FAIL_ON_HOOK_ERROR
})

afterAll(() => {
  delete process.env.AIO_FAIL_ON_HOOK_ERROR
})

describe('runHookOrLog', () => {
  test.each(['pre-app-build', 'post-app-build', 'pre-app-run', 'post-app-run'])('fails for %s when the value is not a list', async (hook) => {
    process.env.AIO_FAIL_ON_HOOK_ERROR = '1'
    runInProcess.mockRejectedValue(new Error('boom'))
    await expect(runHookOrLog(hook, 'script', {}, jest.fn())).rejects.toThrow(`Hook '${hook}' failed: boom`)
  })

  test.each([
    ['pre-app-build', true],
    ['post-app-build', false],
    ['pre-app-run', false],
    ['post-app-run', true]
  ])('with a list value, %s fails: %s', async (hook, fails) => {
    process.env.AIO_FAIL_ON_HOOK_ERROR = ' Pre-App-Build, post-app-run '
    const log = jest.fn()
    runInProcess.mockRejectedValue(new Error('boom'))
    const result = runHookOrLog(hook, 'script', {}, log)
    if (fails) {
      await expect(result).rejects.toThrow(`Hook '${hook}' failed: boom`)
      expect(log).not.toHaveBeenCalled()
    } else {
      await expect(result).resolves.toBeUndefined()
      expect(log).toHaveBeenCalledTimes(1)
    }
  })

  test('returns the hook result', async () => {
    runInProcess.mockResolvedValue('result')
    await expect(runHookOrLog('pre-app-build', 'script', { a: 1 }, jest.fn())).resolves.toBe('result')
    expect(runInProcess).toHaveBeenCalledWith('script', { a: 1 })
  })

  test('only logs the error by default', async () => {
    const err = new Error('boom')
    const log = jest.fn()
    runInProcess.mockRejectedValue(err)
    await expect(runHookOrLog('pre-app-build', 'script', {}, log)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith(err)
  })

  test.each(['', '0', 'false'])('only logs the error when AIO_FAIL_ON_HOOK_ERROR is %p', async (value) => {
    process.env.AIO_FAIL_ON_HOOK_ERROR = value
    const log = jest.fn()
    runInProcess.mockRejectedValue(new Error('boom'))
    await expect(runHookOrLog('pre-app-build', 'script', {}, log)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledTimes(1)
  })

  test('rethrows with the hook name when AIO_FAIL_ON_HOOK_ERROR is enabled', async () => {
    process.env.AIO_FAIL_ON_HOOK_ERROR = 'true'
    const err = new Error('boom')
    const log = jest.fn()
    runInProcess.mockRejectedValue(err)
    await expect(runHookOrLog('pre-app-build', 'script', {}, log)).rejects.toMatchObject({
      message: "Hook 'pre-app-build' failed: boom",
      cause: err
    })
    expect(log).not.toHaveBeenCalled()
    expect(runInProcess).toHaveBeenCalledTimes(1)
  })
})
