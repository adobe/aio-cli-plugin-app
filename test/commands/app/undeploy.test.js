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

// mocks
const mockScripts = require('@adobe/aio-app-scripts')()

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
  expect(typeof TheCommand.flags.actions).toBe('object')
  expect(TheCommand.flags.actions.char).toBe('a')
  expect(typeof TheCommand.flags.actions.description).toBe('string')
  expect(TheCommand.flags.actions.exclusive).toEqual(['static'])

  expect(typeof TheCommand.flags.static).toBe('object')
  expect(TheCommand.flags.static.char).toBe('s')
  expect(typeof TheCommand.flags.static.description).toBe('string')
  expect(TheCommand.flags.static.exclusive).toEqual(['actions'])
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('undeploy an App with no flags', async () => {
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(1)
  })

  test('undeploy an App with --verbose', async () => {
    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(1)
  })

  test('undeploy only actions', async () => {
    command.argv = ['-a']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(0)
  })

  test('undeploy only actions --verbose', async () => {
    command.argv = ['-a']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(0)
  })

  test('undeploy only static files', async () => {
    command.argv = ['-s']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(1)
  })

  test('undeploy only static files --verbose', async () => {
    command.argv = ['-s', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.undeployActions fails', async () => {
    const error = new Error('mock failure')
    mockScripts.undeployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.undeployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.undeployUI fails', async () => {
    const error = new Error('mock failure')
    mockScripts.undeployUI.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.undeployUI).toHaveBeenCalledTimes(0)
  })
})
