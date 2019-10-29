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

const TheCommand = require('../../../src/commands/cna/test')
const CNABaseCommand = require('../../../src/CNABaseCommand')
const cnaHelper = require('../../../src/lib/cna-helper')

// mocks
cnaHelper.runPackageScript = jest.fn()
jest.mock('fs')

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof CNABaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
    expect(TheCommand.description).toBeDefined()
  })

  test('description', async () => {
    expect(TheCommand.description).toBeDefined()
  })

  test('aliases', async () => {
    expect(TheCommand.aliases).toEqual([])
  })

  test('flags', async () => {
    expect(typeof TheCommand.flags.unit).toBe('object')
    expect(TheCommand.flags.unit.char).toBe('u')
    expect(typeof TheCommand.flags.unit.description).toBe('string')
    expect(TheCommand.flags.unit.exclusive).toEqual(['e2e'])
    expect(TheCommand.flags.unit.default).toEqual(true)

    expect(typeof TheCommand.flags.e2e).toBe('object')
    expect(TheCommand.flags.e2e.char).toBe('e')
    expect(typeof TheCommand.flags.e2e.description).toBe('string')
    expect(TheCommand.flags.e2e.exclusive).toEqual(['unit'])
  })
  describe('bad flags', () => {
    const expectFlagError = async (argv, message) => {
      const command = new TheCommand([])
      command.exit = jest.fn()
      command.argv = argv
      let err
      try {
        await command.run()
      } catch (e) {
        err = e
        expect(e.message).toEqual(expect.stringContaining(message))
      }
      expect(err).toBeInstanceOf(Error)
    }

    test('unknown', async () => expectFlagError(['--wtf'], 'Unexpected argument: --wtf\nSee more help with --help'))
    test('-e,-u should fail if both flags are present', async () => {
      const errMsg = 'cannot also be provided when using'
      await expectFlagError(['-e', '-u'], errMsg)
      await expectFlagError(['--e2e', '-u'], errMsg)
      await expectFlagError(['-e', '--unit'], errMsg)
      await expectFlagError(['--e2e', '--unit'], errMsg)
      await expectFlagError(['-u', '-e'], errMsg)
      await expectFlagError(['-u', '--e2e'], errMsg)
      await expectFlagError(['--unit', '-e'], errMsg)
      await expectFlagError(['--unit', '--e2e'], errMsg)
    })
  })
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()

    cnaHelper.runPackageScript.mockReset()
    cnaHelper.runPackageScript.mockResolvedValue({ exitCode: 0 })
  })

  const expectNoErrors = async (argv, testCmd) => {
    command.argv = argv
    await command.run()
    expect(cnaHelper.runPackageScript).toHaveBeenCalledWith(testCmd, expect.any(String), { silent: true })
  }
  const expectErrors = async (argv, errorCode) => {
    cnaHelper.runPackageScript.mockRejectedValue({ message: 'fake error', exitCode: 42 })
    command.argv = argv
    await command.run()
    expect(command.error).toHaveBeenCalledWith('fake error', { exit: 42 })
  }

  test('no flags', () => expectNoErrors([], 'test'))
  test('--unit', () => expectNoErrors(['--unit'], 'test'))
  test('-u', () => expectNoErrors(['-u'], 'test'))
  test('--e2e', () => expectNoErrors(['--e2e'], 'e2e'))
  test('-e', () => expectNoErrors(['-e'], 'e2e'))

  test('--e2e fails', () => expectErrors(['--e2e']))
  test('-e fails', () => expectErrors(['-e']))
  test('--unit fails', () => expectErrors(['--unit']))
  test('-u fails', () => expectErrors(['-u']))
})
