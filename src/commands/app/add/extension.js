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

const { installPackages, atLeastOne, getImplPromptChoices } = require('../../../lib/app-helper')
const aioConfigLoader = require('@adobe/aio-lib-core-config')
const chalk = require('chalk')

class AddExtensionCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddExtensionCommand)

    aioLogger.debug(`add extensions with flags: ${JSON.stringify(flags)}`)
    const spinner = ora()

    if (flags.yes && !flags.extension) {
      this.error('--extension= must also be provided when using --yes')
    }

    const fullConfig = this.getFullConfig({ allowNoImpl: true })
    const implementationsToAdd = await this.selectImplementations(flags, fullConfig)

    await this.runCodeGenerators(flags, implementationsToAdd)

    if (!flags['skip-install']) {
      await installPackages('.', { spinner, verbose: flags.verbose })
    } else {
      this.log('--skip-install, make sure to run \'npm install\' later on')
    }

    // warn about services to add
    const workspaceServices =
      aioConfigLoader.get('services') || // legacy
      aioConfigLoader.get('project.workspace.details.services') ||
      []

    const supportedServiceCodesInWorkspace = new Set(workspaceServices.map(s => s.code))
    implementationsToAdd.forEach(i => {
      const missingServices = i.requiredServices.filter(s => !supportedServiceCodesInWorkspace.has(s))
      if (missingServices.length > 0) {
        this.warn(`Please add missing services '${missingServices}' required by '${i.name}'`)
      }
    })
  }

  async selectImplementations (flags, config) {
    const alreadyImplemented = config.implements
    const consoleCLI = await this.getLibConsoleCLI()
    const availableChoices = await getImplPromptChoices(consoleCLI)
    const availableImplementations = availableChoices.map(i => i.value.name)

    const possibleChoices = availableChoices.filter(i => !alreadyImplemented.includes(i.value.name))
    if (possibleChoices.length <= 0) {
      throw new Error('All available extensions are already implemented in this project.')
    }

    if (flags.extension) {
      // no prompt
      const alreadyThere = flags.extension.filter(i => alreadyImplemented.includes(i))
      if (alreadyThere.length > 0) {
        throw new Error(`'${alreadyThere}' is/are already implemented by this project`)
      }
      const invalid = flags.extension.filter(i => !availableImplementations.includes(i))
      if (invalid.length > 0) {
        throw new Error(`Invalid extension(s) '${invalid}', available implementations are '${availableImplementations}'`)
      }

      return flags.extension.map(i => possibleChoices.find(c => c.value.name === i).value)
    }

    // prompt
    const answers = await this.prompt([{
      type: 'checkbox',
      name: 'res',
      message: 'Which new implementation(s) do you wish to add to the project ?',
      choices: possibleChoices,
      validate: atLeastOne
    }])

    return answers.res
  }

  async runCodeGenerators (flags, implementations) {
    const env = yeoman.createEnv()
    for (let i = 0; i < implementations.length; ++i) {
      const implementation = implementations[i]
      const gen = env.instantiate(implementation.generator,
        {
          options: {
            'skip-prompt': flags.yes,
            force: true // no yeoman overwrite prompts
          }
        })
      this.log(chalk.blue(chalk.bold(`Running generator for ${implementation.name}`)))
      await env.runGenerator(gen)
    }
  }
}

AddExtensionCommand.description = `Add new extensions or a standalone application to the project
`
AddExtensionCommand.flags = {
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
    description: 'Specify extensions to add, skips selection prompt',
    char: 'e',
    multiple: true
  }),
  ...BaseCommand.flags
}

AddExtensionCommand.aliases = ['app:add:ext', 'app:add:extensions']
AddExtensionCommand.args = []

module.exports = AddExtensionCommand
