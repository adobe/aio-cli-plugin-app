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

const { EXTENSION_POINT_LIST } = require('../../../lib/defaults')
const chalk = require('chalk')
const yaml = require('js-yaml')

class ListExtensionPointsCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(ListExtensionPointsCommand)
    aioLogger.debug(`list all extensions points with flags: ${JSON.stringify(flags)}`)

    // print
    if (flags.json) {
      this.log(JSON.stringify(EXTENSION_POINT_LIST))
    } else if (flags.yml) {
      this.log(yaml.safeDump(EXTENSION_POINT_LIST))
    } else {
      this.log(chalk.bold('Extensions Points'))
      Object.keys(EXTENSION_POINT_LIST).forEach(key => {
        this.log(key)
        this.log(' operations')
        EXTENSION_POINT_LIST[key].operations.forEach(opr => {
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
