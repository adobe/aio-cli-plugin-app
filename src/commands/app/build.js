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

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')
const { flags } = require('@oclif/command')
const { buildApp, runPackageScript, wrapError, writeConfig } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Build extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Build)
    const config = this.getAppConfig()
    const filterActions = flags.action

    const spinner = ora()
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    // setup scripts, events and spinner
    try {
      await buildApp(config, flags, true, spinner, onProgress)
      
      // final message
      if (flags['skip-static']) {
        this.log(chalk.green(chalk.bold('Build success, your actions are ready to be deployed 👌')))
      } else {
        this.log(chalk.green(chalk.bold('Build success, your app is ready to be deployed 👌')))
      }

    } catch (error) {
      spinner.stop()
      this.error(wrapError(error))
    }
  }
}

Build.description = `Build an Adobe I/O App
`

Build.flags = {
  ...BaseCommand.flags,
  'skip-static': flags.boolean({
    description: 'Skip build of static files'
  }),
  'skip-actions': flags.boolean({
    description: 'Skip build of actions'
  }),
  action: flags.string({
    description: 'Build only a specific action, the flags can be specified multiple times',
    default: '',
    exclusive: ['skip-actions'],
    char: 'a',
    multiple: true
  })
}

Build.args = []

module.exports = Build
