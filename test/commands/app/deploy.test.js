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

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

const mockWebLib = require('@adobe/aio-lib-web')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

const mockConfigData = {
  app: {
    hasFrontend: true,
    hasBackend: true
  },
  web: {
    injectedConfig: 'asldkfj'
  }
}

jest.mock('../../../src/lib/config-loader', () => {
  return () => mockConfigData
})

jest.mock('cli-ux')
const { cli } = require('cli-ux')

beforeEach(() => {
  mockWebLib.mockReset('deployWeb')
  mockWebLib.mockReset('buildWeb')
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
    command.appConfig = mockConfigData
    command.appConfig.actions = { dist: 'actions' }
    command.appConfig.web.distProd = 'dist'
    command.config = { runCommand: jest.fn() }
    command.build = jest.fn()

    mockRuntimeLib.deployActions.mockResolvedValue({})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('build & deploy an App with no flags', async () => {
    await command.run()
    // expect(command.error).toHaveBeenCalledWith(0)
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('build & deploy an App verbose', async () => {
    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, verbose: true }), expect.anything())
  })

  test('build & deploy --skip-static', async () => {
    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, 'skip-static': true }), expect.anything())
  })

  test('build & deploy only some actions using --action', async () => {
    command.argv = ['--skip-static', '-a', 'a', '-a', 'b', '--action', 'c']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)

    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, 'skip-static': true, action: ['a', 'b', 'c'] }), expect.anything())
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledWith(mockConfigData, {
      filterEntities: { actions: ['a', 'b', 'c'] }
    },
    expect.any(Function))
  })

  test('build & deploy actions with no actions folder and no manifest', async () => {
    command.argv = ['--skip-static']
    command.appConfig = { app: { hasFrontend: true, hasBackend: false } }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, 'skip-static': true }), expect.anything())
  })

  test('build & deploy actions with no actions folder but with a manifest', async () => {
    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions', async () => {
    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, 'skip-actions': true }), expect.anything())
  })

  test('build & deploy with --skip-actions with no static folder', async () => {
    command.argv = ['--skip-actions']
    command.appConfig = { app: { hasFrontend: false, hasBackend: false } }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, 'skip-actions': true }), expect.anything())
  })

  test('build & deploy with no manifest.yml', async () => {
    command.appConfig = { app: { hasFrontend: true, hasBackend: false } }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true }), expect.anything())
  })

  test('--skip-deploy', async () => {
    command.argv = ['--skip-deploy']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true }), expect.anything())
  })

  test('--skip-deploy --verbose', async () => {
    command.argv = ['--skip-deploy', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': true, verbose: true }), expect.anything())
  })

  test('--skip-deploy --skip-static', async () => {
    command.argv = ['--skip-deploy', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(1)
  })

  test('--skip-build', async () => {
    command.argv = ['--skip-build']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --verbose', async () => {
    command.argv = ['--skip-build', '--verbose']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-actions', async () => {
    command.argv = ['--skip-build', '--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(0)
  })

  test('--skip-build --skip-static', async () => {
    command.argv = ['--skip-build', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(command.build).toHaveBeenCalledTimes(0)
  })

  test('--no-force-build', async () => {
    command.argv = ['--no-force-build']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledTimes(1)
    expect(command.build).toHaveBeenCalledWith(command.appConfig, expect.objectContaining({ 'force-build': false }), expect.anything()) // force-build is true by default for build cmd
  })

  test('deploy should show ui url', async () => {
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should open ui url with --open', async () => {
    cli.open = jest.fn()
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(cli.open).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
  })

  test('deploy should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    mockWebLib.deployWeb.mockResolvedValue('https://example.com')
    mockConfig.get.mockReturnValue('http://prefix?fake=')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('https://example.com'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=https://example.com'))
  })

  test('deploy should show ui and open exc url if AIO_LAUNCH_PREFIX_URL is set and --open', async () => {
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
    const error = new Error('mock failure')
    mockRuntimeLib.deployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(command.build).toHaveBeenCalled()
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.deployWeb fails', async () => {
    const error = new Error('mock failure')
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on deployWeb call , with verbose', async () => {
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
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })
    command.appConfig.web = { injectedConfig: 'sdf' }
    await command.run()
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(1)
  })

  test('deploy (--skip-actions and --skip-static)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Nothing to deploy/))
  })

  test('deploy (--skip-actions)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Well done, your app is now online/))
  })

  test('deploy (--skip-static)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Well done, your actions are now online/))
  })

  test('deploy (has deploy-actions and deploy-static hooks)', async () => {
    const noScriptFound = undefined
    const childProcess = {}
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy
      .mockResolvedValueOnce(childProcess) // deploy-actions (uses hook)
      .mockResolvedValueOnce(childProcess) // deploy-static (uses hook)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Well done, your app is now online/))
  })

  test('deploy (pre and post hooks have errors, --skip-actions and --skip-static)', async () => {
    helpers.runPackageScript
      .mockRejectedValueOnce('error-pre-app-deploy') // pre-app-deploy (logs error)
      .mockRejectedValueOnce('error-post-app-deploy') // post-app-deploy (logs error)

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)

    expect(command.log).toHaveBeenCalledTimes(3)
    expect(command.log).toHaveBeenCalledWith('error-pre-app-deploy')
    expect(command.log).toHaveBeenCalledWith('error-post-app-deploy')
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching(/Nothing to deploy/))
  })

  test('deploy (deploy-actions hook has an error)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy (no error)
      .mockRejectedValueOnce('error-deploy-actions') // deploy-actions (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // deploy-static (will not reach here)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy (will not reach here)

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith('error-deploy-actions')

    expect(command.log).toHaveBeenCalledTimes(0)
  })

  test('deploy (deploy-static hook has an error)', async () => {
    const noScriptFound = undefined
    helpers.runPackageScript
      .mockResolvedValueOnce(noScriptFound) // pre-app-deploy (no error)
      .mockResolvedValueOnce(noScriptFound) // deploy-actions (uses inbuilt, no error)
      .mockRejectedValueOnce('error-deploy-static') // deploy-static (rethrows error)
      .mockResolvedValueOnce(noScriptFound) // post-app-deploy (will not reach here)

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledWith('error-deploy-static')

    expect(command.log).toHaveBeenCalledTimes(0)
  })
})
