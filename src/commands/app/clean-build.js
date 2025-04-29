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

const ora = require('ora')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

const BaseCommand = require('../../BaseCommand')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:clean-build', { provider: 'debug' })
const { LAST_BUILT_ACTIONS_FILENAME, LAST_DEPLOYED_ACTIONS_FILENAME } = require('../../lib/defaults')

class CleanBuild extends BaseCommand {
  async run () {
    const { flags } = await this.parse(CleanBuild)
    const configs = await this.getAppExtConfigs(flags)

    const spinner = ora()

    try {
      for (const [name, config] of Object.entries(configs)) {
        await this.cleanAllBuildArtifacts(name, config, spinner)
      }

      this.log(chalk.green(chalk.bold('Build artifacts cleaned up successfully!')))
    } catch (error) {
      spinner.stop()
      throw error
    }
  }

  async cleanAllBuildArtifacts (name, config, spinner) {
    try {
      spinner.start(`Cleaning build artifacts for '${name}'`)

      if (!config || !config.root) {
        spinner.info(`No root directory found for extension '${name}'`)
        return
      }

      const locations = []

      if (config.app && config.app.dist && fs.existsSync(config.app.dist)) {
        locations.push(config.app.dist)
      }

      if (config.dist && fs.existsSync(config.dist)) {
        locations.push(config.dist)
      }

      const rootDist = path.join(config.root, 'dist')
      if (fs.existsSync(rootDist)) {
        locations.push(rootDist)
      }

      aioLogger.debug(`Cleaning locations for ${name}: ${locations.join(', ')}`)

      // Clean all possible locations
      for (const location of locations) {
        // First try to remove tracking files explicitly
        const builtPath = path.join(location, LAST_BUILT_ACTIONS_FILENAME)
        const deployedPath = path.join(location, LAST_DEPLOYED_ACTIONS_FILENAME)

        if (fs.existsSync(builtPath)) {
          await fs.remove(builtPath)
          aioLogger.debug(`Removed tracking file: ${builtPath}`)
        }

        if (fs.existsSync(deployedPath)) {
          await fs.remove(deployedPath)
          aioLogger.debug(`Removed tracking file: ${deployedPath}`)
        }

        // Then empty the directory
        await fs.emptyDir(location)
        aioLogger.debug(`Emptied directory: ${location}`)
      }

      spinner.succeed(chalk.green(`Cleaned build artifacts for '${name}'`))
    } catch (err) {
      aioLogger.debug(`Error cleaning artifacts for ${name}: ${err.message}`)
      spinner.fail(chalk.red(`Failed to clean build artifacts for '${name}': ${err.message}`))
      throw err
    }
  }
}

CleanBuild.description = `Remove all build artifacts from the local machine
This command completely cleans all build artifacts from the dist directory including:
- Action build files
- Web assets (both production and development)
- Build tracking files
- Deployment tracking files

Note that this will require a full rebuild on your next build command.`

CleanBuild.flags = {
  ...BaseCommand.flags
}

module.exports = CleanBuild
