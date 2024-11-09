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

const { AbortController } = require('node-abort-controller')
global.AbortController = AbortController

const { Command, Flags } = require('@oclif/core')
const chalk = require('chalk')
const coreConfig = require('@adobe/aio-lib-core-config')
const DEFAULT_LAUNCH_PREFIX = 'https://experience.adobe.com/?devMode=true#/custom-apps/?localDevUrl='
const STAGE_LAUNCH_PREFIX = 'https://experience-stage.adobe.com/?devMode=true#/custom-apps/?localDevUrl='
const appConfig = require('@adobe/aio-cli-lib-app-config')
const inquirer = require('inquirer')
const { CONSOLE_API_KEYS, APPLICATION_CONFIG_KEY, EXTENSIONS_CONFIG_KEY } = require('./lib/defaults')
const { getCliInfo } = require('./lib/app-helper')
const LibConsoleCLI = require('@adobe/aio-cli-lib-console')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app', { provider: 'debug' })

const {
  getCliEnv, /* function */
  STAGE_ENV /* string */
} = require('@adobe/aio-lib-env')

class BaseCommand extends Command {
  // default error handler for app commands
  async catch (error) {
    const { flags } = await this.parse(this.prototype)
    aioLogger.error(error) // debug log
    this.error(flags.verbose && error.stack ? error.stack : error.message)
  }

  async init () {
    await super.init()
    // setup a prompt that outputs to stderr
    this.prompt = inquirer.createPromptModule({ output: process.stderr })

    // set User-Agent for runtime calls
    // ex. aio-cli-plugin-app/@adobe/aio-cli/10.3.1 (darwin-arm64; node-v18.20.4; zsh)
    const vs = this.config.versionDetails
    // some tests might not have this set, so we use ? nullish coalescing
    process.env.__OW_USER_AGENT =
      `aio-cli-plugin-app/${vs?.cliVersion} (${vs?.architecture}; ${vs?.nodeVersion}; ${vs?.shell})`
  }

  async getLibConsoleCLI () {
    if (!this.consoleCLI) {
      // requires valid login
      const { accessToken, env } = await getCliInfo()
      // init console CLI sdk consoleCLI
      this.consoleCLI = await LibConsoleCLI.init({ accessToken, env, apiKey: CONSOLE_API_KEYS[env] })
    }
    return this.consoleCLI
  }

  async cleanConsoleCLIOutput () {
    LibConsoleCLI.cleanStdOut()
  }

  async getAppExtConfigs (flags, options = {}) {
    const all = (await this.getFullConfig(options)).all

    // default case: no flags, return all
    let ret = all

    if (flags.extension) {
      // e.g `app deploy -e excshell -e asset-compute`
      // NOTE: this includes 'application', for now we abuse -e, with -e application for referencing the standalone app
      ret = flags.extension.reduce((obj, ef) => {
        const matching = Object.keys(all).filter(name => name.includes(ef))
        if (matching.length <= 0) {
          throw new Error(`No matching extension implementation found for flag '-e ${ef}'`)
        }
        if (matching.length > 1) {
          throw new Error(`Flag '-e ${ef}' matches multiple extension implementation: '${matching}'`)
        }
        const implName = matching[0]
        aioLogger.debug(`-e '${ef}' => '${implName}'`)

        obj[implName] = all[implName]
        return obj
      }, {})
    }

    aioLogger.debug(`found matching implementations: '${Object.keys(ret)}'`)

    // no filter flags
    return ret
  }

  async getRuntimeManifestConfigFile (implName) {
    let configKey
    if (implName === APPLICATION_CONFIG_KEY) {
      configKey = APPLICATION_CONFIG_KEY
    } else {
      configKey = `${EXTENSIONS_CONFIG_KEY}.${implName}`
    }
    let configData = await this.getConfigFileForKey(`${configKey}.runtimeManifest`)
    if (!configData.file) {
      // first action manifest is not defined
      configData = await this.getConfigFileForKey(`${configKey}`)
      configData.key = configData.key + '.runtimeManifest'
    }
    return configData
  }

  async getEventsConfigFile (implName) {
    let configKey
    if (implName === APPLICATION_CONFIG_KEY) {
      configKey = APPLICATION_CONFIG_KEY
    } else {
      configKey = `${EXTENSIONS_CONFIG_KEY}.${implName}`
    }
    let configData = await this.getConfigFileForKey(`${configKey}.events`)
    if (!configData.file) {
      // first events manifest is not defined
      configData = await this.getConfigFileForKey(`${configKey}`)
      configData.key = configData.key + '.events'
    }
    return configData
  }

  async getConfigFileForKey (fullKey) {
    // NOTE: the index returns undefined if the key is loaded from a legacy configuration file
    const fullConfig = await this.getFullConfig()
    // full key like 'extensions.dx/excshell/1.runtimeManifest'
    // returns { key: relKey, file: configFile}
    const configData = fullConfig.includeIndex[fullKey]

    configData
      ? aioLogger.debug(`found configuration file '${configData.file}' for key ${fullKey}`)
      : aioLogger.debug(`could not find any configuration file for key ${fullKey}`)

    return configData || {}
  }

  async getFullConfig (options = {}) {
    // validate appConfig defaults to false for now
    const validateAppConfig = options.validateAppConfig === true

    if (!this.appConfig) {
      // this will explicitly set validateAppConfig=false if not set
      this.appConfig = await appConfig.load({ ...options, validateAppConfig })
    }
    return this.appConfig
  }

  getLaunchUrlPrefix () {
    // todo: it might make sense to have a value that defines if this is an ExC hosted app, or otherwise
    // so we can decide what type of url to return here.
    // at some point we could also just delete the .env value and return our expected url here.

    // note: this is the same value as process.env.AIO_LAUNCH_URL_PREFIX
    let launchPrefix = coreConfig.get('launch.url.prefix')
    if (launchPrefix) {
      if (launchPrefix.includes('/myapps/') || launchPrefix.includes('/apps/')) {
        this.log(chalk.redBright(chalk.bold('Warning: your environment variables contains an older version of AIO_LAUNCH_URL_PREFIX')))
        launchPrefix = launchPrefix.replace('/myapps/', '/custom-apps/')
        launchPrefix = launchPrefix.replace('/apps/', '/custom-apps/')
        this.log(chalk.redBright(chalk.bold(`You should update your .env file: AIO_LAUNCH_URL_PREFIX='${launchPrefix}'`)))
      }
    }
    const defaultLaunchPrefix = getCliEnv() === STAGE_ENV ? STAGE_LAUNCH_PREFIX : DEFAULT_LAUNCH_PREFIX
    return (launchPrefix || defaultLaunchPrefix)
  }

  get pjson () {
    return this.config.pjson
  }

  get appName () {
    return this.pjson.name
  }

  get appVersion () {
    return this.pjson.version
  }

  preRelease () {
    this.log(chalk.yellow('Pre-release warning: This command is in pre-release, and not suitable for production.'))
  }
}

BaseCommand.flags = {
  verbose: Flags.boolean({ char: 'v', description: 'Verbose output' }),
  version: Flags.boolean({ description: 'Show version' })
}

BaseCommand.args = {}

module.exports = BaseCommand
