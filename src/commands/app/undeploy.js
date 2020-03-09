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

const ora = require('ora')
const chalk = require('chalk')
const fs = require('fs-extra')
// const path = require('path')

const { flags } = require('@oclif/command')

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')
const { wrapError } = require('../../lib/app-helper')

class Undeploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Undeploy)

    // setup scripts, events and spinner
    const spinner = ora()
    try {
      const listeners = {
        onStart: taskName => {
          this.log(chalk.bold(`> ${taskName}`))
          spinner.start(taskName)
        },
        onEnd: taskName => {
          spinner.succeed(chalk.green(taskName))
          this.log()
        },
        onWarning: warning => {
          spinner.warn(chalk.dim(chalk.yellow(warning)))
          spinner.start()
        },
        onProgress: info => {
          if (flags.verbose) {
            spinner.stopAndPersist({ text: chalk.dim(` > ${info}`) })
          } else {
            spinner.info(chalk.dim(info))
          }
          spinner.start()
        }
      }
      const scripts = AppScripts({ listeners })

      // undeploy
      if (!flags['skip-actions']) {
        if (fs.existsSync('manifest.yml')) {
          await scripts.undeployActions()
        } else {
          this.log('no manifest file, skipping action undeploy')
        }
      }
      if (!flags['skip-static']) {
        await scripts.undeployUI()
      }

      // final message
      this.log(chalk.green(chalk.bold('Undeploy done !')))
    } catch (error) {
      spinner.fail()
      this.error(wrapError(error))
    }
  }
}

Undeploy.description = `Undeploys an Adobe I/O App
`

Undeploy.flags = {
  ...BaseCommand.flags,
  'skip-static': flags.boolean({
    description: 'Skip build & deployment of static files'
  }),
  'skip-actions': flags.boolean({
    description: 'Skip action build & deploy'
  })
}

Undeploy.args = []

module.exports = Undeploy
