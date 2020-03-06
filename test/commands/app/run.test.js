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

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

jest.mock('cli-ux')
const { cli } = require('cli-ux')

const fs = require('fs-extra')

jest.mock('https')
// const https = require('https')
const mockScripts = require('@adobe/aio-app-scripts')()
let command

const mockFindCommandRun = jest.fn()
const mockFindCommandLoad = jest.fn().mockReturnValue({
  run: mockFindCommandRun
})

beforeEach(() => {
  jest.restoreAllMocks()
  mockScripts.runDev.mockReset()
  mockScripts.runDev.mock.calls = []
  mockConfig.get = jest.fn().mockReturnValue({ globalConfig: 'seems-legit' })

  cli.action = {
    stop: jest.fn(),
    start: jest.fn()
  }
  cli.wait = jest.fn() // .mockImplementation((ms = 1000) => { return new Promise(resolve => setTimeout(resolve, ms)) })

  mockFindCommandLoad.mockClear()
  mockFindCommandRun.mockReset()
  fs.existsSync.mockReset()
  fs.ensureDirSync.mockReset()

  command = new RunCommand()
  command.error = jest.fn()
  command.log = jest.fn()
  command.config = {
    findCommand: jest.fn().mockReturnValue({
      load: mockFindCommandLoad
    })
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
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
  })

  test('app:run with AIO_LAUNCH_URL_PREFIX', async () => {
    process.env.AIO_LAUNCH_URL_PREFIX = 'some value:'
    mockScripts.runDev.mockResolvedValue('mkay')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    // expect(cli.open).toHaveBeenCalledWith('some value:mkay')
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

  test('app:run throws error when certificate:generate command not found', async () => {
    fs.existsSync.mockReturnValue(false)
    mockConfig.get.mockReturnValue(null)
    const spy = jest.spyOn(command.config, 'findCommand').mockReturnValue(null)
    command.error.mockImplementation((e) => {
      throw new Error(e)
    })

    command.argv = []
    await expect(command.run()).rejects.toThrow('error while generating certificate - no certificate:generate command found')

    expect(command.error).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(0)
    spy.mockRestore()
  })

  test('run should show ui url', async () => {
    mockScripts.runDev.mockResolvedValue('http://localhost:1111')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
  })

  test('run should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    process.env.AIO_LAUNCH_PREFIX_URL = 'http://prefix?fake='
    mockScripts.runDev.mockResolvedValue('http://localhost:1111')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
    delete process.env.AIO_LAUNCH_PREFIX_URL
  })

  // test('app:run launches a server for the user to accept a newly created cert', async () => {
  //   mockConfig.get.mockImplementation(() => {
  //     console.log('test 2, returning null')
  //     return null
  //   })
  //   command.error.mockImplementation((msg) => {
  //     console.log('msg', msg)
  //     throw new Error('mock error')
  //   })
  //   fs.existsSync.mockResolvedValue(true)
  //     .mockResolvedValueOnce(false)
  //     .mockResolvedValueOnce(false)
  //   fs.readFile.mockResolvedValue('file-data')
  //   const mockClose = jest.fn()
  //   https.createServer.mockImplementation((conf, callback) => {
  //     return {
  //       listen: () => {
  //         console.log('I am listening')
  //         callback()
  //       },
  //       close: mockClose
  //     }
  //   })
  //   command.argv = []
  //   await command.run()
  //   expect(mockClose).toHaveBeenCalled()
  //   expect(cli.action.stop).toHaveBeenCalled()
  // })
  // TODO: should add a test for a eventlistener that throws an exception, which will break things
})
