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

// Mock modules
jest.mock('fs-extra')
jest.mock('@adobe/aio-lib-core-logging', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn()
  }
  return jest.fn(() => mockLogger)
})

// Mock ora
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis()
  }))
})

jest.mock('path', () => {
  const originalPath = jest.requireActual('path')
  return {
    ...originalPath,
    join: jest.fn().mockImplementation((...args) => args.join('/')),
    dirname: jest.fn(p => {
      // Handle the specific case in our test
      if (p === '/dist/non-existent-dir') return '/dist/application'
      if (p === '/dist/application') return '/dist'
      // Fall back to the simple implementation for other paths
      return p.substring(0, p.lastIndexOf('/'))
    })
  }
})

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

  // Reset mocks
  fs.existsSync.mockReset().mockReturnValue(true)
  fs.emptyDir.mockReset().mockResolvedValue()
  fs.remove.mockReset().mockResolvedValue()
  fs.readJson.mockReset().mockResolvedValue({})
  fs.writeJson.mockReset().mockResolvedValue()
  fs.ensureDir.mockReset().mockResolvedValue()
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
  expect(CleanBuildCommand.flags['tracking-files']).toBeDefined()
  expect(CleanBuildCommand.flags.dev).toBeDefined()
  expect(CleanBuildCommand.flags.prod).toBeDefined()
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
          dist: '/dist/application/actions'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Action path cleaned
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/application/actions')
    // Web assets path cleaned
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/application/web-prod')
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
          dist: '/dist/application/actions'
        },
        web: {
          distProd: '/dist/application/web-prod'
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
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/application/actions')
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/application/web-prod')
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
          dist: '/dist/application/actions'
        },
        web: {
          distProd: '/dist/application/web-prod'
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
          dist: '/dist/application/actions'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    // Simulate an error when cleaning
    fs.emptyDir.mockRejectedValue(new Error('fs error'))
    command.getAppExtConfigs.mockResolvedValue(config)

    await expect(command.run()).rejects.toThrow('fs error')
  })

  test('cleans tracking files when flag is set', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        actions: {
          dist: '/dist/application/actions'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return tracking-files flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        actions: true,
        'web-assets': true,
        'tracking-files': true
      }
    })

    await command.run()

    // Expect tracking file to be removed
    expect(fs.remove).toHaveBeenCalledWith('/dist/last-built-actions.json')
  })

  test('preserves deployment tracking when cleaning dist directory', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return dist-dir flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    await command.run()

    // Check if deployment tracking file was read
    expect(fs.readJson).toHaveBeenCalledWith('/dist/last-deployed-actions.json')
    // Check if the dist directory was cleaned
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
    // Check if the deployment tracking file was restored
    expect(fs.ensureDir).toHaveBeenCalledWith('/dist')
    expect(fs.writeJson).toHaveBeenCalledWith('/dist/last-deployed-actions.json', { deploymentData: 'test-data' }, { spaces: 2 })
  })

  test('handles errors when preserving deployment tracking', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    fs.writeJson.mockRejectedValue(new Error('write error'))
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return dist-dir flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    // Should not throw error but log a warning
    await command.run()
    expect(command.log).toHaveBeenCalled()
  })

  test('handles missing tracking files configuration', async () => {
    const config = {}

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include tracking-files
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'tracking-files': true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    await command.run()

    // Should show info message
    expect(mockOraInstance.info).toHaveBeenCalled()
    expect(fs.remove).not.toHaveBeenCalled()
  })

  test('handles errors when cleaning tracking files', async () => {
    const config = {
      application: {
        app: {
          dist: '/dist'
        }
      }
    }

    // Instead of mocking fs.remove, let's directly patch the cleanTrackingFiles method
    // so the error properly propagates up to the run() method
    const originalCleanTrackingFiles = command.cleanTrackingFiles
    command.cleanTrackingFiles = jest.fn().mockImplementation(() => {
      throw new Error('remove error')
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include tracking-files
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'tracking-files': true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    await expect(command.run()).rejects.toThrow('remove error')

    // Restore the original method after test
    command.cleanTrackingFiles = originalCleanTrackingFiles
  })

  test('cleans only dev web assets when dev flag is set', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    fs.existsSync.mockImplementation(path => path === '/dist/application/web-dev')
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return dev flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        dev: true,
        prod: false
      }
    })

    await command.run()

    // Should clean web-dev but not web-prod
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/application/web-dev')
    expect(fs.emptyDir).not.toHaveBeenCalledWith('/dist/application/web-prod')
  })

  test('cleans only prod web assets when prod flag is set', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return prod flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        dev: false,
        prod: true
      }
    })

    await command.run()

    // Should clean web-prod but not web-dev
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist/application/web-prod')
    expect(fs.emptyDir).not.toHaveBeenCalledWith('/dist/application/web-dev')
  })

  test('getActionsBuildPath returns correct path with actions.dist', () => {
    const config = {
      actions: {
        dist: '/custom/actions/path'
      },
      app: {
        dist: '/dist'
      }
    }

    const result = command.getActionsBuildPath(config)
    expect(result).toBe('/custom/actions/path')
  })

  test('getActionsBuildPath falls back to app.dist/actions', () => {
    const config = {
      app: {
        dist: '/dist'
      }
    }

    const result = command.getActionsBuildPath(config)
    expect(result).toBe('/dist/actions')
  })

  test('cleanDirectory returns false for non-existent directory', async () => {
    fs.existsSync.mockReturnValue(false)

    const result = await command.cleanDirectory('/non-existent')
    expect(result).toBe(false)
    expect(fs.emptyDir).not.toHaveBeenCalled()
  })

  test('cleanDirectory returns true for existing directory', async () => {
    fs.existsSync.mockReturnValue(true)

    const result = await command.cleanDirectory('/existing')
    expect(result).toBe(true)
    expect(fs.emptyDir).toHaveBeenCalledWith('/existing')
  })

  test('removeFileIfExists returns false for non-existent file', async () => {
    fs.existsSync.mockReturnValue(false)

    const result = await command.removeFileIfExists('/non-existent')
    expect(result).toBe(false)
    expect(fs.remove).not.toHaveBeenCalled()
  })

  test('removeFileIfExists returns true for existing file', async () => {
    fs.existsSync.mockReturnValue(true)

    const result = await command.removeFileIfExists('/existing')
    expect(result).toBe(true)
    expect(fs.remove).toHaveBeenCalledWith('/existing')
  })

  test('handles errors when cleaning web dev assets', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    // Make the emptyDir call fail when attempting to clean web-dev
    fs.emptyDir.mockImplementation(path => {
      if (path === '/dist/application/web-dev') {
        return Promise.reject(new Error('web-dev clean error'))
      }
      return Promise.resolve()
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include dev flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        dev: true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    await expect(command.run()).rejects.toThrow('web-dev clean error')
    expect(mockOraInstance.fail).toHaveBeenCalled()
  })

  test('handles errors when reading deployment tracking data', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Get the mock logger instance that was created by the jest.mock above
    const mockLogger = require('@adobe/aio-lib-core-logging')()
    // Reset the mock to ensure it's clean
    mockLogger.debug.mockClear()

    // Mock path.join to make the paths predictable
    path.join.mockImplementation((...args) => args.join('/'))

    // Setup fs.existsSync to return true to trigger the readJson call
    fs.existsSync.mockReturnValue(true)

    // Setup fs.readJson to throw an error
    const testError = new Error('Error reading JSON file')
    fs.readJson.mockRejectedValue(testError)

    // Set up flags to include dist-dir flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Verify that debug log was called with expected message
    expect(mockLogger.debug).toHaveBeenCalledWith('Could not read deployment tracking data, continuing with clean')
  })

  test('displays warning when restoring deployment tracking fails', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Directly access the module using require to mock it
    const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:clean-build', { provider: 'debug' })

    // Mock the debug method on the specific logger instance
    aioLogger.debug = jest.fn()

    // Make sure existsSync returns true for the deployment tracking file check
    fs.existsSync.mockImplementation(path => {
      return true
    })

    // Mock readJson to return sample data
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })

    // Mock ensureDir to succeed
    fs.ensureDir.mockResolvedValue()

    // Mock writeJson to throw an error to trigger the warning message about deployment tracking
    fs.writeJson.mockImplementation(() => {
      throw new Error('write error')
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to enable dist-dir flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    await command.run()

    // Verify the warning message was logged
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))

    // We don't need to check aioLogger.debug since it might not be accessible to mock properly
    // The important part is that the warning is displayed to the user
  })

  test('logs info message when no web assets exist to clean', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    // Setup to test the scenario where web assets directories exist but are empty
    // 1. Make cleanDirectory return false (indicating directory was empty or not found)
    // 2. Ensure fs.existsSync returns true so that cleanDirectory is called
    fs.existsSync.mockReturnValue(true)

    // Store the original method to restore it later
    const originalCleanDirectory = command.cleanDirectory
    // Mock cleanDirectory to return false, indicating the directory didn't exist or was empty
    command.cleanDirectory = jest.fn().mockResolvedValue(false)

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to trigger both prod and dev web asset cleaning
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        dev: true,
        prod: true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    await command.run()

    // Check if the info messages were shown for both prod and dev assets
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No production web assets found to clean'))
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No development web assets found to clean'))

    // Restore original method
    command.cleanDirectory = originalCleanDirectory
  })

  test('properly handles JSON write errors when restoring deployment tracking', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    fs.ensureDir.mockResolvedValue(true)
    // Explicitly fail the writeJson operation to test error handling when restoring deployment tracking
    fs.writeJson.mockImplementation(() => {
      throw new Error('write error')
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return dist-dir flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    await command.run()

    // Verify that a warning message is shown when the deployment tracking file can't be restored
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))
  })

  test('handles no tracking files found to clean', async () => {
    const config = {
      application: {
        app: {
          dist: '/dist'
        }
      }
    }

    // Set fs.existsSync to return false to simulate no tracking files found
    fs.existsSync.mockReturnValue(false)

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include tracking-files
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'tracking-files': true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    await command.run()

    // Verify that an info message is shown when no tracking files are found
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No build tracking file found to clean'))
  })

  test('handles error when trying to remove tracking file', async () => {
    const config = {
      application: {
        app: {
          dist: '/dist'
        }
      }
    }

    // Make tracking file exist but removal fails locally
    fs.existsSync.mockReturnValue(true)
    fs.remove.mockImplementation(() => {
      // We throw an error here, but it should be caught within the cleanTrackingFiles method
      // and not propagate to cause the test to fail
      throw new Error('local remove error')
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include tracking-files
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'tracking-files': true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    // This should not throw because the error is caught inside the cleanTrackingFiles method
    await command.run()

    // The outer catch block should not be triggered, so no spinner.fail should be called
    expect(mockOraInstance.fail).not.toHaveBeenCalledWith(expect.stringContaining('Failed to clean build tracking file'))
  })

  test('propagates error when cleaning tracking files fails', async () => {
    const config = {
      application: {
        app: {
          dist: '/dist'
        }
      }
    }

    // Create a real error to throw
    const testError = new Error('tracking file removal error')

    // Override fs.existsSync to throw an error, which will be caught in the outer try/catch
    fs.existsSync.mockImplementation(() => {
      throw testError
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include tracking-files flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'tracking-files': true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    // The error should be propagated up
    await expect(command.run()).rejects.toThrow(testError)

    // Verify spinner.fail was called with appropriate message
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean build tracking file'))
  })

  test('propagates error when cleaning production web assets fails', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    // Mock fs.existsSync to return true so cleanDirectory will attempt to call fs.emptyDir
    fs.existsSync.mockReturnValue(true)

    // Define an error to throw from fs.emptyDir
    const testError = new Error('web-prod clean error')

    // Mock fs.emptyDir to throw when cleaning web-prod
    fs.emptyDir.mockImplementation(path => {
      if (path.includes('web-prod')) {
        throw testError
      }
      return Promise.resolve()
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include web-assets and prod flags
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        prod: true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    // The error should be propagated up
    await expect(command.run()).rejects.toThrow(testError)

    // Verify spinner.fail was called with appropriate message
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean production web assets'))
  })

  test('propagates error when cleaning dist directory fails', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Mock fs.existsSync to return true
    fs.existsSync.mockReturnValue(true)

    // Define an error to throw from fs.emptyDir
    const testError = new Error('dist dir clean error')

    // Mock fs.emptyDir to throw when cleaning dist directory
    fs.emptyDir.mockImplementation(path => {
      if (path === '/dist') {
        throw testError
      }
      return Promise.resolve()
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include dist-dir flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    // The error should be propagated up
    await expect(command.run()).rejects.toThrow(testError)

    // Verify spinner.fail was called with appropriate message
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean dist directory'))
  })

  test('throws error when cleaning development web assets fails', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    // Mock fs.existsSync to return true for all paths
    fs.existsSync.mockImplementation(path => {
      return true
    })

    // Create an error to be thrown when cleaning web-dev assets
    const webDevError = new Error('web-dev clean error')

    // Mock emptyDir to specifically fail when cleaning web-dev assets
    fs.emptyDir.mockImplementation(path => {
      if (path.includes('web-dev')) {
        return Promise.reject(webDevError)
      }
      return Promise.resolve()
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Set flags to trigger cleaning of dev web assets
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        dev: true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    // Verify the error is propagated up and not swallowed
    await expect(command.run()).rejects.toThrow(webDevError)

    // Verify spinner.fail was called with appropriate message
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean development web assets'))
  })

  test('logs warning but continues when restoring deployment tracking file fails', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Mock fs.existsSync to return true for all paths including the last-deployed-actions.json file
    fs.existsSync.mockImplementation(path => {
      return true
    })

    // Mock readJson to return valid deployment data
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })

    // Mock ensureDir to succeed
    fs.ensureDir.mockResolvedValue()

    // Simulate an error when trying to write the deployment tracking file
    const writeError = new Error('write error')
    fs.writeJson.mockImplementation(() => {
      throw writeError
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Set flags to enable dist-dir cleaning
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    // Run the command - this should not throw since the error is caught and handled with a warning
    await command.run()

    // Verify the warning message was logged
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))

    // Verify that the command still completed successfully despite the error
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
  })

  test('handles non-standard errors when cleaning development web assets', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/application/web-prod'
        }
      }
    }

    // Mock to ensure we hit the webDevPath clean section
    fs.existsSync.mockReturnValue(true)

    // Create a special non-Error object to test error handling with non-standard error formats
    const customErrorObject = {
      message: 'custom error format',
      toString: () => 'String representation of error'
    }

    // Override cleanDirectory to throw our custom error
    command.cleanDirectory = jest.fn().mockImplementation(dirPath => {
      if (dirPath && dirPath.includes('web-dev')) {
        return Promise.reject(customErrorObject)
      }
      return Promise.resolve(true)
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Set flags to trigger web-dev cleaning
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        dev: true
      }
    })

    const mockOraInstance = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    }

    require('ora').mockReturnValue(mockOraInstance)

    // Verify that the non-standard error is still propagated correctly
    await expect(command.run()).rejects.toEqual(customErrorObject)

    // Verify spinner.fail was called with appropriate message
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean development web assets'))
  })

  test('handles non-standard errors when restoring deployment tracking file', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Ensure we go through all the required paths
    fs.existsSync.mockReturnValue(true)
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    fs.ensureDir.mockResolvedValue()

    // Create a non-standard error object without a message property
    const nonStandardError = {
      code: 'EACCES',
      toString: () => 'Permission denied'
    }

    // Make writeJson throw our non-standard error
    fs.writeJson.mockImplementation(() => {
      throw nonStandardError
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Need dist-dir flag to enter the dist cleanup section
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    // Should not throw as the error is caught and handled with a warning
    await command.run()

    // Verify warning is shown even with non-standard error formats
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))

    // Now test with a standard Error
    fs.writeJson.mockImplementation(() => {
      throw new Error('Unknown error')
    })

    // Should still handle the standard error without crashing
    await command.run()

    // Verify warning was still shown
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))
  })

  test('uses provided web production path when prod flag is set', async () => {
    // Create a custom implementation that logs the paths
    let webProdPathUsed = null

    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/web-prod' // Explicitly define distProd
        }
      }
    }

    // Mock path.join to make the paths predictable
    path.join.mockImplementation((...args) => args.join('/'))

    // Mock existsSync to return true so cleanDirectory will do something
    fs.existsSync.mockReturnValue(true)

    // Mock parse to set prod flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        prod: true,
        dev: false
      }
    })

    // Mock cleanDirectory to capture what path was used
    command.cleanDirectory = jest.fn().mockImplementation(async (dirPath) => {
      if (dirPath.includes('web-prod')) {
        webProdPathUsed = dirPath
      }
      return true
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Check that the function was called with the standard prod dir path
    expect(webProdPathUsed).toBe('/dist/web-prod')
  })

  test('uses production web path by default when neither prod nor dev flags are set', async () => {
    // Create a custom implementation that logs the paths
    let webProdPathUsed = null

    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/web-prod' // Explicitly define distProd
        }
      }
    }

    // Mock path.join to make the paths predictable
    path.join.mockImplementation((...args) => args.join('/'))

    // Mock existsSync to return true so cleanDirectory will do something
    fs.existsSync.mockReturnValue(true)

    // Mock parse to set default flags (neither prod nor dev)
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        prod: false,
        dev: false
      }
    })

    // Mock cleanDirectory to capture what path was used
    command.cleanDirectory = jest.fn().mockImplementation(async (dirPath) => {
      if (dirPath.includes('web-prod')) {
        webProdPathUsed = dirPath
      }
      return true
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Check that the function was called with the standard prod dir path
    expect(webProdPathUsed).toBe('/dist/web-prod')
  })

  test('cleans web production assets when web-assets flag is true', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        web: {
          distProd: '/dist/web-prod' // Explicitly define distProd
        }
      }
    }

    // Mock path.join to make the paths predictable
    path.join.mockImplementation((...args) => args.join('/'))

    // Mock existsSync to return true
    fs.existsSync.mockReturnValue(true)

    // Instead of mocking fs.emptyDir which gets overwritten in beforeEach, use cleanDirectory
    // which will in turn call fs.emptyDir
    command.cleanDirectory = jest.fn().mockResolvedValue(true)

    // Mock parse to explicitly set web-assets flag to true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        prod: true,
        dev: false
      }
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Check that cleanDirectory was called with the web-prod path
    expect(command.cleanDirectory).toHaveBeenCalledWith('/dist/web-prod')
  })

  test('preserves and restores deployment tracking data when cleaning dist directory', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Mock path.join to make the paths predictable
    path.join.mockImplementation((...args) => args.join('/'))

    // Setup fs.existsSync to return true for all paths
    fs.existsSync.mockReturnValue(true)

    // Setup mock for fs.readJson to always succeed
    fs.readJson.mockResolvedValue({ someData: 'test' })

    // Set up flags to include dist-dir flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Verify that writeJson was called for restoring the tracking file
    expect(fs.writeJson).toHaveBeenCalled()
  })

  test('falls back to standard prod directory if configured one does not exist', async () => {
    // Create a config where distProd is explicitly set to null
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        },
        web: {
          // Set distProd to null but ensure we have a valid parentDir path
          // that can be used to construct standardProdDir
          distProd: null
        }
      }
    }

    // Mock path.join to make the paths predictable
    // This is important: path.dirname is called on config.web.distProd to get parentDir
    // Since distProd is null, we need to handle this differently
    const mockJoin = jest.fn().mockImplementation((...args) => args.join('/'))
    path.join = mockJoin

    // Mock path.dirname to ensure parentDir is correctly set
    // This is crucial - set a fallback path when distProd is null
    path.dirname.mockImplementation(p => {
      if (p === null) return '/dist'
      return p.substring(0, p.lastIndexOf('/'))
    })

    // Mock existsSync to return true
    fs.existsSync.mockReturnValue(true)

    // Mock cleanDirectory to capture calls
    command.cleanDirectory = jest.fn().mockResolvedValue(true)

    // Set flags with web-assets and prod
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        prod: true,
        dev: false
      }
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Verify that cleanDirectory was called with standardProdDir
    // since config.web.distProd is null
    expect(command.cleanDirectory).toHaveBeenCalledWith('/dist/web-prod')
  })

  test('continues cleaning dist directory when deployment tracking data cannot be read', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }

    // Get the mock logger instance that was created by the jest.mock above
    const mockLogger = require('@adobe/aio-lib-core-logging')()
    // Reset the mock to ensure it's clean
    mockLogger.debug.mockClear()

    // Mock path.join to make the paths predictable
    path.join.mockImplementation((...args) => args.join('/'))

    // Setup fs.existsSync to return true
    fs.existsSync.mockReturnValue(true)

    // Setup fs.readJson to throw an error
    const testError = new Error('Error reading JSON file')
    fs.readJson.mockRejectedValue(testError)

    // Set up flags to include dist-dir flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    await command.run()

    // Verify that debug log was called with expected message
    expect(mockLogger.debug).toHaveBeenCalledWith('Could not read deployment tracking data, continuing with clean')
  })
})

