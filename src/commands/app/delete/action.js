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
const inquirer = require('inquirer')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:delete:action', { provider: 'debug' })
const { flags } = require('@oclif/command')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const { EOL } = require('os')
const { atLeastOne, deleteUserConfig } = require('../../../lib/app-helper')

class DeleteActionCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(DeleteActionCommand)

    aioLogger.debug(`deleting actions from the project, with args ${JSON.stringify(args)}, and flags: ${JSON.stringify(flags)}`)

    // is there an oclif mechanism for flag depends on arg?
    if (flags.yes && !args['action-name']) {
      this.error('<action-name> must also be provided when using --yes')
    }

    const fullConfig = this.getFullConfig()
    const { actions, actionsByImpl } = this.getAllActions(fullConfig)
    if (actions.length <= 0) {
      this.error('There are no actions in this project!')
    }
    let actionsToBeDeleted
    if (args['action-name']) {
      const actionsToBeDeletedString = args['action-name'].split(',')
      const notExist = actionsToBeDeletedString.filter(ad => {
        return !actions.some(a => {
          return a.name === ad
        })
      })
      if (notExist.length > 0) {
        throw new Error(`action(s) '${notExist}' not found`)
      }
      actionsToBeDeleted = actionsToBeDeletedString.map(ad => actions.find(a => a.name === ad))
    } else {
      // prompt user
      const choices = []
      Object.entries(actionsByImpl).forEach(([implName, actions]) => {
        choices.push(new inquirer.Separator(`-- actions for '${implName}' --`))
        choices.push(...actions.map(a => ({ name: a.name, value: a })))
      })
      const res = await this.prompt([
        {
          type: 'checkbox',
          name: 'actions',
          message: 'Which actions do you wish to delete from this project?\nselect actions to delete',
          choices,
          validate: atLeastOne
        }
      ])
      actionsToBeDeleted = res.actions
    }

    const resConfirm = await this.prompt([
      {
        type: 'confirm',
        name: 'deleteAction',
        message: `Please confirm the deletion of '${actionsToBeDeleted.map(a => a.name)}', this will delete the source code`,
        when: !flags.yes
      }
    ])

    if (!flags.yes && !resConfirm.deleteAction) {
      this.error('aborting..')
    }

    actionsToBeDeleted.forEach(action => {
      // remove action files
      const folder = fs.statSync(action.path).isFile() ? path.dirname(action.path) : action.path
      fs.removeSync(folder)
      aioLogger.debug(`deleted '${folder}'`)
      // delete test files
      // NOTE: those paths are not always correct, but removeSync doesn't throw in case the file does not exist
      try {
        const pathToE2eTests = path.join('e2e', action.actionsDir, action.actionName + '.e2e.js')
        const pathToUnitTests = path.join('test', action.actionsDir, action.actionName + '.test.js')
        fs.removeSync(pathToE2eTests)
        aioLogger.debug(`deleted '${pathToE2eTests}'`)
        fs.removeSync(pathToUnitTests)
        aioLogger.debug(`deleted '${pathToUnitTests}'`)

        // delete manifest action config
        deleteUserConfig(action.configData)
      } catch (e) {
        this.log('error', e)
      }

      this.log(chalk.green(`✔ Deleted '${action.name}'`))
    })
    this.log(chalk.bold(chalk.green(
      `✔ Successfully deleted action(s) '${actionsToBeDeleted.map(a => a.name)}'` + EOL +
      '  => please make sure to cleanup associated dependencies and to undeploy any deleted actions'
    )))
  }

  getAllActions (config) {
    const actions = []
    const actionsByImpl = {}
    Object.entries(config.all).forEach(([implName, implConfig]) => {
      if (implConfig.app.hasBackend) {
        actionsByImpl[implName] = []
        Object.entries(implConfig.manifest.full.packages).forEach(([pkgName, pkg]) => {
          Object.entries(pkg.actions).forEach(([actionName, action]) => {
            const fullActionName = `${pkgName}/${actionName}`
            const startKey = implName === 'application' ? 'application' : `extensions.${implName}`
            const configData = this.getConfigFileForKey(`${startKey}.runtimeManifest.packages.${pkgName}.actions.${actionName}`)
            const actionObj = {
              // assumes path is not relative
              path: action.function,
              actionsDir: path.relative(implConfig.root, implConfig.actions.src),
              name: fullActionName,
              actionName,
              configData
            }
            actions.push(actionObj)
            actionsByImpl[implName].push(actionObj)
          })
        })
      } else {
        aioLogger.debug(`'${implName}' .app.hasBackend is not true`)
      }
    })
    return { actions, actionsByImpl }
  }
}

DeleteActionCommand.description = `Delete existing actions
`

DeleteActionCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    char: 'y',
    default: false
  }),
  ...BaseCommand.flags
}

DeleteActionCommand.args = [
  {
    name: 'action-name',
    description: 'Action `pkg/name` to delete, you can specify multiple actions via a comma separated list',
    default: '',
    required: false
  }
]

DeleteActionCommand.aliases = ['app:delete:actions']

module.exports = DeleteActionCommand
