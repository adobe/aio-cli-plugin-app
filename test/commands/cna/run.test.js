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

const RunCommand = require('../../../src/commands/cna/run')
const CNABaseCommand = require('../../../src/CNABaseCommand')

// mocks
jest.mock('open', () => jest.fn())
const mockScripts = require('@adobe/io-cna-scripts')()

beforeEach(() => {
  jest.restoreAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('run command definition', () => {
  test('exports', async () => {
    expect(typeof RunCommand).toEqual('function')
    expect(RunCommand.prototype instanceof CNABaseCommand).toBeTruthy()
  })

  test('description', async () => {
    expect(RunCommand.description).toBeDefined()
  })

  test('aliases', async () => {
    expect(RunCommand.aliases).toEqual([])
  })

  test('flags', async () => {
    expect(typeof RunCommand.flags.local).toBe('object')
    expect(typeof RunCommand.flags.local.description).toBe('string')
  })
})

describe('run', () => {
  test('cna:run with no flags', async () => {
    delete process.env['REMOTE_ACTIONS']
    let command = new RunCommand([])
    command.error = jest.fn()
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env['REMOTE_ACTIONS']).toBe('true')
  })

  test('cna:run with --verbose', async () => {
    delete process.env['REMOTE_ACTIONS']
    let command = new RunCommand(['--verbose'])
    command.error = jest.fn(['--verbose'])
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env['REMOTE_ACTIONS']).toBe('true')
  })

  test('cna:run with --no-local', async () => {
    delete process.env['REMOTE_ACTIONS']
    let mySpy = jest.spyOn(mockScripts, 'runDev')
    mySpy.mockReset()
    let command = new RunCommand(['--no-local'])
    command.error = jest.fn()
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mySpy).toHaveBeenCalledTimes(1)
    expect(process.env['REMOTE_ACTIONS']).toBe('true')
  })

  test('cna:run with --local', async () => {
    delete process.env['REMOTE_ACTIONS']
    let mySpy = jest.spyOn(mockScripts, 'runDev')
    mySpy.mockReset()
    let command = new RunCommand(['--local'])
    command.error = jest.fn()
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mySpy).toHaveBeenCalledTimes(1)
    expect(process.env['REMOTE_ACTIONS']).toBe('false')
  })

  test('cna:run with --local --verbose', async () => {
    delete process.env['REMOTE_ACTIONS']
    let mySpy = jest.spyOn(mockScripts, 'runDev')
    mySpy.mockReset()
    let command = new RunCommand(['--local', '--verbose'])
    command.error = jest.fn()
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mySpy).toHaveBeenCalledTimes(1)
    expect(process.env['REMOTE_ACTIONS']).toBe('false')
  })

  // TODO: should add a test for a eventlistener that throws an exception, which will break things
})
