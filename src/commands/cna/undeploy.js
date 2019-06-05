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

const path = require('path')
const { Command, flags } = require('@oclif/command')
const ora = require('ora')
const chalk = require('chalk')

class CNAUndeploy extends Command {
  async run () {
    // cli input
    const { args, flags } = this.parse(CNAUndeploy)
    const appDir = path.resolve(args.path)

    // setup scripts, events and spinner
    // todo modularize (same for all cna-scripts wrappers)
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
        }
      }
      if (flags.verbose) {
        listeners.onProgress = item => {
          spinner.stopAndPersist({ text: chalk.dim(` > ${item}`) })
          spinner.start()
        }
      }
      const scripts = require('@adobe/io-cna-scripts')({ appDir, listeners })

      // undeploy
      if (!flags.static) {
        await scripts.undeployActions()
      }
      if (!flags.actions) {
        await scripts.undeployUI()
      }
      // final message
      this.log(chalk.green(chalk.bold('Undeploy done !')))
    } catch (error) {
      spinner.fail()
      this.error(error.message)
    }
  }
}

CNAUndeploy.description = `Builds and deploys a Cloud Native Application
`

CNAUndeploy.args = [
  {
    name: 'path',
    description: 'App Directory',
    default: '.'
  }
]
CNAUndeploy.flags = {
  static: flags.boolean({ char: 's', description: 'Only deploy static files.' }),
  actions: flags.boolean({ char: 'a', description: 'Only deploy actions.' }),

  verbose: flags.boolean({ char: 'd', description: 'Show verbose/debug output' }),
  help: flags.boolean({ char: 'h', description: 'Show help' })
}

module.exports = CNAUndeploy
