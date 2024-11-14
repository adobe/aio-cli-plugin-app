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
const { createWebExportFilter, runInProcess, buildExtensionPointPayloadWoMetadata, buildExcShellViewExtensionMetadata, getCliInfo } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')
const LogForwarding = require('../../lib/log-forwarding')
const { sendAuditLogs, getAuditLogEvent, getFilesCountWithExtension } = require('../../lib/audit-logger')

const PRE_DEPLOY_EVENT_REG = 'pre-deploy-event-reg'
const POST_DEPLOY_EVENT_REG = 'post-deploy-event-reg'

class Deploy extends BuildCommand {
  async run () {
    // cli input
    const { flags } = await this.parse(Deploy)

    // flags
    flags['web-assets'] = flags['web-assets'] && !flags.action
    // Deploy only a specific action, the flags can be specified multiple times, this will set --no-publish
    flags.publish = flags.publish && !flags.action

    const deployConfigs = await this.getAppExtConfigs(flags)
    const keys = Object.keys(deployConfigs)
    const values = Object.values(deployConfigs)
    const isStandaloneApp = (keys.length === 1 && keys[0] === 'application')

    // if there are no extensions, then set publish to false
    flags.publish = flags.publish && !isStandaloneApp
    if (
      (!flags.publish && !flags['web-assets'] && !flags.actions)
    ) {
      this.error('Nothing to be done 🚫')
    }
    const spinner = ora()

    try {
      const aioConfig = (await this.getFullConfig()).aio
      const cliDetails = await getCliInfo(flags.publish)

      // 1. update log forwarding configuration
      // note: it is possible that .aio file does not exist, which means there is no local lg config
      if (aioConfig?.project?.workspace && flags['log-forwarding-update'] && flags.actions) {
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

      // 2. If workspace is prod and has extensions, check if the app is published
      // if --no-publish, we skip this check
      if (flags.publish && aioConfig?.project?.workspace?.name === 'Production') {
        const extension = await this.getApplicationExtension(aioConfig)
        if (extension && extension.status === 'PUBLISHED') {
          flags.publish = false // if the app is production and published, then skip publish later on
          // if the app is published and no force-deploy flag is set, then skip deployment
          if (!flags['force-deploy']) {
            spinner.info(chalk.red('This application is published and the current workspace is Production, deployment will be skipped. You must first retract this application in Adobe Exchange to deploy updates.'))
            return
          }
        }
      }

      // 3. send deploy log event
      const logEvent = getAuditLogEvent(flags, aioConfig.project, 'AB_APP_DEPLOY')
      if (logEvent) {
        await sendAuditLogs(cliDetails.accessToken, logEvent, cliDetails.env)
      } else {
        this.log(chalk.red(chalk.bold('Warning: No valid config data found to send audit log event for deployment.')))
      }

      // 4. deploy actions and web assets for each extension
      // Possible improvements:
      // - parallelize
      // - break into smaller pieces deploy, allowing to first deploy all actions then all web assets
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.deploySingleConfig(k, v, flags, spinner)
        if (v.app.hasFrontend && flags['web-assets']) {
          const opItems = getFilesCountWithExtension(v.web.distProd)
          const assetDeployedLogEvent = getAuditLogEvent(flags, aioConfig.project, 'AB_APP_ASSETS_DEPLOYED')
          if (assetDeployedLogEvent) {
            assetDeployedLogEvent.data.opItems = opItems
            await sendAuditLogs(cliDetails.accessToken, assetDeployedLogEvent, cliDetails.env)
          }
        }
      }

      // 4. deploy extension manifest
      if (flags.publish) {
        const payload = await this.publishExtensionPoints(deployConfigs, aioConfig, flags['force-publish'])
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
      const hookResults = await this.config.runHook(PRE_DEPLOY_EVENT_REG, { appConfig: config, force: flags['force-events'] })
      if (hookResults?.failures?.length > 0) {
        // output should be "Error : <plugin-name> : <error-message>\n" for each failure
        this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
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
            deployedRuntimeEntities = await rtLib.deployActions(config, { filterEntities, useForce: flags['force-deploy'] }, onProgress)
          }

          if (deployedRuntimeEntities.actions && deployedRuntimeEntities.actions.length > 0) {
            spinner.succeed(chalk.green(`Deployed ${deployedRuntimeEntities.actions.length} action(s) for '${name}'`))
          } else {
            if (script) {
              spinner.fail(chalk.green(`deploy-actions skipped by hook '${name}'`))
            } else {
              spinner.info(chalk.green(`No actions deployed for '${name}'`))
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
            const filesLogCount = getFilesCountWithExtension(config.web.distProd)
            const filesDeployedMessage = `All static assets for the App Builder application in workspace: ${name} were successfully deployed to the CDN. Files deployed :`
            const filesLogFormatted = filesLogCount?.map(file => `  • ${file}`).join('')
            const finalMessage = chalk.green(`${filesDeployedMessage}\n${filesLogFormatted}`)
            spinner.succeed(chalk.green(finalMessage))
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
      const hookResults = await this.config.runHook(POST_DEPLOY_EVENT_REG, { appConfig: config, force: flags['force-events'] })
      if (hookResults?.failures?.length > 0) {
        // output should be "Error : <plugin-name> : <error-message>\n" for each failure
        this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
      }
    } catch (err) {
      this.error(err)
    }
  }

  async publishExtensionPoints (deployConfigs, aioConfig, force) {
    const libConsoleCLI = await this.getLibConsoleCLI()

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

  async getApplicationExtension (aioConfig) {
    const libConsoleCLI = await this.getLibConsoleCLI()

    const { appId } = await libConsoleCLI.getProject(aioConfig.project.org.id, aioConfig.project.id)
    const applicationExtensions = await libConsoleCLI.getApplicationExtensions(aioConfig.project.org.id, appId)
    return applicationExtensions.find(extension => extension.appId === appId)
  }
}

Deploy.description = `Deploy an Adobe I/O App

Deploys the actions and web assets for an Adobe I/O App.
This will also build any changed actions or web assets before deploying.
Use the --force-build flag to force a build even if one already exists.
Deploy is optimized to only deploy what is necessary. Be aware that deploying actions will overwrite any previous deployments.
Use the --force-deploy flag to force deploy changes, regardless of production Workspace being published in Exchange.
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
    default: false,
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
    default: false,
    exclusive: ['publish', 'force-publish'] // publish is skipped if force-deploy is set and prod app is published
  }),
  'force-publish': Flags.boolean({
    description: '[default: false] Force publish extension(s) to Exchange, delete previously published extension points',
    default: false,
    exclusive: ['action', 'publish'] // no-publish is excluded
  }),
  'force-events': Flags.boolean({
    description: '[default: false] Force event registrations and delete any registrations not part of the config file',
    default: false,
    allowNo: true,
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
  })
}

Deploy.args = {}

module.exports = Deploy
