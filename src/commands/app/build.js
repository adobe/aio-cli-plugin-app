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
const { Flags } = require('@oclif/core')
const { runInProcess, writeConfig } = require('../../lib/app-helper')
const RuntimeLib = require('@adobe/aio-lib-runtime')
const { bundle } = require('@adobe/aio-lib-web')
const fs = require('fs-extra')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:build', { provider: 'debug' })

class Build extends BaseCommand {
  async run () {
    // cli input
    const { flags } = await this.parse(Build)
    // flags
    flags['web-assets'] = flags['web-assets'] && !flags.action

    const buildConfigs = await this.getAppExtConfigs(flags)

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
    const onProgress = !flags.verbose
      ? info => {
        spinner.text = info
      }
      : info => {
        spinner.info(chalk.dim(`${info}`))
        spinner.start()
      }

    const filterActions = flags.action
    try {
      await runInProcess(config.hooks['pre-app-build'], config)
    } catch (err) {
      this.log(err)
    }

    if (flags.actions) {
      // removed flags['force-build'] || as it is always forced at this point, we need to check to decide what to build
      // if no backend, we skip the build
      if (config.app.hasBackend) {
        try {
          let builtList = []
          const script = await runInProcess(config.hooks['build-actions'], config)
          aioLogger.debug(`run hook for 'build-actions' for actions in '${name}' returned ${script}`)
          spinner.start(`Building actions for '${name}'`)
          if (!script) {
            builtList = await RuntimeLib.buildActions(config, filterActions, flags['force-build'])
          }
          if (builtList.length > 0) {
            spinner.succeed(chalk.green(`Built ${builtList.length} action(s) for '${name}'`))
          } else {
            if (script) {
              spinner.fail(chalk.green(`build-action skipped by hook '${name}'`))
            } else {
              spinner.info(chalk.green(`No actions built for '${name}'`))
            }
          }
          aioLogger.debug(`RuntimeLib.buildActions returned ${builtList}`)
        } catch (err) {
          spinner.fail(chalk.green(`Building actions for '${name}'`))
          throw err
        }
      } else {
        spinner.info(`no backend, skipping action build for '${name}'`)
      }
    }
    if (flags['web-assets']) {
      if (config.app.hasFrontend && (flags['force-build'] || !fs.existsSync(config.web.distProd))) {
        if (config.app.hasBackend) {
          // note: 3rd arg, _isLocalDev is not used in RuntimeLib
          // there is no such thing as --local anymore
          const urls = RuntimeLib.utils.getActionUrls(config, false, false, true)
          await writeConfig(config.web.injectedConfig, urls)
        }
        spinner.start('Building web assets')
        try {
          const script = await runInProcess(config.hooks['build-static'], config)
          if (script) {
            spinner.fail(chalk.green(`build-static skipped by hook '${name}'`))
          } else {
            const entries = config.web.src + '/**/*.html'
            const bundleOptions = {
              shouldDisableCache: true,
              shouldContentHash: flags['content-hash'],
              shouldOptimize: flags['web-optimize'],
              logLevel: flags.verbose ? 'verbose' : 'warn'
            }
            // empty the dist folder to prevent an S3 explosion
            fs.emptyDirSync(config.web.distProd)
            const bundler = await bundle(entries, config.web.distProd, bundleOptions, onProgress)
            await bundler.run()
            spinner.succeed(chalk.green(`Building web assets for '${name}'`))
          }
        } catch (err) {
          spinner.fail(chalk.green(`Building web assets for '${name}'`))
          throw err
        }
      } else {
        // TODO: specify which ... keep this useful
        spinner.info(chalk.green(`No frontend or a build already exists, skipping frontend build for '${name}'`))
      }
    }
    try {
      await runInProcess(config.hooks['post-app-build'], config)
    } catch (err) {
      this.log(err)
    }
  }
}

Build.description = `Build an Adobe I/O App

Build the actions and web assets for an Adobe I/O App. Build is optimized to only build what is necessary.
Use the --force-build flag to force a build even if one already exists.
`

Build.flags = {
  ...BaseCommand.flags,
  actions: Flags.boolean({
    description: '[default: true] Build actions if any',
    default: true,
    allowNo: true,
    exclusive: ['action'] // should be action exclusive --no-action but see https://github.com/oclif/oclif/issues/600
  }),
  action: Flags.string({
    description: 'Build only a specific action, the flags can be specified multiple times, this will set --no-publish',
    char: 'a',
    exclusive: ['extension'],
    multiple: true
  }),
  'web-assets': Flags.boolean({
    description: '[default: true] Build web-assets if any',
    default: true,
    allowNo: true
  }),
  'force-build': Flags.boolean({
    description: '[default: true] Force a build even if one already exists',
    default: true,
    allowNo: true
  }),
  'content-hash': Flags.boolean({
    description: '[default: true] Enable content hashing in browser code',
    default: true,
    allowNo: true
  }),
  'web-optimize': Flags.boolean({
    description: '[default: false] Enable optimization (minification) of js/css/html',
    default: false
  }),
  extension: Flags.string({
    description: 'Build only a specific extension point, the flags can be specified multiple times',
    exclusive: ['action'],
    multiple: true,
    char: 'e'
  })
}

module.exports = Build
