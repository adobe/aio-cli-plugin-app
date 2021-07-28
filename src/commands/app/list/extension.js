/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const BaseCommand = require('../../../BaseCommand')

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:list:extensions', { provider: 'debug' })
const { flags } = require('@oclif/command')

const { EXTENSION_POINT_LIST } = require('../../../lib/defaults')
const chalk = require('chalk')
const yaml = require('js-yaml')

class ListExtensionCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(ListExtensionCommand)
    aioLogger.debug(`list extensions with flags: ${JSON.stringify(flags)}`)

    const extConfig = this.getAppExtConfigs(flags)
    const extSummary = {}

    Object.keys(EXTENSION_POINT_LIST).forEach(extPoint => {
      const extension = extConfig[extPoint]
      if (extension) {
        const extDetails = { operations: {} }
        extSummary[extPoint] = extDetails

        // get view impl details
        if (extension.operations.view) {
          extDetails.operations.view = [
            {
              impl: extension.operations.view[0].impl
            }
          ]
        }
        // get worker impl details
        if (extension.operations.workerProcess) {
          extDetails.operations.workerProcess = [
            {
              impl: extension.operations.workerProcess[0].impl
            }
          ]
        }
      }
    })
    // print
    if (flags.json) {
      this.log(JSON.stringify(extSummary))
    } else if (flags.yml) {
      this.log(yaml.safeDump(extSummary))
    } else {
      if (Object.keys(extSummary).length > 0) {
        this.log(chalk.bold('Extensions'))
        Object.keys(extSummary).forEach(key => {
          const summary = extSummary[key]
          this.log(key)
          if (summary.operations.view) {
            this.log(' - view')
            this.log('   impl -> ' + summary.operations.view[0].impl)
          }
          if (summary.operations.workerProcess) {
            this.log(' - workerProcess')
            this.log('   impl -> ' + summary.operations.workerProcess[0].impl)
          }
        })
      } else {
        this.log('No extensions found')
      }
    }
  }
}

ListExtensionCommand.description = `List implemented extensions
`
ListExtensionCommand.flags = {
  ...BaseCommand.flags,
  json: flags.boolean({
    description: 'Output json',
    char: 'j'
  }),
  yml: flags.boolean({
    description: 'Output yml',
    char: 'y'
  })
}

ListExtensionCommand.aliases = ['app:list:ext', 'app:list:extensions']
ListExtensionCommand.args = []

module.exports = ListExtensionCommand
