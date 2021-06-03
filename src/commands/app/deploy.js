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
const { runScript, urlJoin, removeProtocolFromURL } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')

class Deploy extends BuildCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Deploy)

    // flags
    flags['web-assets'] = flags['web-assets'] && !flags['skip-web-assets'] && !flags['skip-web-assets'] && !flags.action
    flags.actions = flags.actions && !flags['skip-actions']
    flags.publish = flags.publish && !flags.action
    flags.build = flags.build && !flags['skip-build']

    const deployConfigs = this.getAppExtConfigs(flags)
    let libConsoleCLI
    if (flags.publish) {
      // force login at beginning (if required)
      libConsoleCLI = await this.getLibConsoleCLI()
    }

    const keys = Object.keys(deployConfigs)
    const values = Object.values(deployConfigs)

    if (
      keys.length <= 0 ||
      (!flags.publish && !!flags['web-assets'] && !!flags.actions) ||
      // NOTE skip deploy is deprecated
      (!flags.publish && flags.build && flags['skip-deploy'])
    ) {
      this.error('Nothing to be done 🚫')
    }
    const spinner = ora()

    try {
      // 1. deploy actions and web assets for each extension
      // Possible improvements:
      // - parallelize
      // - break into smaller pieces deploy, allowing to first deploy all actions then all web assets
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.deploySingleConfig(k, v, flags, spinner)
      }
      // 2. deploy extension manifest
      if (flags.publish) {
        const aioConfig = this.getAppConfig().aio
        const payload = this.buildExtensionPointPayload(deployConfigs)
        await this.publishExtensionPoints(libConsoleCLI, payload, aioConfig)
      }
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }

    // final message
    // TODO make it depending on flags
    this.log(chalk.green(chalk.bold('Deployment is GREAT SUCCESS 🏄')))
    // if (!flags['skip-deploy']) {
    //   if (!flags['web-assets'] || flags['skip-web-assets']) {
    //     if (!flags['actions']) {
    //       this.log(chalk.green(chalk.bold('Nothing to deploy 🚫')))
    //     } else {
    //       this.log(chalk.green(chalk.bold('Well done, your actions are now online 🏄')))
    //     }
    //   } else {
    //     this.log(chalk.green(chalk.bold('Well done, your app is now online 🏄')))
    //   }
    // }
  }

  async deploySingleConfig (name, config, flags, spinner) {
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    // build phase
    if (flags.build) {
      await this.buildOneExt(name, config, flags, spinner)
    }

    // deploy phase
    let deployedRuntimeEntities = {}
    let deployedFrontendUrl = ''

    const filterActions = flags.action

    if (!flags['skip-deploy']) {
      try {
        await runScript(config.hooks['pre-app-deploy'])
      } catch (err) {
        this.log(err)
      }

      if (flags.actions) {
        if (config.app.hasBackend) {
          let filterEntities
          if (filterActions) {
            filterEntities = { actions: filterActions }
          }
          const message = `Deploying actions '${name}'`
          spinner.start(message)
          try {
            const script = await runScript(config.hooks['deploy-actions'])
            if (!script) {
              deployedRuntimeEntities = { ...await rtLib.deployActions(config, { filterEntities }, onProgress) }
            }
            spinner.succeed(chalk.green(message))
          } catch (err) {
            spinner.fail(chalk.green(message))
            throw err
          }
        } else {
          this.log(`no backend, skipping action deploy '${name}'`)
        }
      }

      if (flags['web-assets']) {
        if (config.app.hasFrontend) {
          const message = `Deploying web assets '${name}'`
          spinner.start(message)
          try {
            const script = await runScript(config.hooks['deploy-static'])
            if (!script) {
              deployedFrontendUrl = await webLib.deployWeb(config, onProgress)
            }
            spinner.succeed(chalk.green(message))
          } catch (err) {
            spinner.fail(chalk.green(message))
            throw err
          }
        } else {
          this.log(`no frontend, skipping frontend deploy '${name}'`)
        }
      }

      // log deployed resources
      if (deployedRuntimeEntities.actions) {
        this.log(chalk.blue(chalk.bold('Your deployed actions:')))
        deployedRuntimeEntities.actions.forEach(a => {
          this.log(chalk.blue(chalk.bold(`  -> ${a.url || a.name} `)))
        })
      }
      // TODO urls should depend on extension point, exc shell only for exc shell extension point
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
        await runScript(config.hooks['post-app-deploy'])
      } catch (err) {
        this.log(err)
      }
    }
  }

  async publishExtensionPoints (libConsoleCLI, endpointsPayload, aioConfig) {
    // publish without overwritting, meaning partial publish (for a subset of ext points) are supported
    await libConsoleCLI.updateExtensionPointsWithoutOverwrites(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, endpointsPayload)
  }

  buildExtensionPointPayload (deployConfigs) {
    // Example input:
    // application: {...}
    // extensions:
    //   firefly/excshell/v1:
    //     operations:
    //       view:
    //         impl: index.html
    //         type: web
    //   aem/nui/v1:
    //     operations:
    //       worker:
    //         impl: aem-nui-v1/ps-worker
    //         type: action
    //
    // Example output:
    // firefly/excshell/v1:
    //  operations:
    //    view:
    //      href: https://namespace.adobeio-static.net/index.html # todo support for multi UI with a extname-opcode-subfolder
    // aem/nui/v1:
    //  operations:
    //    worker:
    //      href: https://namespace.adobeioruntime.net/api/v1/web/aem-nui-v1/ps-worker

    const endpointsPayload = {}
    // iterate over all configuration to deploy
    Object.entries(deployConfigs)
      // filter out the standalone application config, we want to publish extension points
      .filter(([k, v]) => k !== 'application')
      .forEach(([extPointName, extPointConfig]) => {
        endpointsPayload[extPointName] = {}
        Object.entries(extPointConfig.operations)
          .forEach(([opName, opList]) => {
            // replace operations impl and type with a href, either for an action or for a UI
            endpointsPayload[extPointName][opName] = opList.map(op => {
              if (op.type === 'action') {
                // todo modularize with getActionUrls from appHelper
                const owPackage = op.impl.split('/')[0]
                const owAction = op.impl.split('/')[1]
                const manifestAction = extPointConfig.manifest.full.packages[owPackage].actions[owAction]
                const webArg = manifestAction['web-export'] || manifestAction.web
                const webUri = (webArg && webArg !== 'no' && webArg !== 'false') ? 'web' : ''
                const packageWithAction = op.impl
                // todo non runtime apihost do not support namespace as subdomain
                const href = urlJoin('https://' + extPointConfig.ow.namespace + '.' + removeProtocolFromURL(extPointConfig.ow.apihost), 'api', extPointConfig.ow.apiversion, webUri, packageWithAction)
                return { href, ...op.params }
              }
              // op.type === 'web'
              // todo support for multi UI with a extname-opcode-subfolder
              return { href: `https://${extPointConfig.ow.namespace}.${extPointConfig.app.hostname}/${op.impl}`, ...op.params }
            })
          })
      })
    return endpointsPayload
  }
}

