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

const { Flags } = require('@oclif/core')

const BaseCommand = require('../../BaseCommand')
const webLib = require('@adobe/aio-lib-web')
const { runInProcess, buildExtensionPointPayloadWoMetadata } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Undeploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = await this.parse(Undeploy)

    const undeployConfigs = this.getAppExtConfigs(flags)
    let libConsoleCLI
    if (flags.unpublish) {
      // force login at beginning (if required)
      libConsoleCLI = await this.getLibConsoleCLI()
    }

    // 1. undeploy actions and web assets for each extension
    const keys = Object.keys(undeployConfigs)
    const values = Object.values(undeployConfigs)

    if (
      (!flags.unpublish && !flags['web-assets'] && !flags.actions)
    ) {
      this.error('Nothing to be done 🚫')
    }

    const spinner = ora()
    try {
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.undeployOneExt(k, v, flags, spinner)
      }
      // 2. unpublish extension manifest
      if (flags.unpublish && !(keys.length === 1 && keys[0] === 'application')) {
        const aioConfig = this.getFullConfig().aio
        const payload = await this.unpublishExtensionPoints(libConsoleCLI, undeployConfigs, aioConfig, flags['force-unpublish'])
        this.log(chalk.blue(chalk.bold(`New Extension Point(s) in Workspace '${aioConfig.project.workspace.name}': '${Object.keys(payload.endpoints)}'`)))
      } else {
        this.log('skipping unpublish phase...')
      }
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }
    // final message
    this.log(chalk.green(chalk.bold('Undeploy done !')))
  }

  async undeployOneExt (extName, config, flags, spinner) {
    const onProgress = !flags.verbose
      ? info => {
        spinner.text = info
      }
      : info => {
        spinner.info(chalk.dim(`${info}`))
        spinner.start()
      }
    // undeploy
    try {
      await runInProcess(config.hooks['pre-app-undeploy'], config)
    } catch (err) {
      this.log(err)
    }

    if (flags.actions) {
      if (config.app.hasBackend) {
        try {
          this.config.runHook('pre-undeploy-event-reg', { appConfig: config })
          const script = await runInProcess(config.hooks['undeploy-actions'], config)
          if (!script) {
            await rtLib.undeployActions(config)
          }
          spinner.succeed(chalk.green(`Un-Deploying actions for ${extName}`))
        } catch (err) {
          spinner.fail(chalk.green(`Un-Deploying actions for ${extName}`))
          throw err
        }
      } else {
        this.log('no manifest file, skipping action undeploy')
      }
    }
    if (flags['web-assets']) {
      if (config.app.hasFrontend) {
        try {
          const script = await runInProcess(config.hooks['undeploy-static'], config)
          if (!script) {
            await webLib.undeployWeb(config, onProgress)
          }
          spinner.succeed(chalk.green(`Un-Deploying web assets for ${extName}`))
        } catch (err) {
          spinner.fail(chalk.green(`Un-Deploying web assets for ${extName}`))
          throw err
        }
      } else {
        this.log('no frontend, skipping frontend undeploy')
      }
    }

    try {
      this.config.runHook('post-undeploy-event-reg', { appConfig: config })
      await runInProcess(config.hooks['post-app-undeploy'], config)
      if (flags['feature-event-hooks'] && flags.events) {
        this.log('feature-event-hooks is enabled, running post-undeploy-event-reg hook')
        const hookResults = await this.config.runHook('post-undeploy-event-reg', { appConfig: config })
        if (hookResults?.failures?.length > 0) {
          // output should be "Error : <plugin-name> : <error-message>\n" for each failure
          this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
        }
      }
    } catch (err) {
      this.log(err)
    }
  }

  async unpublishExtensionPoints (libConsoleCLI, deployConfigs, aioConfig, force) {
    const payload = buildExtensionPointPayloadWoMetadata(deployConfigs)
    let res
    if (force) {
      // publish and overwrite any previous published endpoints (delete them)
      res = await libConsoleCLI.updateExtensionPoints(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, { endpoints: {} })
      return res
    }
    // publish without overwritting, meaning partial publish (for a subset of ext points) are supported
    res = await libConsoleCLI.removeSelectedExtensionPoints(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, payload)
    return res
  }
}

Undeploy.description = `Undeploys an Adobe I/O App
`

Undeploy.flags = {
  ...BaseCommand.flags,
  actions: Flags.boolean({
    description: '[default: true] Undeploy actions if any',
    default: true,
    allowNo: true
  }),
  events: Flags.boolean({
    description: '[default: true] Undeploy (unregister) events if any',
    default: true,
    allowNo: true
  }),
  'web-assets': Flags.boolean({
    description: '[default: true] Undeploy web-assets if any',
    default: true,
    allowNo: true
  }),
  extension: Flags.string({
    description: 'Undeploy only a specific extension, the flags can be specified multiple times',
    char: 'e',
    multiple: true
  }),
  unpublish: Flags.boolean({
    description: '[default: true] Unpublish selected extension(s) from Exchange',
    allowNo: true,
    default: true
  }),
  'force-unpublish': Flags.boolean({
    description: 'Force unpublish extension(s) from Exchange, will delete all extension points',
    default: false,
    exclusive: ['unpublish'] // unpublish is excluded
  }),
  'feature-event-hooks': Flags.boolean({
    description: '[default: false] Enable event hooks feature',
    default: false,
    allowNo: true,
    hidden: true
  })
}

Undeploy.args = []

module.exports = Undeploy
