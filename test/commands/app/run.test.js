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

const RunCommand = require('../../../src/commands/app/run')
const BaseCommand = require('../../../src/BaseCommand')

// mocks
jest.mock('open', () => jest.fn())
jest.mock('cli-ux')
const { cli } = require('cli-ux')
const fs = require('fs-extra')
const mockScripts = require('@adobe/aio-app-scripts')()
let command

beforeEach(() => {
  jest.restoreAllMocks()
  mockScripts.runDev.mock.calls = []
  command = new RunCommand()
  command.error = jest.fn()
  command.config = {
    findCommand: () => {
      return {
        load: () => {
          return { run: jest.fn() }
        }
      }
    }
  }
  cli.open = jest.fn()
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('run command definition', () => {
  test('exports', async () => {
    expect(typeof RunCommand).toEqual('function')
    expect(RunCommand.prototype instanceof BaseCommand).toBeTruthy()
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
  test('app:run with no flags', async () => {
    delete process.env.REMOTE_ACTIONS
    await RunCommand.run([])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('true')
  })

  test('app:run with -verbose', async () => {
    delete process.env.REMOTE_ACTIONS
    await RunCommand.run(['--verbose'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('true')
  })

  test('app:run without --local', async () => {
    delete process.env.REMOTE_ACTIONS
    await RunCommand.run([])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('true')
  })

  test('app:run with --local', async () => {
    delete process.env.REMOTE_ACTIONS
    await RunCommand.run(['--local'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('false')
  })

  test('app:run with --local --verbose', async () => {
    delete process.env.REMOTE_ACTIONS
    await RunCommand.run(['--local', '--verbose'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('false')
  })

  test('app:run where scripts.runDev throws', async () => {
    mockScripts.runDev.mockRejectedValue('error')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(2)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
  })

  test('app:run with AIO_LAUNCH_URL_PREFIX', async () => {
    process.env.AIO_LAUNCH_URL_PREFIX = 'some value:'
    mockScripts.runDev.mockResolvedValue('mkay')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(cli.open).toHaveBeenCalledWith('some value:mkay')
  })

  test('app:run with certs', async () => {
    mockScripts.runDev.mockResolvedValue('asd')
    delete process.env.AIO_LAUNCH_URL_PREFIX
    fs.existsSync.mockResolvedValue(true)
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
  })

  // TODO: should add a test for a eventlistener that throws an exception, which will break things
})
