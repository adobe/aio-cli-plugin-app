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
// const path = require('path')

const { flags } = require('@oclif/command')

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')

class Undeploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Undeploy)

    // const appDir = path.resolve(args.path)
    // const currDir = process.cwd()
    // process.chdir(appDir)

    // setup scripts, events and spinner
    // todo modularize (same for all app-scripts wrappers)
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
      if (!flags.static) {
        await scripts.undeployActions()
      }
      if (!flags.actions) {
        await scripts.undeployUI()
      }
      // final message
      this.log(chalk.green(chalk.bold('Undeploy done !')))
      // process.chdir(currDir)
    } catch (error) {
      spinner.fail()
      // process.chdir(currDir)
      this.error(error)
    }
  }
}

Undeploy.description = `Builds and deploys a Cloud Native Application
`

Undeploy.flags = {
  ...BaseCommand.flags,
  static: flags.boolean({ char: 's', description: 'Only deploy static files.', exclusive: ['actions'] }),
  actions: flags.boolean({ char: 'a', description: 'Only deploy actions.', exclusive: ['static'] })
}

// for now we remove support for path arg
// until https://github.com/adobe/aio-cli-plugin-config/issues/44 is resolved
// Deploy.args = BaseCommand.args

module.exports = Undeploy
