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
const { runScript, buildExtensionPointPayload } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Undeploy extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Undeploy)

    // flags
    flags['web-assets'] = flags['web-assets'] && !flags['skip-static'] && !flags['skip-web-assets'] && !flags.action
    flags.actions = flags.actions && !flags['skip-actions']

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
        await this.unpublishExtensionPoints(libConsoleCLI, undeployConfigs, aioConfig, flags)
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
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }
    // undeploy
    try {
      await runScript(config.hooks['pre-app-undeploy'])
    } catch (err) {
      this.log(err)
    }

    if (!flags['skip-actions']) {
      if (config.app.hasBackend) {
        try {
          const script = await runScript(config.hooks['undeploy-actions'])
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
          const script = await runScript(config.hooks['undeploy-static'])
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
      try {
        await runScript(config.hooks['post-app-undeploy'])
      } catch (err) {
        this.log(err)
      }
    }

    // final message
    this.log(chalk.green(chalk.bold('Undeploy done !')))
    try {
      await runScript(config.hooks['post-app-undeploy'])
    } catch (err) {
      this.log(err)
    }
  }

  async unpublishExtensionPoints (libConsoleCLI, deployConfigs, aioConfig, flags) {
    const payload = buildExtensionPointPayload(deployConfigs)
    if (flags['force-publish']) {
      // publish and overwrite any previous published endpoints (delete them)
      await libConsoleCLI.updateExtensionPoints(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, {})
    }
    // publish without overwritting, meaning partial publish (for a subset of ext points) are supported
    await libConsoleCLI.removeSelectedExtensionPoints(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, payload)
  }
}

Undeploy.description = `Undeploys an Adobe I/O App
`

Undeploy.flags = {
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
    description: '[default: true] Undeploy actions if any',
    default: true,
    allowNo: true
  }),
  'web-assets': flags.boolean({
    description: '[default: true] Undeploy web-assets if any',
    default: true,
    allowNo: true
  }),
  extension: flags.string({
    description: 'Undeploy only a specific extension, the flags can be specified multiple times',
    char: 'e',
    multiple: true
  }),
  unpublish: flags.boolean({
    description: '[default: true] Unpublish selected extension(s) from Exchange',
    allowNo: true,
    default: true
  }),
  'force-unpublish': flags.boolean({
    description: 'Force unpublish extension(s) from Exchange, will delete all extension points',
    default: false,
    exclusive: ['unpublish'] // unpublish is excluded
  })
}

Undeploy.args = []

module.exports = Undeploy
