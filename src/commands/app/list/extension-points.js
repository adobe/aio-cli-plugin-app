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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:list:extension-points', { provider: 'debug' })
const { flags } = require('@oclif/command')

const { getAllExtensionPoints } = require('../../../lib/app-helper')
const chalk = require('chalk')
const yaml = require('js-yaml')

class ListExtensionPointsCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(ListExtensionPointsCommand)
    aioLogger.debug(`list all extensions points with flags: ${JSON.stringify(flags)}`)
    const consoleCLI = await this.getLibConsoleCLI()
    const extPointList = await getAllExtensionPoints(consoleCLI)

    const extList = []
    // select meaningful properties from extension point def
    if (extPointList) {
      extPointList.forEach(extPoint => {
        const obj = {}
        obj.name = extPoint.name
        obj.operations = extPoint.operations
        extList.push(obj)
      })
    }

    // print
    if (flags.json) {
      this.log(JSON.stringify(extList))
    } else if (flags.yml) {
      this.log(yaml.safeDump(extList))
    } else {
      if (extList.length > 0) {
        this.log(chalk.bold('Extensions Points'))
        extList.forEach(ext => {
          this.log(ext.name)
          this.log(' operations -> ' + ext.operations)
        })
      } else {
        this.log('No extension points found')
      }
    }
  }
}

ListExtensionPointsCommand.description = `List all extension points for the selected org
`
ListExtensionPointsCommand.flags = {
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

ListExtensionPointsCommand.aliases = ['app:list:ext-points', 'app:list:extension-points']
ListExtensionPointsCommand.args = []

module.exports = ListExtensionPointsCommand