describe('branch coverage for clean-build.js', () => {
  let originalExistsSync

  beforeAll(() => {
    // remember real existsSync so we can selectively override it
    originalExistsSync = fs.existsSync
  })

  afterAll(() => {
    fs.existsSync = originalExistsSync
  })

  test('skips web-assets cleaning when parentDir is falsy (line 122)', async () => {
    // 1) config.web.distProd = null, config.app.dist = '' → parentDir = ''
    const configMap = {
      application: {
        app: { hasFrontend: true, hasBackend: false, dist: '' },
        web: { distProd: null }
      }
    }
    command.getAppExtConfigs.mockResolvedValue(configMap)

    // parse flags: web-assets on, but no actions, no prod/dev → only web-assets branch would run
    command.parse = jest.fn().mockResolvedValue({
      flags: { actions: false, 'web-assets': true, dev: false, prod: false }
    })

    // run → should not throw, and should never call emptyDir for anything
    await command.run()

    expect(fs.emptyDir).not.toHaveBeenCalled()
  })

  test('skips last-deployed-actions.json logic when file does not exist (line 196)', async () => {
    // 2) config.app.dist = '/dist', dist-dir on
    const configMap = {
      application: {
        app: { dist: '/dist' /* hasBackend/hasFrontend don't matter */ }
      }
    }
    command.getAppExtConfigs.mockResolvedValue(configMap)

    // simulate: dist folder exists but last-deployed JSON does NOT
    fs.existsSync = jest.fn((p) => {
      if (p.endsWith('last-deployed-actions.json')) {
        return false
      }
      // for '/dist' itself, we want true so cleanDirectory runs
      return true
    })

    command.parse = jest.fn().mockResolvedValue({
      flags: { actions: false, 'web-assets': false, 'dist-dir': true }
    })

    await command.run()

    // we should have cleaned /dist
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
    // but never tried to read or write the JSON
    expect(fs.readJson).not.toHaveBeenCalled()
    expect(fs.writeJson).not.toHaveBeenCalled()
  })
})
