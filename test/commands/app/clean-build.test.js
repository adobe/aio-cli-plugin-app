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

    fs.existsSync.mockReturnValue(true)
    fs.readJson.mockResolvedValue({ deploymentData: 'test-data' })
    // The directory creation succeeds but the file write fails
    fs.ensureDir.mockResolvedValue()
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

    // This explicitly verifies lines 228-229 are called with the warning
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not restore deployment tracking file'))
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

    // The directories don't exist for cleanDirectory but exist for other checks
    fs.existsSync.mockImplementation(path => {
      // Return false SPECIFICALLY for the cleanDirectory check
      // This ensures we hit the "else" branch at line 161-162
      if (path === '/dist/application/web-prod' || path === '/dist/application/web-dev') {
        return false
      }
      return true
    })
    
    command.getAppExtConfigs.mockResolvedValue(config)

    // Mock parse to include flags that will trigger both web-prod and web-dev cleaning
    command.parse = jest.fn().mockResolvedValue({
      flags: {
        'web-assets': true,
        'dev': true,
        'prod': true
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

    // This explicitly verifies lines 161-162 are called
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No production web assets found to clean'))
    expect(mockOraInstance.info).toHaveBeenCalledWith(expect.stringContaining('No development web assets found to clean'))
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
})
