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
const AppScripts = require('@adobe/aio-app-scripts')
const { wrapError } = require('../../lib/app-helper')

class GetUrlCommand extends BaseCommand {
  async run () {
    // cli input
    const { args } = this.parse(GetUrlCommand)
    const { flags } = this.parse(GetUrlCommand)
    const scripts = AppScripts({ listeners: {} })

    try {
      const options = {}
      options.action = args.action
      options.cdn = flags.cdn
      const urls = await scripts.getUrls(options)
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
  })
}

GetUrlCommand.args = [
  { name: 'action' }
]

module.exports = GetUrlCommand
