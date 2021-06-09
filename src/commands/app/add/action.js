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

const BaseCommand = require('../../../BaseCommand')
const yeoman = require('yeoman-environment')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { flags } = require('@oclif/command')
const ora = require('ora')

const { servicesToGeneratorInput, installPackages } = require('../../../lib/app-helper')
const aioConfigLoader = require('@adobe/aio-lib-core-config')

class AddActionCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(AddActionCommand)

    aioLogger.debug(`adding component ${args.component} to the project, using flags: ${flags}`)
    const spinner = ora()

    const configs = this.getAppExtConfigs(flags)
    const entries = Object.entries(configs)
    if (entries.length > 1) {
      this.error('You can only add actions to one implementation at the time, please filter with the \'-e\' flag.')
    }

    // todo add to legacy config must update manifest.. and not app.config.yaml
    const workspaceServices =
      aioConfigLoader.get('services') || // legacy
      aioConfigLoader.get('project.workspace.details.services') ||
      []
    const supportedOrgServices = aioConfigLoader.get('project.org.details.services') || []

    const generator = '@adobe/generator-aio-app/generators/add-action'
    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-prompt': flags.yes,
      'adobe-services': servicesToGeneratorInput(workspaceServices),
      'supported-adobe-services': servicesToGeneratorInput(supportedOrgServices)
    })

    if (!flags['skip-install']) {
      await installPackages('.', { spinner, verbose: flags.verbose })
    } else {
      this.log('--skip-install, make sure to run \'npm install\' later on')
    }
    return res
  }
}

AddActionCommand.description = `Add a new action
`

AddActionCommand.flags = {
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

AddActionCommand.args = []

module.exports = AddActionCommand
