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

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

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
  beforeEach(() => {
    helpers.getLogs.mockReset()
    helpers.wrapError.mockReset()
  })

  test('no flags, sets limit to 1', async () => {
    const command = new TheCommand([])
    command.appConfig = { fake: 'config' }
    command.error = jest.fn()
    command.log = jest.fn()

    await command.run()
    expect(helpers.getLogs).toHaveBeenCalledWith({ fake: 'config' }, 1, command.log)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--limit < 1, sets limit to 1', async () => {
    const command = new TheCommand(['--limit', '-1'])
    command.appConfig = { fake: 'config' }
    command.error = jest.fn()
    command.log = jest.fn()

    await command.run()
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('using --limit=1'))
    expect(helpers.getLogs).toHaveBeenCalledWith({ fake: 'config' }, 1, command.log)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--limit > 50, sets limit to 50', async () => {
    const command = new TheCommand(['--limit', '51'])
    command.appConfig = { fake: 'config' }
    command.error = jest.fn()
    command.log = jest.fn()

    await command.run()
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('using --limit=50'))
    expect(helpers.getLogs).toHaveBeenCalledWith({ fake: 'config' }, 50, command.log)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('--limit 32', async () => {
    const command = new TheCommand(['--limit', '32'])
    command.appConfig = { fake: 'config' }
    command.error = jest.fn()
    command.log = jest.fn()

    await command.run()
    expect(helpers.getLogs).toHaveBeenCalledWith({ fake: 'config' }, 32, command.log)
    expect(command.error).not.toHaveBeenCalled()
  })

  test('error while getting logs', async () => {
    const command = new TheCommand([])
    command.appConfig = { fake: 'config' }
    command.error = jest.fn()
    command.log = jest.fn()
    const theerror = new Error('I do not like logs')
    helpers.getLogs.mockRejectedValue(theerror)
    helpers.wrapError.mockReturnValue('wrapped error')
    await command.run()
    expect(command.error).toHaveBeenCalledWith('wrapped error')
    expect(helpers.wrapError).toHaveBeenCalledWith(theerror)
  })
})
