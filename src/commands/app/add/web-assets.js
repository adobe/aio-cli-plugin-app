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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:web-assets', { provider: 'debug' })
const { flags } = require('@oclif/command')
const ora = require('ora')
const generators = require('@adobe/generator-aio-app')
const aioConfigLoader = require('@adobe/aio-lib-core-config')
const { installPackages, servicesToGeneratorInput } = require('../../../lib/app-helper')

class AddWebAssetsCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddWebAssetsCommand)
    const spinner = ora()
    aioLogger.debug(`add web-assets with flags: ${JSON.stringify(flags)}`)

    const projectName = this.getFullConfig().packagejson.name
    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('Please use the \'-e\' flag to specify to which implementation you want to add web-assets to.')
    }
    const config = entries[0][1]
    const webSrcFolder = config.web.src

    const workspaceServices =
      aioConfigLoader.get('services') || // legacy
      aioConfigLoader.get('project.workspace.details.services') ||
      []

    const env = yeoman.createEnv()
    const gen = env.instantiate(generators['add-web-assets'], {
      options: {
        'skip-prompt': flags.yes,
        'project-name': projectName,
        'web-src-folder': webSrcFolder,
        'adobe-services': servicesToGeneratorInput(workspaceServices)
        // force: true
      }
    })
    await env.runGenerator(gen)

    if (!flags['skip-install']) {
      await installPackages('.', { spinner, verbose: flags.verbose })
    } else {
      this.log('--skip-install, make sure to run \'npm install\' later on')
    }
  }
}

AddWebAssetsCommand.description = `Add web assets support
`

AddWebAssetsCommand.flags = {
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
    description: 'Add web-assets to a specific extension',
    char: 'e',
    multiple: false,
    parse: str => [str]
  }),
  ...BaseCommand.flags
}

AddWebAssetsCommand.args = []

module.exports = AddWebAssetsCommand
