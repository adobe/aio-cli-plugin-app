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

// const path = require('path')
const CNABaseCommand = require('../../CNABaseCommand')
const { flags } = require('@oclif/command')
const ora = require('ora')
const open = require('open')
const chalk = require('chalk')

class CNADeploy extends CNABaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(CNADeploy)

    // const appDir = path.resolve(args.path)
    // const currDir = process.cwd()
    // process.chdir(appDir)

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
      const scripts = require('@adobe/io-cna-scripts')({ listeners })

      // build phase
      if (!flags.static) {
        await scripts.buildActions()
      }
      if (!flags.actions) {
        await scripts.buildUI()
      }
      // deploy phase
      if (!flags.build) {
        if (!flags.static) {
          await scripts.deployActions()
        }
        if (!flags.actions) {
          const url = await scripts.deployUI()
          if (flags.verbose) this.log(chalk.blue(url))
          else open(url) // do not open if verbose as the user probably wants to look at the console
        }
      }

      // final message
      if (flags.build) {
        this.log(chalk.green(chalk.bold('Build success, your app is ready to be deployed 👌')))
      } else if (flags.actions) {
        this.log(chalk.green(chalk.bold('Well done, your actions are now online 🏄')))
      } else {
        this.log(chalk.green(chalk.bold('Well done, your app is now online 🏄')))
      }
      // process.chdir(currDir)
    } catch (error) {
      spinner.fail()
      // process.chdir(currDir)
      this.error(error.message)
    }
  }
}

CNADeploy.description = `Builds and deploys a Cloud Native Application
`

CNADeploy.flags = {
  ...CNABaseCommand.flags,
  build: flags.boolean({ char: 'b', description: 'Only build, don\'t deploy.' }),
  // todo remove these 2 options and autodetect UI/action dir + ui/actions changes
  static: flags.boolean({ char: 's', description: 'Only deploy static files.', exclusive: ['actions'] }),
  actions: flags.boolean({ char: 'a', description: 'Only deploy actions.', exclusive: ['static'] })

  // todo no color/spinner/open output
  // 'no-fancy': flags.boolean({ description: 'Simple output and no url open' }),
}

// for now we remove support for path arg
// until https://github.com/adobe/aio-cli-plugin-config/issues/44 is resolved
CNADeploy.args = [] // CNABaseCommand.args

module.exports = CNADeploy
