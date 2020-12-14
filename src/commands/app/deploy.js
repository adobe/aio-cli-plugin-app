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
const { cli } = require('cli-ux')

const BaseCommand = require('../../BaseCommand')
const BuildCommand = require('./build')
const webLib = require('@adobe/aio-lib-web')
const { flags } = require('@oclif/command')
const { runPackageScript, wrapError } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Deploy extends BuildCommand {
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
      if (!flags['skip-build']) {
        await this.build(config, flags, spinner)
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
          if (config.app.hasBackend) {
            let filterEntities
            if (filterActions) {
              filterEntities = { actions: filterActions }
            }
            // todo: fix this, the following change does not work, if we call rtLib version it chokes on some actions
            // Error: EISDIR: illegal operation on a directory, read
            spinner.start('Deploying actions')
            try {
              const script = await runPackageScript('deploy-actions')
              if (!script) {
                deployedRuntimeEntities = { ...await rtLib.deployActions(config, { filterEntities }, onProgress) }
              }
              spinner.succeed(chalk.green('Deploying actions'))
            } catch (err) {
              spinner.fail(chalk.green('Deploying actions'))
              throw err
            }
          } else {
            this.log('no backend, skipping action deploy')
          }
        }

        if (!flags['skip-static']) {
          if (config.app.hasFrontend) {
            spinner.start('Deploying web assets')
            try {
              const script = await runPackageScript('deploy-static')
              if (!script) {
                deployedFrontendUrl = await webLib.deployWeb(config, onProgress)
              }
              spinner.succeed(chalk.green('Deploying web assets'))
            } catch (err) {
              spinner.fail(chalk.green('Deploying web assets'))
              throw err
            }
          } else {
            this.log('no frontend, skipping frontend deploy')
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
      if (!flags['skip-deploy']) {
        if (flags['skip-static']) {
          if (flags['skip-actions']) {
            this.log(chalk.green(chalk.bold('Nothing to deploy 🚫')))
          } else {
            this.log(chalk.green(chalk.bold('Well done, your actions are now online 🏄')))
          }
        } else {
          this.log(chalk.green(chalk.bold('Well done, your app is now online 🏄')))
        }
      }
    } catch (error) {
      spinner.stop()
      this.error(wrapError(error))
    }
  }
}

Deploy.description = `Build and deploy an Adobe I/O App

This will always force a rebuild unless --no-force-build is set. 
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
  'force-build': flags.boolean({
    description: 'Forces a build even if one already exists (default: true)',
    exclusive: ['skip-build'],
    default: true,
    allowNo: true
  }),
  action: flags.string({
    description: 'Deploy only a specific action, the flags can be specified multiple times',
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
