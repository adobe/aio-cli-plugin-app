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

const path = require('path')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:service', { provider: 'debug' })
const config = require('@adobe/aio-lib-core-config')
const chalk = require('chalk')

const { getCliInfo } = require('../../../lib/app-helper')
const BaseCommand = require('../../../BaseCommand')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli')

const { CONSOLE_API_KEYS } = require('../../../lib/defaults')

class AddServiceCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddServiceCommand)

    aioLogger.debug(`deleting services in the current workspace, using flags: ${flags}`)

    // login
    const { accessToken, env } = await getCliInfo()
    const consoleCLI = await LibConsoleCLI.init({ accessToken, env, apiKey: CONSOLE_API_KEYS[env] })

    // load console configuration from .aio and .env files
    const project = config.get('project')
    if (!project) {
      this.error('Incomplete .aio configuration, please import a valid Adobe Developer Console configuration via `aio app use` first.')
    }
    const workspace = project.workspace
    const workspaceName = workspace.name
    const workspaceId = workspace.id
    const orgId = project.org.id
    const projectId = project.id

    // get latest support services
    const supportedServices = await consoleCLI.getEnabledServicesForOrg(orgId)

    // get current service properties
    const currentServiceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
      orgId,
      projectId,
      workspace,
      supportedServices
    )

    // update the service config, subscriptions and supported services
    // Note: the service config could be replaced by always fetching latest serviceProperties
    config.set('project.workspace.details.services', currentServiceProperties.map(s => ({
      name: s.name,
      code: s.sdkCode
    })))
    config.set('project.org.details.services', supportedServices.map(s => ({
      name: s.name,
      code: s.code,
      type: s.type
    })))

    const currentServiceNames = currentServiceProperties.map(s => s.name)

    let serviceProperties = []
    if (op === 'select') {
      // filter out already added services for selection
      const currentServiceCodesSet = new Set(currentServiceProperties.map(s => s.sdkCode))
      const filteredServices = supportedServices.filter(s => s.type === 'entp' && !currentServiceCodesSet.has(s.code))
      if (filteredServices.length <= 0) {
        this.error(`All supported Services in the Organization have already been added to Workspace ${workspaceName}`)
      }
      // prompt to manually select services
      serviceProperties = await consoleCLI.promptForSelectServiceProperties(
        workspaceName,
        filteredServices
      )
      // now past services are appended to the selection for subscription
      serviceProperties.push(...currentServiceProperties)
    } else if (op === 'clone') {
      // get latest workspaces which are not the current
      const otherWorkspaces = (
        await consoleCLI.getWorkspaces(orgId, projectId)
      ).filter(w => w.id !== workspaceId)
      // prompt to select one of those as a source for clone
      const workspaceFrom = await consoleCLI.promptForSelectWorkspace(
        otherWorkspaces,
        {},
        { allowCreate: false }
      )
      // get serviceProperties from source workspace
      serviceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
        orgId,
        projectId,
        workspaceFrom,
        supportedServices
      )
      console.error(`Note: Service Subscriptions in Workspace ${workspaceName} will be overwritten by services in Workspace ${workspaceFrom}`)
    }
    // prompt confirm the new service subscription list
    const confirm = await consoleCLI.confirmNewServiceSubscriptions(
      workspaceName,
      serviceProperties
    )
    if (confirm) {
      // if confirmed update the services
      await consoleCLI.subscribeToServices(
        orgId,
        project,
        workspace,
        path.join(this.config.dataDir, ENTP_INT_CERTS_FOLDER),
        serviceProperties
      )
      // update the service configuration with the latest subscriptions
      config.set('project.workspace.details.services', serviceProperties.map(s => ({
        name: s.name,
        code: s.sdkCode
      })))
      // success !
      this.log(chalk.green(chalk.bold(`Successfully updated Service Subscriptions in Workspace ${workspaceName}`)))
      return serviceProperties
    }
    // confirm == false, do nothing
    return null
  }
}

AddServiceCommand.description = `Subscribe to services in the current Workspace
`

AddServiceCommand.flags = {
  ...BaseCommand.flags
}

AddServiceCommand.aliases = ['app:add:services']
AddServiceCommand.args = []

module.exports = AddServiceCommand