Deploy.description = `Build and deploy an Adobe I/O App

This will always force a rebuild unless --no-force-build is set.
`

Deploy.flags = {
  ...BaseCommand.flags,
  'skip-build': flags.boolean({
    description: '[deprecated] Please use --no-build'
  }),
  'skip-deploy': flags.boolean({
    description: '[deprecated] Please use \'aio app build\''
  }),
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
    description: '[default: true] Deploy actions if any',
    default: true,
    allowNo: true,
    exclusive: ['action'] // should be action exclusive --no-action but see https://github.com/oclif/oclif/issues/600
  }),
  action: flags.string({
    description: 'Deploy only a specific action, the flags can be specified multiple times, this will set --no-publish',
    char: 'a',
    exclusive: ['extension'],
    multiple: true
  }),
  'web-assets': flags.boolean({
    description: '[default: true] Deploy web-assets if any',
    default: true,
    allowNo: true
  }),
  build: flags.boolean({
    description: '[default: true] Run the build phase before deployment',
    default: true,
    allowNo: true
  }),
  'force-build': flags.boolean({
    description: '[default: true] Forces a build even if one already exists',
    exclusive: ['no-build'], // no-build
    default: true,
    allowNo: true
  }),
  'content-hash': flags.boolean({
    description: '[default: true] Enable content hashing in browser code',
    default: true,
    allowNo: true
  }),
  open: flags.boolean({
    description: 'Open the default web browser after a successful deploy, only valid if your app has a front-end',
    default: false
  }),
  extension: flags.string({
    description: 'Deploy only a specific extension, the flags can be specified multiple times',
    exclusive: ['action'],
    char: 'e',
    multiple: true
  }),
  publish: flags.boolean({
    description: '[default: true] Publish extension(s) to Exchange',
    allowNo: true,
    default: true,
    exclusive: ['action']
  })
}

Deploy.args = []

module.exports = Deploy
