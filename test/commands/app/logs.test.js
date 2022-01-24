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

const TheCommand = require('../../../src/commands/app/logs')
const BaseCommand = require('../../../src/BaseCommand')
const dataMocks = require('../../data-mocks/config-loader')
const LogForwarding = require('../../../src/lib/log-forwarding')

jest.mock('../../../src/lib/log-forwarding', () => {
  const orig = jest.requireActual('../../../src/lib/log-forwarding')
  return {
    ...orig,
    init: jest.fn()
  }
})

const createFullConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  return dataMocks(appFixtureName, aioConfig)
}

const mockFS = require('fs-extra')
jest.mock('fs-extra')

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const printActionLogs = mockRuntimeLib.printActionLogs

describe('interface', () => {
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
    expect(typeof TheCommand.flags.limit).toBe('object')
    expect(TheCommand.flags.limit.char).toBe('l')
    expect(typeof TheCommand.flags.limit.description).toBe('string')
    expect(TheCommand.flags.limit.default).toEqual(1)
  })
})

describe('run', () => {
  let command, logForwarding

  const owConfig = () => Object.values(command.appConfig.all)[0].ow // every extension has the same 'ow' package

  beforeEach(() => {
    printActionLogs.mockReset()
    helpers.wrapError.mockReset()
    mockFS.existsSync.mockReset()

    command = new TheCommand([])
    command.appConfig = createFullConfig()
    command.error = jest.fn()
    command.log = jest.fn()
    command.getFullConfig = jest.fn()
    command.getFullConfig.mockReturnValue(command.appConfig)
    logForwarding = {
      getServerConfig: jest.fn()
        .mockResolvedValue(new LogForwarding.LogForwardingConfig('adobe_io_runtime', {}))
    }
    LogForwarding.init.mockResolvedValue(logForwarding)
  })

  test('no flags, sets limit to 1', async () => {
    mockFS.existsSync.mockReturnValue(true)

    await command.run()
    const ow = owConfig()
    const actionList = ['legacy-app-1.0.0/action', 'legacy-app-1.0.0/action-zip']
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 1, actionList, false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('no flags, custom log forwarding', async () => {
    mockFS.existsSync.mockReturnValue(true)
    logForwarding.getServerConfig.mockResolvedValue(
      new LogForwarding.LogForwardingConfig('custom_destination', {})
    )

    await command.run()
    expect(printActionLogs).not.toHaveBeenCalled()
  })

  test('--limit < 1, sets limit to 1', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--limit', '-1']

    await command.run()
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('using --limit=1'))
    const ow = owConfig()
    const actionList = ['legacy-app-1.0.0/action', 'legacy-app-1.0.0/action-zip']
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 1, actionList, false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--limit > 50, sets limit to 50', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--limit', '51']

    await command.run()
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('using --limit=50'))
    const ow = owConfig()
    const actionList = ['legacy-app-1.0.0/action', 'legacy-app-1.0.0/action-zip']
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 50, actionList, false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--limit 32', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--limit', '32']

    await command.run()
    const ow = owConfig()
    const actionList = ['legacy-app-1.0.0/action', 'legacy-app-1.0.0/action-zip']
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 32, actionList, false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--action without including package name (found)', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--action', 'action-zip'] // we check if it exists because package-name is missing

    await command.run()
    const ow = owConfig()
    const actionList = ['legacy-app-1.0.0/action-zip']
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 1, actionList, false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--action without including package name (not found)', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const actionToFind = 'unknown-action'
    command.argv = ['--action', actionToFind] // we check if it exists because package-name is missing

    await expect(command.run()).rejects.toEqual(new Error(`There is no match for action '${actionToFind}' in any of the packages.`))
  })

  test('--action including package name', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--action', 'legacy-app-1.0.0/action'] // pass-through (we don't check if it exists)

    await command.run()
    const ow = owConfig()
    const actionList = ['legacy-app-1.0.0/action']
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 1, actionList, false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--action multiple', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--action', 'pkg1/hello', '--action', '/actionwithoutpkg'] // pass-through (we don't check if it exists)

    await command.run()
    const ow = owConfig()
    expect(printActionLogs).toHaveBeenCalledWith({ ow }, command.log, 1, ['pkg1/hello', '/actionwithoutpkg'], false, false)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('error while getting logs', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const theerror = new Error('I do not like logs')
    printActionLogs.mockRejectedValue(theerror)
    helpers.wrapError.mockReturnValue('wrapped error')

    await command.run()
    expect(command.error).toHaveBeenCalledWith('wrapped error')
    expect(helpers.wrapError).toHaveBeenCalledWith(theerror)
  })

  test('error no backend for any package', async () => {
    mockFS.existsSync.mockReturnValue(false)
    helpers.wrapError.mockReturnValue('wrapped error')

    command.appConfig.all.application.app.hasBackend = false
    command.getFullConfig.mockReturnValue(command.appConfig)

    await expect(command.run()).rejects.toEqual(new Error('There are no backend implementations for this project folder.'))
  })
})
