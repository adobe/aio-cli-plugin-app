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
const path = require('path')

const { servicesToGeneratorInput, installPackages } = require('../../../lib/app-helper')
const aioConfigLoader = require('@adobe/aio-lib-core-config')
const { APPLICATION_CONFIG_KEY, EXTENSIONS_CONFIG_KEY } = require('../../../lib/defaults')

class AddActionCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddActionCommand)

    aioLogger.debug(`adding component actions to the project, using flags: ${JSON.stringify(flags)}`)
    const spinner = ora()

    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('You can only add actions to one implementation at the time, please filter with the \'-e\' flag.')
    }

    const configName = entries[0][0]
    const config = entries[0][1]
    const actionFolder = path.relative(config.root, config.actions.src)
    let configKey
    if (configName === APPLICATION_CONFIG_KEY) {
      configKey = APPLICATION_CONFIG_KEY
    } else {
      configKey = `${EXTENSIONS_CONFIG_KEY}.${configName}`
    }
    // take path to config file that holds runtimeManifest OR if there is none (no actions yet) take the path to the ext/app config
    const configPath = this.getConfigFileForKey(`${configKey}.runtimeManifest`) || this.getConfigFileForKey(`${configKey}`)

    // NOTE: we could get fresh data from console if we know that user is logged in
    const workspaceServices =
      aioConfigLoader.get('services') || // legacy
      aioConfigLoader.get('project.workspace.details.services') ||
      []
    const supportedOrgServices = aioConfigLoader.get('project.org.details.services') || []

    const env = yeoman.createEnv()
    // first run app generator that will generate the root skeleton
    const addActionGen = env.create(require.resolve('@adobe/generator-aio-app/generators/add-action'), {
      options: {
        'skip-prompt': flags.yes,
        'action-folder': actionFolder,
        'config-path': configPath,
        'adobe-services': servicesToGeneratorInput(workspaceServices),
        'supported-adobe-services': servicesToGeneratorInput(supportedOrgServices),
        // force overwrites, no useless prompts, this is a feature exposed by yeoman itself
        force: true
      }
    })

    await env.runGenerator(addActionGen)

    if (!flags['skip-install']) {
      await installPackages('.', { spinner, verbose: flags.verbose })
    } else {
      this.log('--skip-install, make sure to run \'npm install\' later on')
    }
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
