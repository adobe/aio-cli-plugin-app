/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { Flags } = require('@oclif/core')
const yaml = require('js-yaml')
const BaseCommand = require('../../../BaseCommand')
const { loadCurrentConfiguration, configString, hasLocalConfiguration } = require('../../../lib/console-helper')
const { EOL } = require('os')

class WhereCommand extends BaseCommand {
  async run () {
    const { flags } = await this.parse(WhereCommand)

    if (!hasLocalConfiguration()) {
      this.error('No local .aio configuration found for this app. Run `aio app use` to link this app to an Org/Project/Workspace.')
    }

    const currentConfig = loadCurrentConfiguration()

    if (flags.json) {
      this.log(JSON.stringify(currentConfig, null, 2))
      return
    }
    if (flags.yml) {
      this.log(yaml.dump(JSON.parse(JSON.stringify(currentConfig)), {}))
      return
    }

    this.log(`This app is set to use:${EOL}${configString(currentConfig)}`)
  }
}

WhereCommand.description = 'Display the Adobe Developer Console org/project/workspace configuration this app is set to use (as set by `aio app use`)'

WhereCommand.flags = {
  ...BaseCommand.flags,
  json: Flags.boolean({
    description: 'Output json',
    char: 'j',
    exclusive: ['yml']
  }),
  yml: Flags.boolean({
    description: 'Output yml',
    char: 'y',
    exclusive: ['json']
  })
}

WhereCommand.args = {}

module.exports = WhereCommand
