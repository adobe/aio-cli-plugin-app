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

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')
const { flags } = require('@oclif/command')
const { runPackageScript, wrapError } = require('../../lib/app-helper')

class Deploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Deploy)

    const filterActions = flags.action

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

      // build phase
      if (!flags['skip-build']) {
        try {
          await runPackageScript('pre-app-build')
        } catch (err) {
          // this is assumed to be a missing script error
        }

        if (!flags['skip-actions']) {
          if (fs.existsSync('manifest.yml')) {
            await scripts.buildActions([], { filterActions })
          } else {
            this.log('no manifest.yml, skipping action build')
          }
        }
        if (!flags['skip-static']) {
          if (fs.existsSync('web-src/')) {
            await scripts.buildUI()
          } else {
            this.log('no web-src, skipping web-src build')
          }
        }
        try {
          await runPackageScript('post-app-build')
        } catch (err) {
          // this is assumed to be a missing script error
        }
      }

      // deploy phase
      let deployedRuntimeEntities = {}
      let deployedFrontendUrl = ''
      if (!flags['skip-deploy']) {
        try {
          await runPackageScript('pre-app-deploy')
        } catch (err) {
          // this is assumed to be a missing script error
        }
        if (!flags['skip-actions']) {
          if (fs.existsSync('manifest.yml')) {
            let filterEntities
            if (filterActions) {
              filterEntities = { actions: filterActions }
            }
            deployedRuntimeEntities = { ...await scripts.deployActions([], { filterEntities }) }
          } else {
            this.log('no manifest.yml, skipping action deploy')
          }
        }
        if (!flags['skip-static']) {
          if (fs.existsSync('web-src/')) {
            deployedFrontendUrl = await scripts.deployUI()
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
          const launchPrefix = this.getLaunchUrlPrefix()
          if (launchPrefix) {
            const launchUrl = launchPrefix + deployedFrontendUrl
            this.log(chalk.blue(chalk.bold(`To view your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
          }
        }

        try {
          await runPackageScript('post-app-deploy')
        } catch (err) {
          // this is assumed to be a missing script error
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
      spinner.fail()
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
  })
}

Deploy.args = []

module.exports = Deploy
