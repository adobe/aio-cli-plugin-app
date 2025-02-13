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

const BaseCommand = require('../../BaseCommand')
const { Flags } = require('@oclif/core')
const fs = require('fs-extra')
const path = require('node:path')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:clean', { provider: 'debug' })

const cleanDir = async (dir) => {
  const spinner = ora('Cleaning directory').start()
  try {
    await fs.remove(dir)
    // spinner.succeed(`${path.relative(process.cwd(), dir)}`)
    spinner.succeed(`${dir}`)
  } catch (err) {
    spinner.fail(`${chalk.red(dir)}: ${err.message}`)
    throw err
  }
}

class Clean extends BaseCommand {
  async run () {
    // cli input
    const { flags } = await this.parse(Clean)

    const buildConfigs = await this.getAppExtConfigs(flags)
    // use Object.entries to iterate over the buildConfigs
    for (const [key, buildConfig] of Object.entries(buildConfigs)) {
      // clean actions.dist
      await cleanDir(buildConfig.actions.dist)
      // clean web.dist(s)
      await cleanDir(buildConfig.web.distDev)
      await cleanDir(buildConfig.web.distProd)
      // clean last-built-actions.json and last-deployed-actions.json
      await cleanDir(path.join(buildConfig.root, 'last-built-actions.json'))
      await cleanDir(path.join(buildConfig.root, 'last-deployed-actions.json'))
    }
  }
}

Clean.description = `Clean an App Builder App

Remove the build artifacts of an Adobe App Builder App.
`

Clean.flags = {
  ...BaseCommand.flags
}

module.exports = Clean
