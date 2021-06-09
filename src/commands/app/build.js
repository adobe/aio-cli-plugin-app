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
const { runScript, writeConfig } = require('../../lib/app-helper')
const RuntimeLib = require('@adobe/aio-lib-runtime')
const { bundle } = require('@adobe/aio-lib-web')
const fs = require('fs-extra')
// const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:build', { provider: 'debug' })

class Build extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Build)
    // flags
    flags['web-assets'] = flags['web-assets'] && !flags['skip-static'] && !flags['skip-web-assets'] && !flags.action
    flags.actions = flags.actions && !flags['skip-actions']

    const buildConfigs = this.getAppExtConfigs(flags)

    // 1. build actions and web assets for each extension
    const keys = Object.keys(buildConfigs)
    const values = Object.values(buildConfigs)

    if (!flags['web-assets'] && !flags.actions) {
      this.error('Nothing to be done 🚫')
    }

    const spinner = ora()
    try {
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.buildOneExt(k, v, flags, spinner)
      }
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }
  }

  async buildOneExt (name, config, flags, spinner) {
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    const filterActions = flags.action
    try {
      await runScript(config.hooks['pre-app-build'])
    } catch (err) {
      this.log(err)
    }

    if (flags.actions) {
      if (config.app.hasBackend && (flags['force-build'] || !fs.existsSync(config.actions.dist))) {
        spinner.start(`Building actions for '${name}'`)
        try {
          const script = await runScript(config.hooks['build-actions'])
          if (!script) {
            await RuntimeLib.buildActions(config, filterActions)
          }
          spinner.succeed(chalk.green(`Building actions for '${name}'`))
        } catch (err) {
          spinner.fail(chalk.green(`Building actions for '${name}'`))
          throw err
        }
      } else {
        spinner.info(`no backend or a build already exists, skipping action build for '${name}'`)
      }
    }
    if (flags['web-assets']) {
      if (config.app.hasFrontend && (flags['force-build'] || !fs.existsSync(config.web.distProd))) {
        if (config.app.hasBackend) {
          const urls = await RuntimeLib.utils.getActionUrls(config)
          await writeConfig(config.web.injectedConfig, urls)
        }
        spinner.start('Building web assets')
        try {
          const script = await runScript(config.hooks['build-static'])
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
          spinner.succeed(chalk.green(`Building web assets for '${name}'`))
        } catch (err) {
          spinner.fail(chalk.green(`Building web assets for '${name}'`))
          throw err
        }
      } else {
        spinner.info(`no frontend or a build already exists, skipping frontend build for '${name}'`)
      }
    }
    try {
      await await runScript(config.hooks['build-static'])
    } catch (err) {
      this.log(err)
    }
  }
}

Build.description = `Build an Adobe I/O App

This will always force a rebuild unless --no-force-build is set.
`

Build.flags = {
  ...BaseCommand.flags,
  'skip-static': flags.boolean({
    description: '[deprecated] Please use --no-web-assets'
  }),
  'skip-web-assets': flags.boolean({
    description: '[deprecated] Please use --no-web-assets'
  }),
  'skip-actions': flags.boolean({
    description: '[deprecated] Please use --no-actions'
  }),
  actions: flags.boolean({
    description: '[default: true] Build actions if any',
    default: true,
    allowNo: true,
    exclusive: ['action'] // should be action exclusive --no-action but see https://github.com/oclif/oclif/issues/600
  }),
  action: flags.string({
    description: 'Build only a specific action, the flags can be specified multiple times, this will set --no-publish',
    char: 'a',
    exclusive: ['extension'],
    multiple: true
  }),
  'web-assets': flags.boolean({
    description: '[default: true] Build web-assets if any',
    default: true,
    allowNo: true
  }),
  'force-build': flags.boolean({
    description: '[default: true] Force a build even if one already exists',
    default: true,
    allowNo: true
  }),
  'content-hash': flags.boolean({
    description: '[default: true] Enable content hashing in browser code',
    default: true,
    allowNo: true
  }),
  extension: flags.string({
    description: 'Build only a specific extension point, the flags can be specified multiple times',
    exclusive: ['action'],
    multiple: true,
    char: 'e'
  })
}

module.exports = Build
