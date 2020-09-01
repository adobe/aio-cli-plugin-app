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

const TheCommand = require('../../../src/commands/app/undeploy')
const BaseCommand = require('../../../src/BaseCommand')

const mockFS = require('fs-extra')

// mocks
const mockScripts = require('@adobe/aio-app-scripts')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')

beforeEach(() => {
  mockRuntimeLib.undeployActions.mockReset()
  mockScripts.mockReset('undeployWeb')
  mockFS.existsSync.mockReset()
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
  expect(typeof TheCommand.flags['skip-actions']).toBe('object')
  expect(typeof TheCommand.flags['skip-actions'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-static']).toBe('object')
  expect(typeof TheCommand.flags['skip-static'].description).toBe('string')
})

describe('run', () => {
  let command
  beforeEach(() => {
    mockFS.existsSync.mockReset()
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = {}
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('undeploy an App with no flags', async () => {
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy an App with --verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy skip-actions', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy skip-actions verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--skip-actions', '-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy skip static', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(0)
  })

  test('undeploy skip static verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--skip-static', '-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(0)
  })

  test('undeploy an app with no backend', async () => {
    mockFS.existsSync.mockImplementation(f => !f.includes('manifest'))
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith('no manifest file, skipping action undeploy')
  })

  test('undeploy an app with no frontend', async () => {
    mockFS.existsSync.mockImplementation(f => !f.includes('web-src'))
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith('no web-src, skipping web-src undeploy')
  })

  test('should fail if scripts.undeployActions fails', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure Actions')
    mockRuntimeLib.undeployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.undeployWeb fails', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure UI')
    mockScripts.mockRejectedValue('undeployWeb', error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.undeployWeb).toHaveBeenCalledTimes(1)
  })
})
