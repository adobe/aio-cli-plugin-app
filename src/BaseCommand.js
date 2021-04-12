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

const { Command, flags } = require('@oclif/command')
const chalk = require('chalk')
const coreConfig = require('@adobe/aio-lib-core-config')
const DEFAULT_LAUNCH_PREFIX = 'https://experience.adobe.com/?devMode=true#/custom-apps/?localDevUrl='
const STAGE_LAUNCH_PREFIX = 'https://experience-stage.adobe.com/?devMode=true#/custom-apps/?localDevUrl='
const loadConfig = require('./lib/config-loader')

const {
  getCliEnv, /* function */
  STAGE_ENV /* string */
} = require('@adobe/aio-lib-env')

class BaseCommand extends Command {
  getAppConfig () {
    if (!this.appConfig) {
      this.appConfig = loadConfig()
      // add on appConfig
      this.appConfig.cli = this.config
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
}

BaseCommand.flags = {
  verbose: flags.boolean({ char: 'v', description: 'Verbose output' }),
  version: flags.boolean({ description: 'Show version' })
}

BaseCommand.args = []

module.exports = BaseCommand
