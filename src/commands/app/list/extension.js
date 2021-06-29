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

    EXTENSION_POINT_LIST.forEach(extPoint => {
      const extension = extConfig[extPoint]

      if (extension) {
        const extDetails = { operations: {} }
        extSummary[extPoint] = extDetails

        // get view impl details
        if (extension.operations.view) {
          extDetails.operations.view = [
            {
              impl: extension.operations.view[0].impl,
              src: extension.web.src
            }
          ]
        }
        // get worker impl details
        if (extension.operations.worker) {
          // TODO extension.manifest.full.packages[extPoint.toString()] doesnt fetch package details
          const pkgDetails = extension.manifest.full.packages['dx-asset-compute-worker-1']
          let src
          if (pkgDetails && pkgDetails.actions && pkgDetails.actions.worker) {
            src = pkgDetails.actions.worker.function
          }
          extDetails.operations.worker = [
            {
              impl: extension.operations.worker[0].impl,
              src: src
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
            this.log('   src -> ' + summary.operations.view[0].src)
          }
          if (summary.operations.worker) {
            this.log(' - worker')
            this.log('   impl -> ' + summary.operations.worker[0].impl)
            this.log('   src -> ' + summary.operations.worker[0].src)
          }
        })
      } else {
        this.log('No extensions found')
      }
    }
  }

  getImplementedExtensions (fullConfig) {
    const extList = []
    if (fullConfig.implements) {
      fullConfig.implements.forEach(ext => {
        extList.push(ext)
      })
    }
    return extList
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
