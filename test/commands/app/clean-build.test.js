/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const CleanBuild = require('../../../src/commands/app/clean-build')
const fs = require('fs-extra')
const ora = require('ora')
const chalk = require('chalk')
const path = require('path')

// Mock fs-extra, ora, and logging
jest.mock('fs-extra')
jest.mock('ora', () => jest.fn())
jest.mock('@adobe/aio-lib-core-logging', () => jest.fn().mockReturnValue({ debug: jest.fn(), error: jest.fn() }))

describe('CleanBuild Command', () => {
  let cmd, spinner

  beforeEach(() => {
    // Reset fs mocks
    fs.existsSync.mockReset()
    fs.remove.mockReset()
    fs.emptyDir.mockReset()

    // Spy on path.join for predictable rootDist
    jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'))

    // Setup spinner mock
    spinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis()
    }
    ora.mockReturnValue(spinner)

    // Instantiate command
    cmd = new CleanBuild([])
    cmd.parse = jest.fn().mockResolvedValue({ flags: {} })
    cmd.getAppExtConfigs = jest.fn().mockResolvedValue({})
    cmd.log = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('cleanAllBuildArtifacts', () => {
    test('logs info and returns when config is missing or no root', async () => {
      await cmd.cleanAllBuildArtifacts('ext1', null, spinner)
      await cmd.cleanAllBuildArtifacts('ext2', {}, spinner)
      expect(spinner.info).toHaveBeenCalledWith("No root directory found for extension 'ext1'")
      expect(spinner.info).toHaveBeenCalledWith("No root directory found for extension 'ext2'")
      expect(fs.existsSync).not.toHaveBeenCalled()
    })

    test('cleans multiple locations and removes tracking files', async () => {
      // Setup existsSync: app.dist, config.dist, rootDist, and tracking files exist
      fs.existsSync.mockImplementation(p => {
        return ['/app/dist', '/custom', '/root/dist', '/app/dist/last-built-actions.json', '/app/dist/last-deployed-actions.json', '/custom/last-built-actions.json', '/custom/last-deployed-actions.json', '/root/dist/last-built-actions.json', '/root/dist/last-deployed-actions.json']
          .includes(p)
      })
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()

      const config = { root: '/root', app: { dist: '/app/dist' }, dist: '/custom' }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)

      expect(spinner.start).toHaveBeenCalledWith("Cleaning build artifacts for 'ext'")
      // Check removals for each location
      ;['/app/dist', '/custom', '/root/dist'].forEach(location => {
        expect(fs.remove).toHaveBeenCalledWith(`${location}/last-built-actions.json`)
        expect(fs.remove).toHaveBeenCalledWith(`${location}/last-deployed-actions.json`)
        expect(fs.emptyDir).toHaveBeenCalledWith(location)
      })
      expect(spinner.succeed).toHaveBeenCalledWith(chalk.green("Cleaned build artifacts for 'ext'"))
    })

    test('skips removal when tracking files do not exist', async () => {
      fs.existsSync.mockReturnValue(false)
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: { dist: '/r/app' }, dist: '/d' }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)
      // No locations exist, so nothing to remove or empty
      expect(fs.remove).not.toHaveBeenCalled()
      expect(fs.emptyDir).not.toHaveBeenCalled()
      // Still indicates success
      expect(spinner.succeed).toHaveBeenCalledWith(chalk.green("Cleaned build artifacts for 'ext'"))

      expect(fs.remove).not.toHaveBeenCalled()
      expect(spinner.succeed).toHaveBeenCalled()
    })

    test('handles fs.remove error', async () => {
      fs.existsSync.mockReturnValue(true)
      const err = new Error('remove error')
      fs.remove.mockRejectedValue(err)
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: { dist: '/r/app' }, dist: '/d' }
      await expect(cmd.cleanAllBuildArtifacts('ext', config, spinner)).rejects.toThrow(err)
      expect(spinner.fail).toHaveBeenCalledWith(chalk.red(`Failed to clean build artifacts for 'ext': ${err.message}`))
    })

    test('handles fs.emptyDir error', async () => {
      fs.existsSync.mockReturnValue(true)
      fs.remove.mockResolvedValue()
      const err = new Error('empty error')
      fs.emptyDir.mockRejectedValue(err)
      const config = { root: '/r', app: { dist: '/r/app' }, dist: '/d' }
      await expect(cmd.cleanAllBuildArtifacts('ext', config, spinner)).rejects.toThrow(err)
      expect(spinner.fail).toHaveBeenCalledWith(chalk.red(`Failed to clean build artifacts for 'ext': ${err.message}`))
    })
  })

  describe('run', () => {
    test('calls cleanAllBuildArtifacts for each extension and logs success', async () => {
      const configs = { e1: {}, e2: {} }
      cmd.getAppExtConfigs.mockResolvedValue(configs)
      cmd.cleanAllBuildArtifacts = jest.fn().mockResolvedValue()

      await cmd.run()
      expect(cmd.cleanAllBuildArtifacts).toHaveBeenCalledTimes(2)
      expect(cmd.cleanAllBuildArtifacts).toHaveBeenCalledWith('e1', configs.e1, spinner)
      expect(cmd.cleanAllBuildArtifacts).toHaveBeenCalledWith('e2', configs.e2, spinner)
      expect(cmd.log).toHaveBeenCalledWith(chalk.green(chalk.bold('Build artifacts cleaned up successfully!')))
    })

    test('stops spinner and rethrows when cleanAllBuildArtifacts errors', async () => {
      const err = new Error('oops')
      cmd.getAppExtConfigs.mockResolvedValue({ e: {} })
      cmd.cleanAllBuildArtifacts = jest.fn().mockRejectedValue(err)

      await expect(cmd.run()).rejects.toThrow(err)
      expect(spinner.stop).toHaveBeenCalled()
    })
  })

  describe('debug logging and full branch coverage', () => {
    let mockCreator, mockLogger
    beforeEach(() => {
      mockCreator = require('@adobe/aio-lib-core-logging')
      mockLogger = mockCreator()
      mockLogger.debug.mockClear()
      // reset fs and spinner mocks
      fs.existsSync.mockReset()
      fs.remove.mockReset()
      fs.emptyDir.mockReset()
    })

    test('calls debug for cleaning locations, removals, and empty', async () => {

      fs.existsSync.mockImplementation(p => ['/only', '/only/last-built-actions.json', '/only/last-deployed-actions.json'].includes(p))
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: { dist: '/only' } }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaning locations for ext: /only')
      expect(mockLogger.debug).toHaveBeenCalledWith('Removed tracking file: /only/last-built-actions.json')
      expect(mockLogger.debug).toHaveBeenCalledWith('Removed tracking file: /only/last-deployed-actions.json')
      expect(mockLogger.debug).toHaveBeenCalledWith('Emptied directory: /only')
    })

    test('calls debug for config.dist branch', async () => {
      fs.existsSync.mockImplementation(p => ['/dist', '/dist/last-built-actions.json', '/dist/last-deployed-actions.json'].includes(p))
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: {}, dist: '/dist' }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaning locations for ext: /dist')
      expect(fs.emptyDir).toHaveBeenCalledWith('/dist')
    })

    test('calls debug for root/dist branch', async () => {
      fs.existsSync.mockImplementation(p => ['/r/dist', '/r/dist/last-built-actions.json', '/r/dist/last-deployed-actions.json'].includes(p))
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: {}, dist: undefined }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaning locations for ext: /r/dist')
      expect(fs.emptyDir).toHaveBeenCalledWith('/r/dist')
    })

    test('calls debug on error path', async () => {
      fs.existsSync.mockReturnValue(true)
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockRejectedValue(new Error('fail empty'))
      const config = { root: '/r', app: { dist: '/only' } }
      await expect(cmd.cleanAllBuildArtifacts('ext', config, spinner)).rejects.toThrow('fail empty')
      expect(mockLogger.debug).toHaveBeenCalledWith('Error cleaning artifacts for ext: fail empty')
    })

    test('removes only built tracking file', async () => {

      fs.existsSync.mockImplementation(p => ['/only', '/only/last-built-actions.json'].includes(p))
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: { dist: '/only' } }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaning locations for ext: /only')
      expect(mockLogger.debug).toHaveBeenCalledWith('Removed tracking file: /only/last-built-actions.json')
      expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('last-deployed-actions.json'))
      expect(fs.emptyDir).toHaveBeenCalledWith('/only')
    })

    test('removes only deployed tracking file', async () => {
      // deployed-actions.json exists, built-actions.json missing
      fs.existsSync.mockImplementation(p => ['/only', '/only/last-deployed-actions.json'].includes(p))
      fs.remove.mockResolvedValue()
      fs.emptyDir.mockResolvedValue()
      const config = { root: '/r', app: { dist: '/only' } }
      await cmd.cleanAllBuildArtifacts('ext', config, spinner)
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaning locations for ext: /only')
      expect(mockLogger.debug).toHaveBeenCalledWith('Removed tracking file: /only/last-deployed-actions.json')
      expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('last-built-actions.json'))
      expect(fs.emptyDir).toHaveBeenCalledWith('/only')
    })
  })
})
