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
const webLib = require('@adobe/aio-lib-web')
const { runPackageScript, wrapError } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Undeploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Undeploy)
    const config = this.getAppConfig()

    // setup scripts, events and spinner
    const spinner = ora()
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }
    try {
      // undeploy
      try {
        await runPackageScript('pre-app-undeploy')
      } catch (err) {
        this.log(err)
      }

      if (!flags['skip-actions']) {
        if (config.app.hasBackend) {
          try {
            const script = await runPackageScript('undeploy-actions')
            if (!script) {
              await rtLib.undeployActions(this.getAppConfig())
            }
            spinner.succeed(chalk.green('Un-Deploying actions'))
          } catch (err) {
            spinner.fail(chalk.green('Un-Deploying actions'))
            throw err
          }
        } else {
          this.log('no manifest file, skipping action undeploy')
        }
      }
      if (!flags['skip-static'] && !flags['skip-web-assets']) {
        if (config.app.hasFrontend) {
          try {
            const script = await runPackageScript('undeploy-static')
            if (!script) {
              await webLib.undeployWeb(config, onProgress)
            }
            spinner.succeed(chalk.green('Un-Deploying web assets'))
          } catch (err) {
            spinner.fail(chalk.green('Un-Deploying web assets'))
            throw err
          }
        } else {
          this.log('no frontend, skipping frontend undeploy')
        }
      }

      // final message
      this.log(chalk.green(chalk.bold('Undeploy done !')))
      try {
        await runPackageScript('post-app-undeploy')
      } catch (err) {
        this.log(err)
      }
    } catch (error) {
      spinner.stop()
      this.error(wrapError(error))
    }
  }
}

Undeploy.description = `Undeploys an Adobe I/O App
`

Undeploy.flags = {
  ...BaseCommand.flags,
  'skip-static': flags.boolean({
    description: 'Skip undeployment of static files'
  }),
  'skip-web-assets': flags.boolean({
    description: 'Skip undeployment of web assets'
  }),
  'skip-actions': flags.boolean({
    description: 'Skip undeployment of actions'
  })
}

Undeploy.args = []

module.exports = Undeploy
