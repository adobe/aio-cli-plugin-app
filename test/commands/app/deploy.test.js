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

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

const mockWebLib = require('@adobe/aio-lib-web')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

jest.mock('cli-ux')
const { cli } = require('cli-ux')

beforeEach(() => {
  mockWebLib.mockReset('deployWeb')
  mockWebLib.mockReset('buildWeb')
  mockFS.existsSync.mockReset()
  helpers.writeConfig.mockReset()
  helpers.runPackageScript.mockReset()
  jest.restoreAllMocks()

  helpers.wrapError.mockImplementation(msg => msg)
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
    command.appConfig = {}

    mockRuntimeLib.deployActions.mockResolvedValue({})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build & deploy an App with no flags', async () => {
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App verbose', async () => {
    command.argv = ['-v']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
  })

  test('build & deploy --skip-static', async () => {
    command.argv = ['--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
  })

  test('build & deploy only some actions using --action', async () => {
    command.argv = ['--skip-static', '-a', 'a', '-a', 'b', '--action', 'c']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)

    expect(helpers.buildApp).toHaveBeenCalledWith({}, expect.objectContaining({ action: ['a', 'b', 'c'] }), expect.anything(), expect.anything(), expect.anything())
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledWith({}, {
      filterEntities: { actions: ['a', 'b', 'c'] }
    },
    expect.any(Function))
  })

  test('build & deploy actions with no actions folder and no manifest', async () => {
    command.argv = ['--skip-static']
    mockFS.existsSync.mockReturnValue(false)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(0)
  })

  test('build & deploy actions with no actions folder but with a manifest', async () => {
    command.argv = ['--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions', async () => {
    command.argv = ['--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions with no static folder', async () => {
    command.argv = ['--skip-actions']
    mockFS.existsSync.mockReturnValue(false)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(0)
  })

  test('--skip-deploy', async () => {
    command.argv = ['--skip-deploy']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
  })

  test('--skip-deploy --verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    command.argv = ['--skip-deploy', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
  })

  test('--skip-deploy --skip-static', async () => {
    command.argv = ['--skip-deploy', '--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
  })

  test('--skip-build', async () => {
    command.argv = ['--skip-build']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(helpers.buildApp).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --verbose', async () => {
    command.argv = ['--skip-build', '--verbose']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(helpers.buildApp).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-actions', async () => {
    command.argv = ['--skip-build', '--skip-actions']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(helpers.buildApp).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-static', async () => {
    command.argv = ['--skip-build', '--skip-static']
    mockFS.existsSync.mockReturnValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(helpers.buildApp).toHaveBeenCalledTimes(0)
  })

  test('deploy should show ui url', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should open ui url with --open', async () => {
    cli.open = jest.fn()
    mockFS.existsSync.mockReturnValue(true)
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(cli.open).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    mockConfig.get.mockReturnValue('http://prefix?fake=')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
  })

  test('deploy should show ui and open exc url if AIO_LAUNCH_PREFIX_URL is set and --open', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    mockConfig.get.mockReturnValue('http://prefix?fake=')
    cli.open = jest.fn()
    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
    expect(cli.open).toHaveBeenCalledWith('http://prefix?fake=https://example.com')
  })

  test('deploy should show action urls', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockRuntimeLib.deployActions.mockResolvedValue({
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
    mockRuntimeLib.deployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(helpers.buildApp).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.deployWeb fails', async () => {
    mockFS.existsSync.mockReturnValue(true)
    const error = new Error('mock failure')
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on deployWeb call , with verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })
    command.argv = ['-v']
    await command.run()
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on deployWeb call , without verbose', async () => {
    mockFS.existsSync.mockReturnValue(true)
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })
    await command.run()
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('build & deploy (app hooks missing)', async () => {
    mockFS.existsSync.mockReturnValue(true)
    helpers.runPackageScript
      .mockRejectedValueOnce('error-1')
      .mockRejectedValueOnce('error-2')

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith('error-1')
    expect(command.log).toHaveBeenCalledWith('error-2')
  })
})
