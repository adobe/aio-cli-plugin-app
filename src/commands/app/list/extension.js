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

import BaseCommand from '../../../BaseCommand.js'

import _aioLoggerFactory from '@adobe/aio-lib-core-logging'
const aioLogger = _aioLoggerFactory('@adobe/aio-cli-plugin-app:list:extensions', { provider: 'debug' })
import { Flags } from '@oclif/core'

import chalk from 'chalk'
import yaml from 'js-yaml'

class ListExtensionCommand extends BaseCommand {
  async run () {
    const { flags } = await this.parse(ListExtensionCommand)
    aioLogger.debug(`list extensions with flags: ${JSON.stringify(flags)}`)

    const extConfig = await this.getAppExtConfigs(flags)
    const extSummary = {}

    Object.keys(extConfig).forEach(extPoint => {
      if (extPoint === 'application') {
        return
      }

      const extension = extConfig[extPoint]
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
    })
    // print
    if (flags.json) {
      this.log(JSON.stringify(extSummary))
    } else if (flags.yml) {
      this.log(yaml.dump(extSummary))
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
  json: Flags.boolean({
    description: 'Output json',
    char: 'j'
  }),
  yml: Flags.boolean({
    description: 'Output yml',
    char: 'y'
  })
}

ListExtensionCommand.aliases = ['app:list:ext', 'app:list:extensions']
ListExtensionCommand.args = {}

export default ListExtensionCommand
