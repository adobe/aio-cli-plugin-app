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

jest.mock('../../../src/lib/app-helper.js')
const helpers = require('../../../src/lib/app-helper.js')

const mockFS = require('fs-extra')

const mockConfigData = {
  app: {
    hasFrontend: true,
    hasBackend: true
  }
}

jest.mock('../../../src/lib/config-loader', () => {
  return () => mockConfigData
})

// mocks
const { stdout } = require('stdout-stderr')
const mockWebLib = require('@adobe/aio-lib-web')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')

beforeEach(() => {
  mockRuntimeLib.undeployActions.mockReset()
  helpers.runPackageScript.mockReset()
  mockFS.existsSync.mockReset()
  helpers.wrapError.mockImplementation(msg => msg)
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

  expect(typeof TheCommand.flags['skip-web-assets']).toBe('object')
  expect(typeof TheCommand.flags['skip-web-assets'].description).toBe('string')
})

/**
 * @param {object} pre pre-undeploy-hook script
 * @param {object} undeployActions undeploy-actions script
 * @param {object} undeployStatic undeploy-static script
 * @param {object} post post-undeploy-hook script
 */
function __setupMockHooks (pre = {}, undeployActions = {}, undeployStatic = {}, post = {}) {
  helpers.runPackageScript
    .mockResolvedValueOnce(pre) // pre-app-undeploy
    .mockResolvedValueOnce(undeployActions) // undeploy-actions
    .mockResolvedValueOnce(undeployStatic) // undeploy-static
    .mockResolvedValueOnce(post) // post-app-undeploy
}

describe('run', () => {
  let command
  beforeEach(() => {
    mockFS.existsSync.mockReset()
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = mockConfigData
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('undeploy an App with no flags no hooks', async () => {
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy an App with no flags with hooks', async () => {
    __setupMockHooks()

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(0)
  })

  test('pre post undeploy hook errors --skip-actions --skip-static', async () => {
    helpers.runPackageScript
      .mockRejectedValueOnce('error-pre-app-undeploy') // pre-app-deploy (logs error)
      .mockRejectedValueOnce('error-post-app-undeploy') // post-app-deploy (logs error)

    command.argv = ['--skip-actions', '--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledTimes(3)
    expect(command.log).toHaveBeenCalledWith('error-pre-app-undeploy')
    expect(command.log).toHaveBeenCalledWith('error-post-app-undeploy')
    expect(command.log).toHaveBeenCalledWith(expect.stringMatching('Undeploy done !'))
  })

  test('undeploy an App with --verbose', async () => {
    command.argv = ['-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy skip-actions', async () => {
    command.argv = ['--skip-actions']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy skip-actions verbose', async () => {
    command.argv = ['--skip-actions', '-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('undeploy skip static', async () => {
    command.argv = ['--skip-static']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(0)
  })

  test('undeploy skip web assets', async () => {
    command.argv = ['--skip-web-assets']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(0)
  })

  test('undeploy skip static verbose', async () => {
    command.argv = ['--skip-static', '-v']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(0)
  })

  test('undeploy an app with no backend', async () => {
    command.appConfig = { app: { hasFrontend: true, hasBackend: false } }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
    expect(command.log).toHaveBeenCalledWith('no manifest file, skipping action undeploy')
  })

  test('undeploy an app with no frontend', async () => {
    command.appConfig = { app: { hasFrontend: false, hasBackend: true } }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith('no frontend, skipping frontend undeploy')
  })

  test('should fail if scripts.undeployActions fails', async () => {
    const error = new Error('mock failure Actions')
    mockRuntimeLib.undeployActions.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockRuntimeLib.undeployActions).toHaveBeenCalledTimes(1)
  })

  test('should fail if scripts.undeployWeb fails', async () => {
    const error = new Error('mock failure UI')
    mockWebLib.undeployWeb.mockRejectedValue(error)
    await command.run()
    expect(command.error).toHaveBeenCalledWith(error)
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
  })

  test('spinner should be called for progress logs on undeployWeb call , with verbose', async () => {
    mockRuntimeLib.undeployActions.mockResolvedValue('ok')
    mockWebLib.undeployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })
    command.argv = ['-v']
    await command.run()
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
    expect(stdout.output).toEqual(expect.stringContaining('progress log'))
  })

  test('spinner should be called for progress logs on undeployWeb call , without verbose', async () => {
    mockRuntimeLib.undeployActions.mockResolvedValue('ok')
    mockWebLib.undeployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })
    await command.run()
    expect(mockWebLib.undeployWeb).toHaveBeenCalledTimes(1)
  })
})
