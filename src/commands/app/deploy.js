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
const { createWebExportFilter, runScript, buildExtensionPointPayloadWoMetadata, buildExcShellViewExtensionMetadata } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')
const LogForwarding = require('../../lib/log-forwarding')

class Deploy extends BuildCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Deploy)

    // flags
    flags['web-assets'] = flags['web-assets'] && !flags['skip-web-assets'] && !flags['skip-static'] && !flags.action
    flags.actions = flags.actions && !flags['skip-actions']
    flags.publish = flags.publish && !flags.action
    flags.build = flags.build && !flags['skip-build']

    const deployConfigs = this.getAppExtConfigs(flags)
    const keys = Object.keys(deployConfigs)
    const values = Object.values(deployConfigs)

    // if there are no extensions, then set publish to false
    flags.publish = flags.publish && !(keys.length === 1 && keys[0] === 'application')
    let libConsoleCLI
    if (flags.publish) {
      // force login at beginning (if required)
      libConsoleCLI = await this.getLibConsoleCLI()
    }

    if (
      (!flags.publish && !flags['web-assets'] && !flags.actions) ||
      // NOTE skip deploy is deprecated
      (!flags.publish && !flags.build && flags['skip-deploy'])
    ) {
      this.error('Nothing to be done 🚫')
    }
    const spinner = ora()

    try {
      const aioConfig = this.getFullConfig().aio

      // 1. update log forwarding configuration
      // note: it is possible that .aio file does not exist, which means there is no local lg config
      if (aioConfig &&
          aioConfig.project &&
          aioConfig.project.workspace &&
          flags['log-forwarding-update'] &&
          flags.actions) {
        spinner.start('Updating log forwarding configuration')
        try {
          const lf = await LogForwarding.init(aioConfig)
          if (lf.isLocalConfigChanged()) {
            const lfConfig = lf.getLocalConfigWithSecrets()
            if (lfConfig.isDefined()) {
              await lf.updateServerConfig(lfConfig)
              spinner.succeed(chalk.green(`Log forwarding is set to '${lfConfig.getDestination()}'`))
            } else {
              if (flags.verbose) {
                spinner.info(chalk.dim('Log forwarding is not updated: no configuration is provided'))
              }
            }
          } else {
            spinner.info(chalk.dim('Log forwarding is not updated: configuration not changed since last update'))
          }
        } catch (error) {
          spinner.fail(chalk.red('Log forwarding is not updated.'))
          throw error
        }
      }

      // 2. Bail if workspace is production and application status is PUBLISHED, honor force-publish
      if (aioConfig.project.workspace.name === "Production" && flags.publish && !flags['force-publish']) {
        try {
          let extension = await this.getApplicationExtension(libConsoleCLI, aioConfig, spinner)
          spinner.info(chalk.dim(JSON.stringify(extension)))
          if (extension.status === 'PUBLISHED') {
            spinner.info(chalk.red('This application is published and the current workspace is Production, deployment will be skipped. You must first retract this application in Adobe Exchange to deploy updates.'))
            return
          }
        } catch (err) {
          spinner.fail(chalk.red('Error checking extension status'))
          throw err
        }
      }

      // 3. deploy actions and web assets for each extension
      // Possible improvements:
      // - parallelize
      // - break into smaller pieces deploy, allowing to first deploy all actions then all web assets
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.deploySingleConfig(k, v, flags, spinner)
      }

      // 3. deploy extension manifest
      if (flags.publish) {
        const payload = await this.publishExtensionPoints(libConsoleCLI, deployConfigs, aioConfig, flags['force-publish'])
        this.log(chalk.blue(chalk.bold(`New Extension Point(s) in Workspace '${aioConfig.project.workspace.name}': '${Object.keys(payload.endpoints)}'`)))
      } else {
        this.log('skipping publish phase...')
      }
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }

    // final message
    // TODO better output depending on which ext points/app and flags
    this.log(chalk.green(chalk.bold('Successful deployment 🏄')))
  }

  async deploySingleConfig (name, config, flags, spinner) {
    const onProgress = !flags.verbose
      ? info => {
        spinner.text = info
      }
      : info => {
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
          const message = `Deploying actions for '${name}'`
          spinner.start(message)
          try {
            const script = await runScript(config.hooks['deploy-actions'])
            if (!script) {
              deployedRuntimeEntities = await rtLib.deployActions(config, { filterEntities }, onProgress)
            }

            if (deployedRuntimeEntities.actions && deployedRuntimeEntities.actions.length > 0) {
              spinner.succeed(chalk.green(`Deployed ${deployedRuntimeEntities.actions.length} action(s) for '${name}'`))
            } else {
              if (script) {
                spinner.fail(chalk.green(`deploy-actions skipped by hook '${name}'`))
              } else {
                spinner.fail(chalk.green(`No actions deployed for '${name}'`))
              }
            }
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
          const message = `Deploying web assets for '${name}'`
          spinner.start(message)
          try {
            const script = await runScript(config.hooks['deploy-static'])
            if (script) {
              spinner.fail(chalk.green(`deploy-static skipped by hook '${name}'`))
            } else {
              deployedFrontendUrl = await webLib.deployWeb(config, onProgress)
              spinner.succeed(chalk.green(message))
            }
          } catch (err) {
            spinner.fail(chalk.green(message))
            throw err
          }
        } else {
          this.log(`no frontend, skipping frontend deploy '${name}'`)
        }
      }

      // log deployed resources
      if (deployedRuntimeEntities.actions && deployedRuntimeEntities.actions.length > 0) {
        this.log(chalk.blue(chalk.bold('Your deployed actions:')))
        const web = deployedRuntimeEntities.actions.filter(createWebExportFilter(true))
        const nonWeb = deployedRuntimeEntities.actions.filter(createWebExportFilter(false))

        if (web.length > 0) {
          this.log('web actions:')
          web.forEach(a => {
            this.log(chalk.blue(chalk.bold(`  -> ${a.url || a.name} `)))
          })
        }

        if (nonWeb.length > 0) {
          this.log('non-web actions:')
          nonWeb.forEach(a => {
            this.log(chalk.blue(chalk.bold(`  -> ${a.url || a.name} `)))
          })
        }
      }
      // TODO urls should depend on extension point, exc shell only for exc shell extension point - use a post-app-deploy hook ?
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

  async publishExtensionPoints (libConsoleCLI, deployConfigs, aioConfig, force) {
    const payload = buildExtensionPointPayloadWoMetadata(deployConfigs)
    // build metadata
    if (payload.endpoints['dx/excshell/1'] && payload.endpoints['dx/excshell/1'].view) {
      const metadata = await buildExcShellViewExtensionMetadata(libConsoleCLI, aioConfig)
      payload.endpoints['dx/excshell/1'].view[0].metadata = metadata
    }
    let newPayload
    if (force) {
      // publish and overwrite any previous published endpoints (delete them)
      newPayload = await libConsoleCLI.updateExtensionPoints(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, payload)
      return newPayload
    }
    // publish without overwritting, meaning partial publish (for a subset of ext points) are supported
    newPayload = await libConsoleCLI.updateExtensionPointsWithoutOverwrites(aioConfig.project.org, aioConfig.project, aioConfig.project.workspace, payload)
    return newPayload
  }

  async getApplicationExtension (libConsoleCLI, aioConfig, spinner) {
    let { appId } = await libConsoleCLI.getProject(aioConfig.project.org.id, aioConfig.project.id)
    let applicationExtensions = await libConsoleCLI.getApplicationExtensions(aioConfig.project.org.id, appId)
    return applicationExtensions.find(extension => extension.appId === appId)
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
    description: '[default: true] Force a build even if one already exists',
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
  }),
  'force-publish': flags.boolean({
    description: 'Force publish extension(s) to Exchange, delete previously published extension points',
    default: false,
    exclusive: ['action', 'publish'] // no-publish is excluded
  }),
  'web-optimize': flags.boolean({
    description: '[default: false] Enable optimization (minification) of web js/css/html',
    default: false
  }),
  'log-forwarding-update': flags.boolean({
    description: '[default: true] Update log forwarding configuration on server',
    default: true,
    allowNo: true
  })
}

Deploy.args = []

module.exports = Deploy
