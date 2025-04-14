/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const CleanBuildCommand = require('../../../src/commands/app/clean-build')
const fs = require('fs-extra')
const path = require('path')
const mockLogger = require('@adobe/aio-lib-core-logging')

jest.mock('fs-extra')
jest.mock('@adobe/aio-lib-core-logging')

jest.mock('../../../src/lib/app-helper', () => {
  return {
    getAppConfig: jest.fn(),
    getWebConfig: jest.fn(),
    getActionConfig: jest.fn()
  }
})

let command

beforeEach(() => {
  command = new CleanBuildCommand([])
  command.error = jest.fn()
  command.log = jest.fn()
  command.getAppExtConfigs = jest.fn()
  command.config = { runHook: jest.fn() }

  fs.existsSync.mockReset()
  fs.emptyDir.mockReset()
})

test('exports', () => {
  expect(typeof CleanBuildCommand).toEqual('function')
  expect(CleanBuildCommand.prototype instanceof require('../../../src/BaseCommand')).toBeTruthy()
})

test('description', () => {
  expect(CleanBuildCommand.description).toBeDefined()
})

test('flags', () => {
  expect(CleanBuildCommand.flags).toBeDefined()
  expect(CleanBuildCommand.flags.actions).toBeDefined()
  expect(CleanBuildCommand.flags['web-assets']).toBeDefined()
  expect(CleanBuildCommand.flags['dist-dir']).toBeDefined()
  expect(CleanBuildCommand.flags.extension).toBeDefined()
})

describe('run', () => {
  test('cleans action and web assets build paths', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        actions: {
          dist: '/dist/actions'
        },
        web: {
          distProd: '/dist/web'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Action path cleaned
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/actions')
    // Web assets path cleaned
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/web')
    // Expect dist dir not cleaned (default flag is false)
    expect(fs.emptyDir).not.toHaveBeenCalledWith('/dist')
  })

  test('cleans dist directory when flag is set', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        actions: {
          dist: '/dist/actions'
        },
        web: {
          distProd: '/dist/web'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    command.getAppExtConfigs.mockResolvedValue(config)
    
    // Mock parse to return dist-dir flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        actions: true,
        'web-assets': true,
        'dist-dir': true
      }
    })

    await command.run()

    // Expect all three directories to be cleaned
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/actions')
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/web')
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
  })

  test('skips cleaning non-existent directories', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        actions: {
          dist: '/dist/actions'
        },
        web: {
          distProd: '/dist/web'
        }
      }
    }

    // Directory doesn't exist
    fs.existsSync.mockReturnValue(false)
    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // No directories should be cleaned
    expect(fs.emptyDir).not.toHaveBeenCalled()
  })

  test('handles errors when cleaning directories', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        actions: {
          dist: '/dist/actions'
        },
        web: {
          distProd: '/dist/web'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    // Simulate an error when cleaning
    fs.emptyDir.mockRejectedValue(new Error('fs error'))
    command.getAppExtConfigs.mockResolvedValue(config)

    await expect(command.run()).rejects.toThrow('fs error')
  })
}) 