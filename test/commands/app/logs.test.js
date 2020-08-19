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
const fs = require('fs-extra')
const RuntimeLib = require('@adobe/aio-lib-runtime')

describe('interface', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
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
    expect(typeof TheCommand.flags.limit).toBe('object')
    expect(TheCommand.flags.limit.char).toBe('l')
    expect(typeof TheCommand.flags.limit.description).toBe('string')
    expect(TheCommand.flags.limit.default).toEqual(1)
  })
})

describe('run', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  test('calls checkOpenwhiskCredentials with right param', async () => {
    const command = new TheCommand([])
    command.appConfig = {}
    command.error = jest.fn()
    command.log = jest.fn()

    fs.lstatSync = jest.fn(() => {
      return { isFile: () => true }
    })

    await command.run()
    expect(RuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenNthCalledWith(1, {})

    command.appConfig = { ow: {apihost: 'host'} }
    await command.run()
    expect(RuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenNthCalledWith(2, { ow: {apihost: 'host'}})
  })

  test('no flags', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = {
      ow: {
        apihost: 'host',
        namespace: 'namespace',
        auth: 'auth'
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('does not fail when --limit < 1', async () => {
    // todo: test that 1 is passed through to runtime.activations.list
    const command = new TheCommand(['--limit=-1'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = {
      ow: {
        apihost: 'host',
        namespace: 'namespace',
        auth: 'auth'
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('does not fail when --limit > 50', async () => {
    // todo: test that 50 is passed through to runtime.activations.list
    const command = new TheCommand(['--limit=51'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = {
      ow: {
        apihost: 'host',
        namespace: 'namespace',
        auth: 'auth'
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('does not log if no logs returned', async () => {
    // todo: cover line 54
    jest.spyOn(RuntimeLib, 'init').mockImplementation(async () => {
      return {
        activations: {
          list: jest.fn(async () => []),
          logs: jest.fn(async () => {
            return { logs: [] }
          })
        }
      }
    })
    const command = new TheCommand(['--limit=51'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = {
      ow: {
        apihost: 'host',
        namespace: 'namespace',
        auth: 'auth'
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
  })
})
