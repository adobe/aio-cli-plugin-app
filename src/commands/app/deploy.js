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
const { cli } = require('cli-ux')

const BaseCommand = require('../../BaseCommand')
const webLib = require('@adobe/aio-lib-web')
const { flags } = require('@oclif/command')
const { buildApp, runPackageScript, wrapError, writeConfig } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Deploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Deploy)
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
      // build phase
      /* if (flags['force-build']) {
        await buildApp(config, flags, true, spinner, onProgress)
      } else  */if (!flags['skip-build']) {
        await buildApp(config, flags, false, spinner, onProgress)
      }

      // deploy phase
      let deployedRuntimeEntities = {}
      let deployedFrontendUrl = ''

      if (!flags['skip-deploy']) {
        try {
          await runPackageScript('pre-app-deploy')
        } catch (err) {
          this.log(err)
        }
        if (!flags['skip-actions']) {
          if (fs.existsSync('manifest.yml')) {
            let filterEntities
            if (filterActions) {
              filterEntities = { actions: filterActions }
            }
            // todo: fix this, the following change does not work, if we call rtLib version it chokes on some actions
            // Error: EISDIR: illegal operation on a directory, read
            spinner.start('Deploying actions')
            deployedRuntimeEntities = { ...await rtLib.deployActions(config, { filterEntities }, onProgress) }
            spinner.succeed(chalk.green('Deploying actions'))
          } else {
            this.log('no manifest.yml, skipping action deploy')
          }
        }
        if (!flags['skip-static']) {
          if (fs.existsSync('web-src/')) {
            spinner.start('Deploying web assets')
            deployedFrontendUrl = await webLib.deployWeb(config, onProgress)
            spinner.succeed(chalk.green('Deploying web assets'))
          } else {
            this.log('no web-src, skipping web-src deploy')
          }
        }

        // log deployed resources
        if (deployedRuntimeEntities.actions) {
          this.log(chalk.blue(chalk.bold('Your deployed actions:')))
          deployedRuntimeEntities.actions.forEach(a => {
            this.log(chalk.blue(chalk.bold(`  -> ${a.url || a.name} `)))
          })
        }
        if (deployedFrontendUrl) {
          this.log(chalk.blue(chalk.bold(`To view your deployed application:\n  -> ${deployedFrontendUrl}`)))
          const launchUrl = this.getLaunchUrlPrefix() + deployedFrontendUrl
          if (flags.open) {
            this.log(chalk.blue(chalk.bold(`Opening your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
            cli.open(launchUrl)
          } else {
            this.log(chalk.blue(chalk.bold(`To view your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
          }
        }

        try {
          await runPackageScript('post-app-deploy')
        } catch (err) {
          this.log(err)
        }
      }

      // final message
      if (flags['skip-deploy']) {
        this.log(chalk.green(chalk.bold('Build success, your app is ready to be deployed 👌')))
      } else if (flags['skip-static']) {
        this.log(chalk.green(chalk.bold('Well done, your actions are now online 🏄')))
      } else {
        this.log(chalk.green(chalk.bold('Well done, your app is now online 🏄')))
      }
    } catch (error) {
      spinner.stop()
      this.error(wrapError(error))
    }
  }
}

Deploy.description = `Build and deploy an Adobe I/O App
`

Deploy.flags = {
  ...BaseCommand.flags,
  'skip-build': flags.boolean({
    description: 'Skip build phase',
    exclusive: ['skip-deploy']
  }),
  'skip-deploy': flags.boolean({
    description: 'Skip deploy phase',
    exclusive: ['skip-build']
  }),
  'skip-static': flags.boolean({
    description: 'Skip build & deployment of static files'
  }),
  'skip-actions': flags.boolean({
    description: 'Skip action build & deploy'
  }),
  action: flags.string({
    description: 'Deploy only a specific action, the flags can be specified multiple times',
    default: '',
    exclusive: ['skip-actions'],
    char: 'a',
    multiple: true
  }),
  open: flags.boolean({
    description: 'Open the default web browser after a successful deploy, only valid if your app has a front-end',
    default: false
  })
}

Deploy.args = []

module.exports = Deploy
