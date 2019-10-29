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

const TheCommand = require('../../../src/commands/cna/deploy')
const CNABaseCommand = require('../../../src/CNABaseCommand')

// mocks
const mockOpen = require('open')
jest.mock('open', () => jest.fn())
const mockScripts = require('@adobe/io-cna-scripts')()

beforeEach(() => {
  jest.restoreAllMocks()
})

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
  expect(typeof TheCommand.flags.actions).toBe('object')
  expect(TheCommand.flags.actions.char).toBe('a')
  expect(typeof TheCommand.flags.actions.description).toBe('string')
  expect(TheCommand.flags.actions.exclusive).toEqual(['static'])

  expect(typeof TheCommand.flags.static).toBe('object')
  expect(TheCommand.flags.static.char).toBe('s')
  expect(typeof TheCommand.flags.static.description).toBe('string')
  expect(TheCommand.flags.static.exclusive).toEqual(['actions'])

  expect(typeof TheCommand.flags.build).toBe('object')
  expect(TheCommand.flags.build.char).toBe('b')
  expect(typeof TheCommand.flags.build.description).toBe('string')
  expect(TheCommand.flags.build.exclusive).toEqual(['deploy'])

  expect(typeof TheCommand.flags.deploy).toBe('object')
  expect(TheCommand.flags.deploy.char).toBe('d')
  expect(typeof TheCommand.flags.deploy.description).toBe('string')
  expect(TheCommand.flags.deploy.exclusive).toEqual(['build'])
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

  test('build & deploy a CNA with no flags', async () => {
    mockScripts.deployUI.mockResolvedValue('https://example.com')
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledWith('https://example.com')
  })

  test('build & deploy a CNA verbose', async () => {
    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledTimes(0) // with verbose no open
  })

  test('build & deploy only actions', async () => {
    command.argv = ['-a']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('build & deploy only static files', async () => {
    command.argv = ['-s']
    mockScripts.deployUI.mockResolvedValue('https://example.com')
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledWith('https://example.com')
  })

  test('build only', async () => {
    command.argv = ['-b']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('build only --verbose', async () => {
    command.argv = ['-b', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('build only static files', async () => {
    command.argv = ['-bs']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('build only actions', async () => {
    command.argv = ['-ba']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('deploy only', async () => {
    command.argv = ['-d']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
    expect(mockOpen).toHaveBeenCalledTimes(1)
  })

  test('deploy only --verbose', async () => {
    command.argv = ['-d', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('deploy only static files', async () => {
    command.argv = ['-ds']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
    expect(mockOpen).toHaveBeenCalledTimes(1)
  })

  test('deploy only actions', async () => {
    command.argv = ['-ba']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
    expect(mockOpen).toHaveBeenCalledTimes(0)
  })

  test('should fail if scripts.deployActions fails', async () => {
    const error = new Error('mock failure')
    mockScripts.deployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.deployUI fails', async () => {
    const error = new Error('mock failure')
    mockScripts.deployActions.mockResolvedValue('ok')
    mockScripts.deployUI.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
  })
})
