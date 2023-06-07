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

const chalk = require('chalk')

const { Flags } = require('@oclif/core')

const BaseCommand = require('../../BaseCommand')
const { wrapError } = require('../../lib/app-helper')
const { getActionUrls } = require('@adobe/aio-lib-runtime').utils
const yaml = require('js-yaml')
const { loadLocalDevConfig } = require('../../lib/run-local-runtime')

class GetUrlCommand extends BaseCommand {
  async run () {
    // cli input
    const { args, flags } = await this.parse(GetUrlCommand)

    try {
      const options = {}
      options.action = args.action
      options.cdn = flags.cdn

      const urls = {}
      const fullConfig = await this.getFullConfig()
      if (options.action) {
        let action
        // search for action
        Object.values(fullConfig.all).forEach(config => {
          action = config.manifest.package.actions[options.action]
        })
        if (!action) {
          throw new Error(`No action with name ${options.action} found`)
        }
        fullConfig.manifest.package.actions = {}
        fullConfig.manifest.package.actions[options.action] = action
      }

      const actionUrls = {}
      if (flags.local) {
        Object.values(fullConfig.all).forEach(config => {
          const localDevConfig = loadLocalDevConfig(config)
          Object.assign(actionUrls, getActionUrls(localDevConfig, false, true))
        })
      } else {
        Object.values(fullConfig.all).forEach(config => {
          Object.assign(actionUrls, getActionUrls(config, true))
        })
      }
      urls.runtime = actionUrls
      const cdnUrls = {}
      if (options.cdn) {
        Object.values(fullConfig.all).forEach(config => {
          Object.assign(cdnUrls, getActionUrls(config, false))
        })
        urls.cdn = cdnUrls
      }

      if (flags.json) {
        this.log(JSON.stringify(urls))
      } else if (flags.yml) {
        this.log(yaml.dump(urls))
      } else if (flags.hson) {
        this.log(urls)
      } else {
        // urls.runtime is always set
        this.log('Runtime URLs')
        Object.entries(urls.runtime).forEach(([key, value]) => {
          this.log(chalk.blue(chalk.bold(`${key} `)) + ' - ' + chalk.blue(chalk.bold(`${value} `)))
        })

        if (urls.cdn) {
          this.log('CDN URLs')
          Object.entries(urls.cdn).forEach(([key, value]) => {
            this.log(chalk.blue(chalk.bold(`${key} `)) + ' - ' + chalk.blue(chalk.bold(`${value} `)))
          })
        }
      }
      return urls
    } catch (error) {
      this.error(wrapError(error))
    }
  }
}

GetUrlCommand.description = 'Get action URLs'

GetUrlCommand.flags = {
  ...BaseCommand.flags,
  cdn: Flags.boolean({
    description: 'Display CDN based action URLs'
  }),
  json: Flags.boolean({
    description: 'Output json',
    char: 'j'
  }),
  hson: Flags.boolean({
    description: 'Output human readable json',
    char: 'h'
  }),
  yml: Flags.boolean({
    description: 'Output yml',
    char: 'y'
  }),
  local: Flags.boolean({
    description: 'Display locally based action URLs'
  })
}

GetUrlCommand.args = [
  { name: 'action' }
]

module.exports = GetUrlCommand
