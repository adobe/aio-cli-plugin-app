/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const BaseCommand = require('../../../BaseCommand')
const yeoman = require('yeoman-environment')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:event', { provider: 'debug' })
const { flags } = require('@oclif/command')
const { installPackages } = require('../../../lib/app-helper')
const ora = require('ora')
const path = require('path')
const generators = require('@adobe/generator-aio-app')

class AddEventCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddEventCommand)

    aioLogger.debug(`add events with flags: ${JSON.stringify(flags)}`)
    const spinner = ora()

    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('Please use the \'-e\' flag to specify to which implementation you want to add events to.')
    }
    const configName = entries[0][0]
    const config = entries[0][1]
    const actionFolder = path.relative(config.root, config.actions.src)
    const configData = this.getRuntimeManifestConfigFile(configName)

    const env = yeoman.createEnv()
    const eventsGen = env.instantiate(generators['add-events'], {
      options: {
        'skip-prompt': flags.yes,
        'action-folder': actionFolder,
        'config-path': configData.file,
        'full-key-to-manifest': configData.key,
        // force overwrites, no useless prompts, this is a feature exposed by yeoman itself
        force: true
      }
    })
    await env.runGenerator(eventsGen)

    if (!flags['skip-install']) {
      await installPackages('.', { spinner, verbose: flags.verbose })
    } else {
      this.log('--skip-install, make sure to run \'npm install\' later on')
    }
  }
}

AddEventCommand.description = `Add a new Adobe I/O Events action
`

AddEventCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  'skip-install': flags.boolean({
    description: 'Skip npm installation after files are created',
    default: false
  }),
  extension: flags.string({
    description: 'Add actions to a specific extension',
    char: 'e',
    multiple: false,
    parse: str => [str]
  }),
  ...BaseCommand.flags
}

AddEventCommand.aliases = ['app:add:events']
AddEventCommand.args = []

module.exports = AddEventCommand
