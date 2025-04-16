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

const ora = require('ora')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

const { Flags } = require('@oclif/core')
const BaseCommand = require('../../BaseCommand')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:clean-build', { provider: 'debug' })

class CleanBuild extends BaseCommand {
  async run () {
    // cli input
    const { flags } = await this.parse(CleanBuild)

    const configs = await this.getAppExtConfigs(flags)

    // Process all extensions
    const keys = Object.keys(configs)
    const values = Object.values(configs)

    const spinner = ora()
    try {
      // First clean tracking files if requested
      if (flags['tracking-files']) {
        await this.cleanTrackingFiles(configs, spinner)
      }

      // Then clean each extension
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.cleanOneExt(k, v, flags, spinner)
      }
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }

    // final message
    this.log(chalk.green(chalk.bold('Build artifacts cleaned up successfully!')))
  }

  async cleanTrackingFiles (configs, spinner) {
    try {
      spinner.start('Cleaning build tracking files')

      // Find root config to get the dist path
      const rootConfig = Object.values(configs)[0]
      if (!rootConfig || !rootConfig.app || !rootConfig.app.dist) {
        spinner.info('No valid configuration found for tracking files')
        return
      }

      // let's check both possible locations for last-built-actions.json:
      // 1. In the root/dist/application and also in  the root/dist
      const possiblePaths = [
        // In the app.dist directory
        path.join(rootConfig.app.dist, 'last-built-actions.json'),

        // In the parent directory of app.dist
        path.join(path.dirname(rootConfig.app.dist), 'last-built-actions.json')
      ]

      aioLogger.debug(`Checking for tracking files at: ${possiblePaths.join(', ')}`)

      let fileRemoved = false

      // Try each possible path
      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          aioLogger.debug(`Found tracking file at: ${filePath}`)
          try {
            await fs.remove(filePath)
            fileRemoved = true
            aioLogger.debug(`Successfully removed tracking file at: ${filePath}`)
          } catch (err) {
            aioLogger.debug(`Error removing file at ${filePath}: ${err.message}`)
          }
        } else {
          aioLogger.debug(`No tracking file found at: ${filePath}`)
        }
      }

      if (fileRemoved) {
        spinner.succeed(chalk.green('Cleaned build tracking file (last-built-actions.json)'))
      } else {
        spinner.info(chalk.blue('No build tracking file found to clean'))
      }
    } catch (err) {
      spinner.fail(chalk.red(`Failed to clean build tracking file: ${err.message}`))
      throw err
    }
  }

  async cleanOneExt (name, config, flags, spinner) {
    const actionsBuildPath = flags.actions ? this.getActionsBuildPath(config) : null

    // Determine web asset paths based on flags
    let webProdPath = null
    let webDevPath = null

    if (flags['web-assets'] && config.app.hasFrontend) {
      // Get the parent directory for web assets
      const parentDir = config.web.distProd ? path.dirname(config.web.distProd) : null

      // Check if we have a valid path to work with
      if (parentDir) {
        // Standard directories for production and development web assets
        const standardProdDir = path.join(parentDir, 'web-prod')
        const standardDevDir = path.join(parentDir, 'web-dev')

        // Set web-prod path if prod flag or if neither flags are set (default behavior)
        if (flags.prod || (!flags.dev && !flags.prod)) {
          // Use config path if provided, otherwise use standard
          webProdPath = config.web.distProd || standardProdDir
        }

        // Set dev path if dev flag or if neither flags are set (default behavior)
        if (flags.dev || (!flags.dev && !flags.prod)) {
          webDevPath = standardDevDir
        }
      }
    }

    // Clean actions build artifacts
    if (flags.actions && config.app.hasBackend && actionsBuildPath) {
      try {
        spinner.start(`Cleaning action build artifacts for '${name}'`)
        await this.cleanDirectory(actionsBuildPath)
        spinner.succeed(chalk.green(`Cleaned action build artifacts for '${name}'`))
      } catch (err) {
        spinner.fail(chalk.red(`Failed to clean action build artifacts for '${name}'`))
        throw err
      }
    }

    // Clean production web assets build artifacts
    if (webProdPath) {
      try {
        spinner.start(`Cleaning production web assets for '${name}'`)
        const cleaned = await this.cleanDirectory(webProdPath)
        if (cleaned) {
          spinner.succeed(chalk.green(`Cleaned production web assets for '${name}'`))
        } else {
          spinner.info(chalk.blue(`No production web assets found to clean for '${name}'`))
        }
      } catch (err) {
        spinner.fail(chalk.red(`Failed to clean production web assets for '${name}'`))
        throw err
      }
    }

    // Clean development web assets build artifacts
    if (webDevPath) {
      try {
        spinner.start(`Cleaning development web assets for '${name}'`)
        const cleaned = await this.cleanDirectory(webDevPath)
        if (cleaned) {
          spinner.succeed(chalk.green(`Cleaned development web assets for '${name}'`))
        } else {
          spinner.info(chalk.blue(`No development web assets found to clean for '${name}'`))
        }
      } catch (err) {
        spinner.fail(chalk.red(`Failed to clean development web assets for '${name}'`))
        throw err
      }
    }

    // Clean dist directory if specified
    if (flags['dist-dir'] && config.app.dist) {
      try {
        spinner.start(`Cleaning dist directory for '${name}'`)

        // We need to preserve the last-deployed-actions.json file
        // First, check if it exists and back it up if it does
        const distParent = path.dirname(config.app.dist)
        const lastDeployedPath = path.join(distParent, 'dist', 'last-deployed-actions.json')
        let deploymentData = null

        if (fs.existsSync(lastDeployedPath)) {
          try {
            deploymentData = await fs.readJson(lastDeployedPath)
            aioLogger.debug('Preserved deployment tracking data')
          } catch (err) {
            aioLogger.debug('Could not read deployment tracking data, continuing with clean')
          }
        }

        // Clean the directory
        await this.cleanDirectory(config.app.dist)

        // Restore the deployment tracking file if we had data
        if (deploymentData) {
          try {
            await fs.ensureDir(path.dirname(lastDeployedPath))
            await fs.writeJson(lastDeployedPath, deploymentData, { spaces: 2 })
            aioLogger.debug('Restored deployment tracking data')
          } catch (err) {
            aioLogger.debug('Could not restore deployment tracking data')
            this.log(chalk.yellow('Warning: Could not restore deployment tracking file. This will not affect your deployed resources, but may require a full redeploy on next deploy.'))
          }
        }

        spinner.succeed(chalk.green(`Cleaned dist directory for '${name}' (preserved deployment tracking)`))
      } catch (err) {
        spinner.fail(chalk.red(`Failed to clean dist directory for '${name}'`))
        throw err
      }
    }
  }

  getActionsBuildPath (config) {
    // Determine the actions build directory based on config
    if (config.actions && config.actions.dist) {
      return config.actions.dist
    }
    return path.join(config.app.dist, 'actions')
  }

  async cleanDirectory (dirPath) {
    if (dirPath && fs.existsSync(dirPath)) {
      aioLogger.debug(`Cleaning directory: ${dirPath}`)
      await fs.emptyDir(dirPath)
      return true
    }
    aioLogger.debug(`Directory does not exist, nothing to clean: ${dirPath}`)
    return false
  }

  async removeFileIfExists (filePath) {
    if (filePath && fs.existsSync(filePath)) {
      aioLogger.debug(`Removing file: ${filePath}`)
      await fs.remove(filePath)
      return true
    }
    return false
  }
}

CleanBuild.description = `Remove build artifacts from the local machine
This command removes build artifacts from the local machine without affecting deployed resources.
It helps developers get a clean build environment without having to manually find and delete build files.`

CleanBuild.flags = {
  ...BaseCommand.flags,
  actions: Flags.boolean({
    description: '[default: true] Clean action build artifacts if any',
    default: true,
    allowNo: true
  }),
  'web-assets': Flags.boolean({
    description: '[default: true] Clean web assets build artifacts if any',
    default: true,
    allowNo: true
  }),
  'dist-dir': Flags.boolean({
    description: '[default: false] Clean the entire dist directory (preserves deployment tracking)',
    default: false
  }),
  'tracking-files': Flags.boolean({
    description: '[default: true] Clean build tracking file (forces fresh build on next build without affecting deployment tracking)',
    default: true,
    allowNo: true
  }),
  dev: Flags.boolean({
    description: 'Clean development web assets',
    default: false
  }),
  prod: Flags.boolean({
    description: 'Clean production web assets (default if neither dev nor prod specified)',
    default: false
  }),
  extension: Flags.string({
    description: 'Clean only a specific extension, this flag can be specified multiple times',
    char: 'e',
    multiple: true
  })
}

module.exports = CleanBuild
