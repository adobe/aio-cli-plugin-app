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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { flags } = require('@oclif/command')

const { atLeastOne, deleteUserConfig } = require('../../../lib/app-helper')
const { implPromptChoices } = require('../../../lib/defaults')
const chalk = require('chalk')
const fs = require('fs-extra')
const { EOL } = require('os')

class DeleteExtensionCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(DeleteExtensionCommand)

    aioLogger.debug(`delete extension with flags: ${JSON.stringify(flags)}`)

    if (flags.yes && !flags.extension) {
      this.error('--extension= must also be provided when using --yes')
    }

    const fullConfig = this.getFullConfig({ allowNoImpl: true })
    const configs = await this.selectOrGetConfigsToDelete(flags, fullConfig)

    const resConfirm = await this.prompt([
      {
        type: 'confirm',
        name: 'deleteExtensions',
        message: `Please confirm the deletion of '${Object.keys(configs)}', this will delete the source code`,
        when: !flags.yes
      }
    ])

    if (!flags.yes && !resConfirm.deleteExtensions) {
      this.log('aborting..')
    }

    await this.deleteImplementations(configs)

    this.log(chalk.bold(chalk.green(
      `✔ Successfully deleted implementation(s) '${Object.keys(configs)}'` + EOL +
      '  => please make sure to cleanup associated dependencies, test files and to sync deployment'
    )))
  }

  async selectOrGetConfigsToDelete (flags, config) {
    const alreadyImplemented = config.implements
    if (alreadyImplemented.length <= 0) {
      throw new Error('There are no implementations left in the project')
    }
    if (!flags.extension) {
      const alreadyImplementedChoices = implPromptChoices.filter(i => alreadyImplemented.includes(i.value.name))
      // prompt
      const answers = await this.prompt([{
        type: 'checkbox',
        name: 'res',
        message: 'Which new implementation(s) do you wish to add to the project ?',
        choices: alreadyImplementedChoices,
        validate: atLeastOne
      }])
      flags.extension = answers.res.map(v => v.name)
    }
    return this.getAppExtConfigs(flags)
  }

  deleteImplementations (configs) {
    Object.entries(configs).forEach(([id, c]) => {
      if (c.app.hasBackend) {
        fs.removeSync(c.actions.src)
      }
      if (c.app.hasFrontend) {
        fs.removeSync(c.web.src)
      }
      // try to find another config file => case of init extension in another folder
      const configKey = id === 'application' ? 'application' : `extensions.${id}`
      const configDataOp = this.getConfigFileForKey(configKey + '.operations')
      if (configDataOp.file) {
        fs.removeSync(configDataOp.file)
      }
      // delete config in parent config file
      const configData = this.getConfigFileForKey(configKey)
      deleteUserConfig(configData)
      // todo delete tests !
    })
  }
}

DeleteExtensionCommand.description = `Add new extensions or a standalone application to the project
`
DeleteExtensionCommand.flags = {
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
    description: 'Specify extensions to delete, skips selection prompt',
    char: 'e',
    multiple: true
  }),
  ...BaseCommand.flags
}

DeleteExtensionCommand.aliases = ['app:delete:ext', 'app:delete:extensions']
DeleteExtensionCommand.args = []

module.exports = DeleteExtensionCommand
