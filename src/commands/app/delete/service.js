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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:delete:service', { provider: 'debug' })
const config = require('@adobe/aio-lib-core-config')
const chalk = require('chalk')

const {
  setOrgServicesConfig,
  setWorkspaceServicesConfig,
  warnIfOverwriteServicesInProductionWorkspace
} = require('../../../lib/app-helper')

const BaseCommand = require('../../../BaseCommand')

class AddServiceCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddServiceCommand)

    aioLogger.debug(`deleting Services in the current workspace, using flags: ${JSON.stringify(flags, null, 2)}`)

    // login
    // init console CLI sdk consoleCLI, requires login
    const consoleCLI = await this.getLibConsoleCLI()

    // load console configuration from .aio and .env files
    const projectConfig = config.get('project')
    if (!projectConfig) {
      this.error('Incomplete .aio configuration, please import a valid Adobe Developer Console configuration via `aio app use` first.')
    }
    const orgId = projectConfig.org.id
    const project = { name: projectConfig.name, id: projectConfig.id }
    const workspace = { name: projectConfig.workspace.name, id: projectConfig.workspace.id }

    // get latest support services
    const supportedServices = await consoleCLI.getEnabledServicesForOrg(orgId)

    // get current service properties
    const currentServiceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
      orgId,
      project.id,
      workspace,
      supportedServices
    )

    // update the service config, subscriptions and supported services
    setOrgServicesConfig(supportedServices)
    setWorkspaceServicesConfig(currentServiceProperties)

    if (currentServiceProperties.length <= 0) {
      this.cleanConsoleCLIOutput()
      this.error(`No Services are attached to Workspace ${workspace.name}`)
    }

    // const currentServiceChoices = currentServiceProperties.map(s => ({ name: s.name, code: s.sdkCode }))
    const newServiceProperties = await consoleCLI.promptForRemoveServiceSubscriptions(
      workspace.name,
      currentServiceProperties
    )
    if (newServiceProperties === null) {
      this.log('No Services selected, nothing to be done')
      return null
    }
    warnIfOverwriteServicesInProductionWorkspace(project.name, workspace.name)
    // prompt confirm the new service subscription list
    const confirm = await consoleCLI.confirmNewServiceSubscriptions(
      workspace.name,
      newServiceProperties
    )
    if (confirm) {
      // if confirmed update the services
      await consoleCLI.subscribeToServices(
        orgId,
        project,
        workspace,
        null, // no need to specify certDir, here we are sure that credentials are attached
        newServiceProperties
      )
      // update the service configuration with the latest subscriptions
      setWorkspaceServicesConfig(newServiceProperties)
      // success !
      this.log(chalk.green(chalk.bold(`Successfully deleted selected Service Subscriptions in Workspace ${workspace.name}`)))
      return newServiceProperties
    }
    // confirm == false, do nothing
    return null
  }
}

AddServiceCommand.description = `Delete Services in the current Workspace
`

AddServiceCommand.flags = {
  ...BaseCommand.flags
}

AddServiceCommand.aliases = ['app:delete:services']
AddServiceCommand.args = []

module.exports = AddServiceCommand
