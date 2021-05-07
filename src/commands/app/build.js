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

const BaseCommand = require('../../BaseCommand')
const { flags } = require('@oclif/command')
const { runPackageScript, writeConfig, wrapError } = require('../../lib/app-helper')
const RuntimeLib = require('@adobe/aio-lib-runtime')
const { bundle } = require('@adobe/aio-lib-web')
const fs = require('fs-extra')

class Build extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Build)
    const config = this.getAppConfig()

    const spinner = ora()

    await this.build(config, flags, spinner)
  }

  async build (config, flags, spinner) {
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    try {
      const filterActions = flags.action
      try {
        await runPackageScript('pre-app-build')
      } catch (err) {
        this.log(err)
      }

      if (!flags['skip-actions']) {
        if (config.app.hasBackend && (flags['force-build'] || !fs.existsSync(config.actions.dist))) {
          spinner.start('Building actions')
          try {
            const script = await runPackageScript('build-actions')
            if (!script) {
              await RuntimeLib.buildActions(config, filterActions)
            }
            spinner.succeed(chalk.green('Building actions'))
          } catch (err) {
            spinner.fail(chalk.green('Building actions'))
            throw err
          }
        } else {
          spinner.info('no backend or a build already exists, skipping action build')
        }
      }
      if (!flags['skip-static'] && !flags['skip-web-assets']) {
        if (config.app.hasFrontend && (flags['force-build'] || !fs.existsSync(config.web.distProd))) {
          if (config.app.hasBackend) {
            const urls = await RuntimeLib.utils.getActionUrls(config)
            await writeConfig(config.web.injectedConfig, urls)
          }
          spinner.start('Building web assets')
          try {
            const script = await runPackageScript('build-static')
            if (!script) {
              const entryFile = config.web.src + '/index.html'
              const bundleOptions = {
                shouldDisableCache: true,
                shouldContentHash: flags['content-hash'],
                shouldOptimize: false,
                logLevel: flags.verbose ? 'verbose' : 'warn'
              }
              const bundler = await bundle(entryFile, config.web.distProd, bundleOptions, onProgress)
              await bundler.run()
            }
            spinner.succeed(chalk.green('Building web assets'))
          } catch (err) {
            spinner.fail(chalk.green('Building web assets'))
            throw err
          }
        } else {
          spinner.info('no frontend or a build already exists, skipping frontend build')
        }
      }
      try {
        await runPackageScript('post-app-build')
      } catch (err) {
        this.log(err)
      }

      // final message
      if (flags['skip-static'] || flags['skip-web-assets']) {
        if (flags['skip-actions']) {
          this.log(chalk.green(chalk.bold('Nothing to build 🚫')))
        } else {
          this.log(chalk.green(chalk.bold('Build success, your actions are ready to be deployed 👌')))
        }
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

This will always force a rebuild unless --no-force-build is set.
`

Build.flags = {
  ...BaseCommand.flags,
  'skip-static': flags.boolean({
    description: 'Skip build of static files'
  }),
  'skip-web-assets': flags.boolean({
    description: 'Skip build of web assets'
  }),
  'skip-actions': flags.boolean({
    description: 'Skip build of actions'
  }),
  'force-build': flags.boolean({
    description: 'Forces a build even if one already exists (default: true)',
    default: true,
    allowNo: true
  }),
  'content-hash': flags.boolean({
    description: 'Enable content hashing in browser code (default: true)',
    default: true,
    allowNo: true
  }),
  action: flags.string({
    description: 'Build only a specific action, the flags can be specified multiple times',
    exclusive: ['skip-actions'],
    char: 'a',
    multiple: true
  })
}

Build.args = []

module.exports = Build
