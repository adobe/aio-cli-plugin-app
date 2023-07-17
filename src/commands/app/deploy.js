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
const open = require('open')

const BaseCommand = require('../../BaseCommand')
const BuildCommand = require('./build')
const webLib = require('@adobe/aio-lib-web')
const { Flags } = require('@oclif/core')
const { createWebExportFilter, runInProcess, buildExtensionPointPayloadWoMetadata, buildExcShellViewExtensionMetadata } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')
const LogForwarding = require('../../lib/log-forwarding')

class Deploy extends BuildCommand {
  async run () {
    // cli input
    const { flags } = await this.parse(Deploy)

    // flags
    flags['web-assets'] = flags['web-assets'] && !flags.action
    flags.publish = flags.publish && !flags.action

    const deployConfigs = await this.getAppExtConfigs(flags)
    const keys = Object.keys(deployConfigs)
    const values = Object.values(deployConfigs)
    const isStandaloneApp = (keys.length === 1 && keys[0] === 'application')

    // if there are no extensions, then set publish to false
    flags.publish = flags.publish && !isStandaloneApp
    let libConsoleCLI // <= this can be undefined later on, and it was not checked
    if (flags.publish) {
      // force login at beginning (if required)
      libConsoleCLI = await this.getLibConsoleCLI()
    }

    if (
      (!flags.publish && !flags['web-assets'] && !flags.actions)
    ) {
      this.error('Nothing to be done 🚫')
    }
    const spinner = ora()

    try {
      const aioConfig = (await this.getFullConfig()).aio

      // 1. update log forwarding configuration
      // note: it is possible that .aio file does not exist, which means there is no local lg config
      if (aioConfig?.project?.workspace &&
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

      // 2. Bail if workspace is production and application status is PUBLISHED, honor force-deploy
      if (!isStandaloneApp && aioConfig?.project?.workspace?.name === 'Production' && !flags['force-deploy']) {
        const extension = await this.getApplicationExtension(libConsoleCLI, aioConfig)
        spinner.info(chalk.dim(JSON.stringify(extension)))
        if (extension && extension.status === 'PUBLISHED') {
          spinner.info(chalk.red('This application is published and the current workspace is Production, deployment will be skipped. You must first retract this application in Adobe Exchange to deploy updates.'))
          return
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

      // 4. deploy extension manifest
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

    try {
      await runInProcess(config.hooks['pre-app-deploy'], config)
      if (flags['feature-event-hooks']) {
        this.log('feature-event-hooks is enabled, running pre-deploy-event-reg hook')
        const hookResults = await this.config.runHook('pre-deploy-event-reg', { appConfig: config, force: flags['force-events'] })
        if (hookResults?.failures?.length > 0) {
          // output should be "Error : <plugin-name> : <error-message>\n" for each failure
          this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
        }
      }
    } catch (err) {
      this.error(err)
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
          const script = await runInProcess(config.hooks['deploy-actions'], config)
          if (!script) {
            const hookResults = await this.config.runHook('deploy-actions', {
              appConfig: config,
              filterEntities: filterActions || [],
              isLocalDev: false
            })
            if (hookResults?.failures?.length > 0) {
              // output should be "Error : <plugin-name> : <error-message>\n" for each failure
              this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
            }
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
          const script = await runInProcess(config.hooks['deploy-static'], config)
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
        open(launchUrl)
      } else {
        this.log(chalk.blue(chalk.bold(`To view your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
      }
    }

    try {
      await runInProcess(config.hooks['post-app-deploy'], config)
      if (flags['feature-event-hooks']) {
        this.log('feature-event-hooks is enabled, running post-deploy-event-reg hook')
        const hookResults = await this.config.runHook('post-deploy-event-reg', { appConfig: config, force: flags['force-events'] })
        if (hookResults?.failures?.length > 0) {
          // output should be "Error : <plugin-name> : <error-message>\n" for each failure
          this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
        }
      }
    } catch (err) {
      this.error(err)
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

  async getApplicationExtension (libConsoleCLI, aioConfig) {
    const { appId } = await libConsoleCLI.getProject(aioConfig.project.org.id, aioConfig.project.id)
    const applicationExtensions = await libConsoleCLI.getApplicationExtensions(aioConfig.project.org.id, appId)
    return applicationExtensions.find(extension => extension.appId === appId)
  }
}

Deploy.description = `Build and deploy an Adobe I/O App

This will always force a rebuild unless --no-force-build is set.
`

Deploy.flags = {
  ...BaseCommand.flags,
  actions: Flags.boolean({
    description: '[default: true] Deploy actions if any',
    default: true,
    allowNo: true,
    exclusive: ['action'] // should be action exclusive --no-action but see https://github.com/oclif/oclif/issues/600
  }),
  action: Flags.string({
    description: 'Deploy only a specific action, the flags can be specified multiple times, this will set --no-publish',
    char: 'a',
    exclusive: ['extension', { name: 'publish', when: async (flags) => flags.publish === true }],
    multiple: true
  }),
  'web-assets': Flags.boolean({
    description: '[default: true] Deploy web-assets if any',
    default: true,
    allowNo: true
  }),
  build: Flags.boolean({
    description: '[default: true] Run the build phase before deployment',
    default: true,
    allowNo: true
  }),
  'force-build': Flags.boolean({
    description: '[default: true] Force a build even if one already exists',
    exclusive: ['no-build'], // no-build
    default: true,
    allowNo: true
  }),
  'content-hash': Flags.boolean({
    description: '[default: true] Enable content hashing in browser code',
    default: true,
    allowNo: true
  }),
  open: Flags.boolean({
    description: 'Open the default web browser after a successful deploy, only valid if your app has a front-end',
    default: false
  }),
  extension: Flags.string({
    description: 'Deploy only a specific extension, the flags can be specified multiple times',
    exclusive: ['action'],
    char: 'e',
    multiple: true
  }),
  publish: Flags.boolean({
    description: '[default: true] Publish extension(s) to Exchange',
    allowNo: true,
    default: true
  }),
  'force-deploy': Flags.boolean({
    description: '[default: false] Force deploy changes, regardless of production Workspace being published in Exchange.',
    default: false
  }),
  'force-publish': Flags.boolean({
    description: '[default: false] Force publish extension(s) to Exchange, delete previously published extension points',
    default: false,
    exclusive: ['action', 'publish'] // no-publish is excluded
  }),
  'force-events': Flags.boolean({
    description: '[default: false] Force event registrations and overwrite any previous registrations',
    default: false,
    allowNo: true,
    dependsOn: ['feature-event-hooks'],
    exclusive: ['action', 'publish'] // no-publish is excluded
  }),
  'web-optimize': Flags.boolean({
    description: '[default: false] Enable optimization (minification) of web js/css/html',
    default: false
  }),
  'log-forwarding-update': Flags.boolean({
    description: '[default: true] Update log forwarding configuration on server',
    default: true,
    allowNo: true
  }),
  'feature-event-hooks': Flags.boolean({
    description: '[default: false] Enable event hooks feature',
    default: false,
    allowNo: true,
    hidden: true
  })
}

Deploy.args = {}

module.exports = Deploy
