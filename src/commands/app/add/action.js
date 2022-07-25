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

const AddCommand = require('../../../AddCommand')
const yeoman = require('yeoman-environment')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const ora = require('ora')
const path = require('path')
const generators = require('@adobe/generator-aio-app')
const { servicesToGeneratorInput } = require('../../../lib/app-helper')
const aioConfigLoader = require('@adobe/aio-lib-core-config')

class AddActionCommand extends AddCommand {
  async run () {
    const { flags } = await this.parse(AddActionCommand)

    aioLogger.debug(`add actions with flags: ${JSON.stringify(flags)}`)
    const spinner = ora()

    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('Please use the \'-e\' flag to specify to which implementation you want to add actions to.')
    }
    const configName = entries[0][0]
    const config = entries[0][1]

    const actionFolder = path.relative(config.root, config.actions.src)

    const configData = this.getRuntimeManifestConfigFile(configName)

    // NOTE: we could get fresh data from console if we know that user is logged in
    const workspaceServices =
      aioConfigLoader.get('services') || // legacy
      aioConfigLoader.get('project.workspace.details.services') ||
      []
    const supportedOrgServices = aioConfigLoader.get('project.org.details.services') || []

    const env = yeoman.createEnv()
    env.options = { skipInstall: true }
    const addActionGen = env.instantiate(generators['add-action'], {
      options: {
        'skip-prompt': flags.yes,
        'action-folder': actionFolder,
        'config-path': configData.file,
        'adobe-services': servicesToGeneratorInput(workspaceServices),
        'supported-adobe-services': servicesToGeneratorInput(supportedOrgServices),
        'full-key-to-manifest': configData.key
        // force: true,
        // by default yeoman runs the install, we control installation from the app plugin
        // Moving ['skip-install': true] to env.options due to yeoman environment issue https://github.com/yeoman/environment/issues/421
      }
    })
    await env.runGenerator(addActionGen)

    await this.runInstallPackages(flags, spinner)
  }
}

AddActionCommand.description = `Add new actions
`

AddActionCommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  extension: Flags.string({
    description: 'Add actions to a specific extension',
    char: 'e',
    multiple: false,
    parse: str => [str]
  }),
  ...AddCommand.flags
}

AddActionCommand.aliases = ['app:add:actions']
AddActionCommand.args = []

module.exports = AddActionCommand
