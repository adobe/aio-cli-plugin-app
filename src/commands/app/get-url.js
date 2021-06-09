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

const { flags } = require('@oclif/command')

const BaseCommand = require('../../BaseCommand')
const { wrapError } = require('../../lib/app-helper')
const { getActionUrls } = require('@adobe/aio-lib-runtime').utils
const yaml = require('js-yaml')

class GetUrlCommand extends BaseCommand {
  async run () {
    // cli input
    const { args, flags } = this.parse(GetUrlCommand)

    try {
      const options = {}
      options.action = args.action
      options.cdn = flags.cdn

      const urls = {}
      const configCopy = this.getFullConfig()
      if (options.action) {
        const action = configCopy.manifest.package.actions[options.action]
        if (!action) {
          throw new Error(`No action with name ${options.action} found`)
        }
        configCopy.manifest.package.actions = {}
        configCopy.manifest.package.actions[options.action] = action
      }
      const actionUrls = await getActionUrls(configCopy, true)
      urls.runtime = actionUrls
      if (options.cdn) {
        const cdnUrls = await getActionUrls(configCopy, false)
        urls.cdn = cdnUrls
      }

      if (flags.json) {
        this.log(JSON.stringify(urls))
      } else if (flags.yml) {
        this.log(yaml.safeDump(urls))
      } else if (flags.hson) {
        this.log(urls)
      } else {
        if (urls.runtime) {
          this.log('Runtime URLs')
          Object.entries(urls.runtime).forEach(([key, value]) => {
            this.log(chalk.blue(chalk.bold(`${key} `)) + ' - ' + chalk.blue(chalk.bold(`${value} `)))
          })
        }

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
  cdn: flags.boolean({
    description: 'Display CDN based action URLs'
  }),
  json: flags.boolean({
    description: 'Output json',
    char: 'j'
  }),
  hson: flags.boolean({
    description: 'Output human readable json',
    char: 'h'
  }),
  yml: flags.boolean({
    description: 'Output yml',
    char: 'y'
  })
}

GetUrlCommand.args = [
  { name: 'action' }
]

module.exports = GetUrlCommand
