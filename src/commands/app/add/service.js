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

const { ENTP_INT_CERTS_FOLDER, CONSOLE_API_KEYS } = require('../../../lib/defaults')

class AddServiceCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddServiceCommand)

    aioLogger.debug(`adding services to the current workspace, using flags: ${flags}`)

    // login
    const { accessToken, env } = await getCliInfo()
    const consoleCLI = await LibConsoleCLI.init({ accessToken, env, apiKey: CONSOLE_API_KEYS[env] })

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

    // log currently selected services (messages on stderr)
    const currentServiceNames = currentServiceProperties.map(s => s.name)
    console.error(`Workspace ${workspace.name} is currently subscribed to the following services:\n${JSON.stringify(currentServiceNames, null, 2)}`)

    // prompt user to decide on how to add services:
    // - select service subscription manually
    // - or clone from existing workspace
    const op = await consoleCLI.promptForServiceSubscriptionsOperation(
      project.workspace.name,
      { cloneChoice: true, nopChoice: true }
    )

    if (op === 'nop') {
      return null
    }

    let serviceProperties = []
    if (op === 'select') {
      // filter out already added services for selection
      const currentServiceCodesSet = new Set(currentServiceProperties.map(s => s.sdkCode))
      const filteredServices = supportedServices.filter(s => s.type === 'entp' && !currentServiceCodesSet.has(s.code))
      if (filteredServices.length <= 0) {
        this.error(`All supported Services in the Organization have already been added to Workspace ${workspace.name}`)
      }
      // prompt to manually select services
      serviceProperties = await consoleCLI.promptForSelectServiceProperties(
        workspace.name,
        filteredServices
      )
      // now past services are appended to the selection for subscription
      serviceProperties.push(...currentServiceProperties)
    } else if (op === 'clone') {
      // get latest workspaces which are not the current
      const otherWorkspaces = (
        await consoleCLI.getWorkspaces(orgId, project.id)
      ).filter(w => w.id !== workspace.id)
      // prompt to select one of those as a source for clone
      const workspaceFrom = await consoleCLI.promptForSelectWorkspace(
        otherWorkspaces,
        {},
        { allowCreate: false }
      )
      // get serviceProperties from source workspace
      serviceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
        orgId,
        project.id,
        workspaceFrom,
        supportedServices
      )
      console.error(`Note: Service Subscriptions in Workspace ${workspace.name} will be overwritten by services in Workspace ${workspaceFrom}`)
    }
    // prompt confirm the new service subscription list
    const confirm = await consoleCLI.confirmNewServiceSubscriptions(
      workspace.name,
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
      this.log(chalk.green(chalk.bold(`Successfully updated Service Subscriptions in Workspace ${workspace.name}`)))
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
