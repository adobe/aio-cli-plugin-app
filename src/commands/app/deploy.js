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

    flags['skip-static'] = flags['skip-static'] || !!flags.action || flags['skip-web-assets']
    flags['no-publish'] = flags['no-publish'] || !!flags.action || flags.extensions === false

    const deployConfigs = this.getAppExtConfigs(flags)

    const keys = Object.keys(deployConfigs)
    const values = Object.values(deployConfigs)

    if (keys.length <= 0) {
      this.error('Nothing to deploy 🚫')
    }
    const spinner = ora()

    try {
      // 1. build actions and web assets for each extension
      // TODO parallelize ?
      // TODO smaller pieces deploy all actions then all web assets
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i]
        const v = values[i]
        await this.deployOneExtActionsAndWebAssets(k, v, flags, spinner)
      }
      // 2. deploy extension manifest
      if (!flags['no-publish']) {
        const aioConfig = this.getAppConfig().aio
        this.deployExtensionManifest(deployConfigs, aioConfig)
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
    //   if (flags['skip-static'] || flags['skip-web-assets']) {
    //     if (flags['skip-actions']) {
    //       this.log(chalk.green(chalk.bold('Nothing to deploy 🚫')))
    //     } else {
    //       this.log(chalk.green(chalk.bold('Well done, your actions are now online 🏄')))
    //     }
    //   } else {
    //     this.log(chalk.green(chalk.bold('Well done, your app is now online 🏄')))
    //   }
    // }
  }

  async deployExtensionManifest (deployConfigs, aioConfig) {
    // 1. build payload
    const endpointsPayload = {}
    // TODO: the loop is deep and should be simplified and commented
    Object.entries(deployConfigs)
      .filter(([k, v]) => k !== 'application')
      .forEach(([extPointName, extPointConfig]) => {
        endpointsPayload[extPointName] = {}
        Object.entries(extPointConfig.operations)
          .forEach(([opName, opList]) => {
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
              // todo support multi spas + make url fetch util in aio-lib-web
              return { href: `https://${extPointConfig.ow.namespace}.${extPointConfig.app.hostname}/${op.impl}`, ...op.params }
            })
          })
      })
    const extensionPayload = {
      id: 'FILL ME',
      name: `${aioConfig.project.org.id}-${aioConfig.project.name}`,
      endpoints: endpointsPayload,
      services: { FILL: 'ME' },
      releaseNotes: 'FILL ME',
      // todo do better than [0].id
      technicalUserId: aioConfig.project.workspace.credentials && aioConfig.project.workspace.credentials[0].id,
      appId: 'FILL ME',
      publisherId: 'FILL ME'
    }

    // 2. deploy to ext reg
    // TODO deploy full - overwrite
    this.log(chalk.blue('Extension Registry Payload, to be sent:'))
    this.log(chalk.blue(JSON.stringify(extensionPayload, null, 2)))
  }

  async deployOneExtActionsAndWebAssets (name, config, flags, spinner) {
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    // build phase
    if (!flags['skip-build']) {
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

      if (!flags['skip-actions']) {
        if (config.app.hasBackend) {
          let filterEntities
          if (filterActions) {
            filterEntities = { actions: filterActions }
          }
          // todo: fix this, the following change does not work, if we call rtLib version it chokes on some actions
          // Error: EISDIR: illegal operation on a directory, read
          const message = `Deploying actions for extension point ${name}`
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
          this.log(`no backend, skipping action deploy for extension point ${name}`)
        }
      }

      if (!flags['skip-static'] && !flags['skip-web-assets']) {
        if (config.app.hasFrontend) {
          const message = `Deploying web assets for extension point ${name}`
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
          this.log(`no frontend, skipping frontend deploy for extension point ${name}`)
        }
      }

      // log deployed resources
      if (deployedRuntimeEntities.actions) {
        this.log(chalk.blue(chalk.bold('Your deployed actions:')))
        deployedRuntimeEntities.actions.forEach(a => {
          this.log(chalk.blue(chalk.bold(`  -> ${a.url || a.name} `)))
        })
      }
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
}

Deploy.description = `Build and deploy an Adobe I/O App

This will always force a rebuild unless --no-force-build is set. 
`

Deploy.flags = {
  ...BaseCommand.flags,
  'skip-build': flags.boolean({
    description: 'Skip build phase',
    exclusive: ['skip-deploy']
  }),
  'skip-deploy': flags.boolean({
    description: 'Skip deploy phase',
    exclusive: ['skip-build']
  }),
  'skip-static': flags.boolean({
    description: 'Skip build & deployment of static files'
  }),
  'skip-web-assets': flags.boolean({
    description: 'Skip build & deployment of web assets'
  }),
  'skip-actions': flags.boolean({
    description: 'Skip action build & deploy'
  }),
  'force-build': flags.boolean({
    description: 'Forces a build even if one already exists (default: true)',
    exclusive: ['skip-build'],
    default: true,
    allowNo: true
  }),
  'content-hash': flags.boolean({
    description: 'Enable content hashing in browser code (default: true)',
    default: true,
    allowNo: true
  }),
  action: flags.string({
    description: 'Deploy only a specific action, the flags can be specified multiple times',
    exclusive: ['skip-actions'],
    char: 'a',
    multiple: true
  }),
  open: flags.boolean({
    description: 'Open the default web browser after a successful deploy, only valid if your app has a front-end',
    default: false
  }),
  extension: flags.string({
    description: 'Deploy only a specific extension point, the flags can be specified multiple times',
    exclusive: ['action'],
    char: 'e',
    multiple: true
  }),
  extensions: flags.boolean({
    description: 'Deploy extension points, defaults to true, use --no-extensions to skip and deploy only the standalone app',
    allowNo: true,
    default: true,
    exclusive: ['extension']
  })
}

Deploy.args = []

module.exports = Deploy
