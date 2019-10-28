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

// mocks
jest.mock('execa')
jest.mock('fs')
const execa = require('execa')
const fs = require('fs')

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof CNABaseCommand).toBeTruthy()
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

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.exit = jest.fn()
    // reset mocks
    fs.readFileSync.mockReset()
    execa.mockReset()

    // defaults that work
    fs.readFileSync.mockReturnValue(JSON.stringify({ scripts: { test: 'fake test', e2e: 'fake e2e' } }))
    execa.mockResolvedValue({ exitCode: 0 })
  })

  const expectNoErrors = async testCmd => {
    await command.run()
    expect(execa).toHaveBeenCalledWith('npm', ['run', testCmd, '--silent'], expect.any(Object))
    expect(fs.readFileSync).toHaveBeenCalledWith('package.json')
  }
  const expectErrors = async errorCode => {
    await command.run()
    expect(command.exit).toHaveBeenCalledWith(errorCode)
  }
  test('unit tests - no flag', async () => {
    await expectNoErrors('test')
  })
  test('unit tests - with --unit flag', async () => {
    command.argv = ['--unit']
    await expectNoErrors('test')
  })
  test('unit tests - missing package.json scripts.test', async () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ scripts: { e2e: 'fake e2e' } }))
    await expectErrors(1)
    expect(execa).toHaveBeenCalledTimes(0)
  })
  test('unit tests - test fails', async () => {
    execa.mockRejectedValue({ exitCode: 42 })
    await expectErrors(42)
  })

  test('e2e tests - with --e2e flag', async () => {
    command.argv = ['--e2e']
    await expectNoErrors('e2e')
  })
  test('e2e tests - missing package.json scripts.test', async () => {
    command.argv = ['--e2e']
    fs.readFileSync.mockReturnValue(JSON.stringify({ scripts: { test: 'fake unit' } }))
    await expectErrors(1)
    expect(execa).toHaveBeenCalledTimes(0)
  })
  test('e2e tests - test fails', async () => {
    command.argv = ['--e2e']
    execa.mockRejectedValue({ exitCode: 42 })
    await expectErrors(42)
  })

// jest.mock('../../../src/lib/cna-helper', () => {
//   return { runPackageScript: jest.fn() }
// })
// const cnaHelper = require('../../../src/lib/cna-helper')

// beforeEach(() => {
//   jest.resetAllMocks()
// })

// describe('Command Prototype', () => {
//   test('exports', async () => {
//     expect(typeof TheCommand).toEqual('function')
//     expect(TheCommand.prototype instanceof CNABaseCommand).toBeTruthy()
//     expect(typeof TheCommand.flags).toBe('object')
//   })
// })

// describe('bad flags', () => {
//   test('unknown', async (done) => {
//     let result = TheCommand.run(['.', '--wtf'])
//     expect(result instanceof Promise).toBeTruthy()
//     return result
//       .then(() => done.fail())
//       .catch(res => {
//         expect(res).toEqual(new Error('Unexpected argument: --wtf\nSee more help with --help'))
//         done()
//       })
//   })
// })

// describe('no flags', () => {
//   test('run tests', async () => {
//     let result = await TheCommand.run([])
//     expect(cnaHelper.runPackageScript).toHaveBeenCalled()
//     return result
// })

})
