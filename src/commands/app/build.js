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
const { runInProcess, writeConfig, reloadEnvOnPreHooks, isEnvEnabledForHook, HOOKS } = require('../../lib/app-helper')
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

    let buildConfigs = await this.getAppExtConfigs(flags)

    if (!flags['web-assets'] && !flags.actions) {
      this.error('Nothing to be done 🚫')
    }

    const spinner = ora()
    try {
      // 1. build actions and web assets for each extension
      // the list can change when the config is reloaded, so we track what was already built
      const reloadConfig = isEnvEnabledForHook('AIO_RELOAD_CONFIG_ON_PRE_HOOKS', HOOKS.PRE_APP_BUILD)
      const built = new Set()
      let name
      while ((name = Object.keys(buildConfigs).find(k => !built.has(k)))) {
        built.add(name)
        const reloaded = await this.buildOneExt(name, buildConfigs[name], flags, spinner, reloadConfig)
        if (reloaded) {
          const before = Object.keys(buildConfigs)
          const after = Object.keys(reloaded)
          const added = after.filter(k => !before.includes(k))
          const removed = before.filter(k => !after.includes(k))
          if (added.length > 0) {
            this.log(`Config reloaded, extensions added: ${added.join(', ')}`)
          }
          if (removed.length > 0) {
            this.log(`Config reloaded, extensions removed: ${removed.join(', ')}`)
          }
          buildConfigs = reloaded
        }
      }
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }
  }

  /**
   * Builds one extension.
   *
   * @param {string} name the extension name
   * @param {object} config the extension config
   * @param {object} flags the command flags
   * @param {object} spinner the ora spinner
   * @param {boolean} [reloadConfig=false] reload the app config after the pre-app-build hook, if the extension has one
   * @returns {Promise<object|undefined>} the reloaded extension configs, if the config was reloaded
   */
  async buildOneExt (name, config, flags, spinner, reloadConfig = false) {
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
    reloadEnvOnPreHooks(HOOKS.PRE_APP_BUILD)

    let reloaded
    if (reloadConfig && config.hooks[HOOKS.PRE_APP_BUILD]) {
      reloaded = await this.reloadExtConfigs(flags)
      if (!reloaded[name]) {
        this.log(chalk.yellow(`Warning: extension '${name}' was removed by the pre-app-build hook, skipping its build`))
        return reloaded
      }
      config = reloaded[name]
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
              shouldOptimize: flags['web-optimize'] ?? process.env.NODE_ENV === 'production',
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
    return reloaded
  }

  async reloadExtConfigs (flags) {
    try {
      return await this.getAppExtConfigs(flags, { fresh: true })
    } catch (err) {
      if (err.message.startsWith('No matching extension implementation')) {
        this.log(chalk.yellow(`Warning: no extension matches the -e flag after reloading the config: ${err.message}`))
        return {}
      }
      throw new Error(`Failed to reload the app config after the pre-app-build hook: ${err.message}`)
    }
  }
}

Build.description = `Build an Adobe I/O App

Build the actions and web assets for an Adobe I/O App. Build is optimized to only build what is necessary.
Use the --force-build flag to force a build even if one already exists.

Set AIO_RELOAD_CONFIG_ON_PRE_HOOKS=true to reload app.config.yaml (and its included files) after each pre-app-build hook,
so extensions added or removed by the hook are built, or skipped, in the same run. Not supported by deploy and run.
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
    description: '[default: true if NODE_ENV=production, false otherwise] Enable optimization (minification) of js/css/html',
    allowNo: true
  }),
  extension: Flags.string({
    description: 'Build only a specific extension point, the flags can be specified multiple times',
    exclusive: ['action'],
    multiple: true,
    char: 'e'
  })
}

module.exports = Build
