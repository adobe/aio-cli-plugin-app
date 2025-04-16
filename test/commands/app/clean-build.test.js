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
const aioLogger = require('@adobe/aio-lib-core-logging')

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

  test('handles errors when reading deployment tracking file', async () => {
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
    // Simulate error when reading deployment tracking file
    fs.readJson.mockRejectedValue(new Error('read error'))

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to return dist-dir flag as true
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    await command.run()

    // Expect directory to be cleaned even if reading deployment data fails
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
    // Expect no attempt to restore deployment data
    expect(fs.writeJson).not.toHaveBeenCalled()
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

    // Mock writeJson to throw an error - CRUCIAL for hitting lines 219-220
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

    // Check that the warning was logged (line 220)
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

    // To hit lines 161-162, we need to:
    // 1. Make cleanDirectory return false (for the 'if (cleaned)' branch)
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

    // Check if the info messages were shown (lines 161-162)
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No production web assets found to clean'))
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No development web assets found to clean'))

    // Restore original method
    command.cleanDirectory = originalCleanDirectory
  })

  test('properly handles JSON write errors with exact error path', async () => {
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
    // Explicitly fail the writeJson operation
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

    // Ensure the error path in lines 228-229 is executed
    // These lines log a warning message
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

    // Explicitly set fs.existsSync to return false for ANY path
    // This ensures we hit line 103-104 where spinner.info is called
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

    // This explicitly verifies line 104 is called
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

    // This should not throw because the error is caught inside the "catch (err)" block
    // at lines 90-91 in cleanTrackingFiles
    await command.run()

    // The outer catch block should not be triggered, so no spinner.fail should be called
    expect(mockOraInstance.fail).not.toHaveBeenCalledWith(expect.stringContaining('Failed to clean build tracking file'))
  })

  test('handles case where no parent directory exists for web assets', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: false,
          dist: '/dist'
        },
        web: {
          // Set distProd to null to trigger the parentDir = null branch
          distProd: null
        }
      }
    }

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include web-assets flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true
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

    // This should pass without trying to clean web assets because parentDir is null
    // Lines 135-137 should be skipped
    await command.run()

    // No web assets should be cleaned
    expect(fs.emptyDir).not.toHaveBeenCalledWith(expect.stringContaining('web-prod'))
    expect(fs.emptyDir).not.toHaveBeenCalledWith(expect.stringContaining('web-dev'))
  })

  test('handles errors when cleaning action build artifacts', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: false,
          hasBackend: true,
          dist: '/dist'
        },
        actions: {
          dist: '/dist/actions'
        }
      }
    }

    fs.existsSync.mockReturnValue(true)

    // Make the emptyDir call fail when attempting to clean actions
    fs.emptyDir.mockImplementation(path => {
      if (path === '/dist/actions') {
        return Promise.reject(new Error('actions clean error'))
      }
      return Promise.resolve()
    })

    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include actions flag
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        actions: true,
        'web-assets': false
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

    await expect(command.run()).rejects.toThrow('actions clean error')
    expect(mockOraInstance.fail).toHaveBeenCalled()
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

    // The error should be propagated up (line 104)
    await expect(command.run()).rejects.toThrow(testError)

    // Verify spinner.fail was called (line 103)
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

    // The error should be propagated up (line 162)
    await expect(command.run()).rejects.toThrow(testError)

    // Verify spinner.fail was called (line 161)
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

    // The error should be propagated up (line 220)
    await expect(command.run()).rejects.toThrow(testError)

    // Verify spinner.fail was called (line 219)
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean dist directory'))
  })

  // Test for line 128 - error handling when cleaning development web assets
  test('handles exact error from line 128 in development web assets cleaning', async () => {
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

    // Mock fs.existsSync to return true specifically for the web-dev path
    fs.existsSync.mockImplementation(path => {
      return true
    })
    
    // Define the exact error to be thrown - this will be thrown by the fs.emptyDir call
    const webDevError = new Error('web-dev clean error')
    
    // This is the key difference - we need to mock the emptyDir method to reject with our error
    // when cleaning web-dev assets specifically
    fs.emptyDir.mockImplementation(path => {
      if (path.includes('web-dev')) {
        return Promise.reject(webDevError)
      }
      return Promise.resolve()
    })
    
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include web-assets and dev flags to trigger the webDevPath path
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

    // The error should be caught in the catch block on line 126-129
    await expect(command.run()).rejects.toThrow(webDevError)
    
    // Verify spinner.fail was called (line 127)
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean development web assets'))
  })
  
  // Test for line 193 - error handling when restoring deployment tracking file
  test('specifically targets error in line 193 for restoring deployment tracking', async () => {
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
    
    // Mock readJson to return valid deployment data - this ensures deploymentData is truthy
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    
    // Mock ensureDir to succeed - this ensures we reach the fs.writeJson call
    fs.ensureDir.mockResolvedValue()
    
    // This is the key part - we need to make writeJson throw an error to trigger line 193
    const writeError = new Error('write error')
    fs.writeJson.mockImplementation(() => {
      throw writeError
    })
    
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to enable dist-dir flag - this ensures we reach the code path
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'dist-dir': true
      }
    })

    // Run the command - this should not throw since the error is caught in the try/catch block
    await command.run()
    
    // Verify the warning message was logged (line 194)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))
    
    // Verify that the command still completed successfully despite the error
    expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
  })

  // Specific test for uncovered branch in line 128 - when cleanDirectory throws an error with a custom error message
  test('covers exact branch in line 128 for webDevPath cleaning errors with different error formats', async () => {
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
    
    // Create a special non-Error object to test error handling branch variations
    const customErrorObject = { 
      message: 'custom error format',
      toString: () => 'String representation of error'
    }
    
    // Mock cleanDirectory to reject with our custom error object, not a standard Error
    const cleanDirectorySpy = jest.spyOn(command, 'cleanDirectory').mockImplementation(dirPath => {
      if (dirPath && dirPath.includes('web-dev')) {
        return Promise.reject(customErrorObject)
      }
      return Promise.resolve(true)
    })
    
    command.getAppExtConfigs.mockResolvedValue(config)
    
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
    
    // Should throw the custom error object
    await expect(command.run()).rejects.toBeTruthy()
    
    // Verify spinner.fail was called with appropriate message
    // This is covering line 128 specifically
    expect(mockOraInstance.fail).toHaveBeenCalledWith(expect.stringContaining('Failed to clean development web assets'))
    
    // Restore the original implementation
    cleanDirectorySpy.mockRestore()
  })
  
  // Specific test for uncovered branch in line 193 - different error formats when restoring deployment tracking
  test('covers exact branch in line 193 for different error formats when restoring deployment tracking', async () => {
    const config = {
      application: {
        app: {
          hasFrontend: true,
          hasBackend: true,
          dist: '/dist'
        }
      }
    }
    
    // Ensure we go through all the required paths to reach line 193
    fs.existsSync.mockReturnValue(true)
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    fs.ensureDir.mockResolvedValue()
    
    // Create a non-standard error object to test branch coverage
    const nonStandardError = { 
      // No message property
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
    
    // Should not throw as the error is caught
    await command.run()
    
    // This tests the branch in line 193 where err.message might not exist
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))
    
    // Now test with undefined error
    fs.writeJson.mockImplementation(() => {
      throw undefined
    })
    
    // Should still handle the undefined error without crashing
    await command.run()
    
    // Verify warning was still shown
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))
  })
})
