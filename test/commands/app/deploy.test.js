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

const TheCommand = require('../../../src/commands/app/deploy')
const BaseCommand = require('../../../src/BaseCommand')

const mockFS = require('fs-extra')

const mockScripts = require('@adobe/aio-app-scripts')()

beforeEach(() => {
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
  expect(typeof TheCommand.flags.action).toBe('object')
  expect(TheCommand.flags.action.char).toBe('a')
  expect(typeof TheCommand.flags.action.description).toBe('string')
  expect(TheCommand.flags.action.exclusive).toEqual(['skip-actions'])

  expect(typeof TheCommand.flags['skip-actions']).toBe('object')
  expect(typeof TheCommand.flags['skip-actions'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-static']).toBe('object')
  expect(typeof TheCommand.flags['skip-static'].description).toBe('string')

  expect(typeof TheCommand.flags['skip-deploy']).toBe('object')
  expect(typeof TheCommand.flags['skip-deploy'].description).toBe('string')
  expect(TheCommand.flags['skip-deploy'].exclusive).toEqual(['skip-build'])

  expect(typeof TheCommand.flags['skip-build']).toBe('object')
  expect(typeof TheCommand.flags['skip-build'].description).toBe('string')
  expect(TheCommand.flags['skip-build'].exclusive).toEqual(['skip-deploy'])
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()

    mockScripts.deployActions.mockResolvedValue({})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build & deploy an App with no flags', async () => {
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App verbose', async () => {
    command.argv = ['-v']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
  })

  test('build & deploy --skip-static', async () => {
    command.argv = ['--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('build & deploy only some actions using --action', async () => {
    command.argv = ['--skip-static', '-a', 'a', '-a', 'b', '--action', 'c']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)

    expect(mockScripts.buildActions).toHaveBeenCalledWith([], {
      filterActions: ['a', 'b', 'c']
    })
    expect(mockScripts.deployActions).toHaveBeenCalledWith([], {
      filterEntities: { actions: ['a', 'b', 'c'] }
    })
  })

  test('build & deploy actions with no actions folder and no manifest', async () => {
    command.argv = ['--skip-static']
    mockFS.existsSync.mockReturnValue(false)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('build & deploy actions with no actions folder but with a manifest', async () => {
    command.argv = ['--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('build & deploy with --skip-actions', async () => {
    command.argv = ['--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions with no static folder', async () => {
    command.argv = ['--skip-actions']
    mockFS.existsSync.mockReturnValue(false)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('--skip-deploy', async () => {
    command.argv = ['--skip-deploy']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
  })

  test('--skip-deploy --verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--skip-deploy', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
  })

  test('--skip-deploy --skip-actions', async () => {
    command.argv = ['--skip-deploy', '--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
  })

  test('--skip-deploy --skip-static', async () => {
    command.argv = ['--skip-deploy', '--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('--skip-build', async () => {
    command.argv = ['--skip-build']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --verbose', async () => {
    command.argv = ['--skip-build', '--verbose']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-actions', async () => {
    command.argv = ['--skip-build', '--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-static', async () => {
    command.argv = ['--skip-build', '--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(0)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(0)
  })

  test('deploy should show ui url', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockScripts.deployUI.mockResolvedValue('https://example.com')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockScripts.deployUI.mockResolvedValue('https://example.com')
    process.env.AIO_LAUNCH_URL_PREFIX = 'http://prefix?fake='
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
    delete process.env.AIO_LAUNCH_PREFIX_URL
  })

  test('deploy should show action urls', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockScripts.deployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action' },
        { name: 'pkg/actionNoUrl' }
      ]
    })
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  })

  test('should fail if scripts.deployActions fails', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure')
    mockScripts.deployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)
    expect(mockScripts.deployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.deployUI fails', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure')
    mockScripts.deployActions.mockResolvedValue('ok')
    mockScripts.deployUI.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
  })
})
