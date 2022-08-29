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
const { Flags } = require('@oclif/core')

const chalk = require('chalk')
const yaml = require('js-yaml')

class ListExtensionPointsCommand extends BaseCommand {
  async run () {
    const { flags } = await this.parse(ListExtensionPointsCommand)
    aioLogger.debug(`list all extensions points with flags: ${JSON.stringify(flags)}`)

    const extConfig = this.getAppExtConfigs(flags)
    const extPointList = {}

    Object.keys(extConfig).forEach(key => {
      const name = extConfig[key].name
      const operations = Object.keys(extConfig[key].operations)
      extPointList[name] = { operations }
    })

    // print
    if (flags.json) {
      this.log(JSON.stringify(extPointList))
    } else if (flags.yml) {
      this.log(yaml.dump(extPointList))
    } else {
      this.log(chalk.bold('Extensions Points'))
      Object.keys(extPointList).forEach(key => {
        this.log(key)
        this.log(' operations')
        extPointList[key].operations.forEach(opr => {
          this.log('  -> ' + opr)
        })
      })
    }
  }
}

ListExtensionPointsCommand.description = `List all extension points for the selected org
`
ListExtensionPointsCommand.flags = {
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

ListExtensionPointsCommand.aliases = ['app:list:ext-points', 'app:list:extension-points']
ListExtensionPointsCommand.args = []

module.exports = ListExtensionPointsCommand
