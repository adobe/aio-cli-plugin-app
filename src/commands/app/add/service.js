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

const { importConsoleConfig, downloadConsoleConfigToBuffer } = require('../../../lib/import')
const { getProjectCredentialType } = require('../../../lib/import-helper')
const path = require('path')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:service', { provider: 'debug' })
const config = require('@adobe/aio-lib-core-config')
const chalk = require('chalk')
const { Flags } = require('@oclif/core')

const {
  setOrgServicesConfig,
  setWorkspaceServicesConfig,
  warnIfOverwriteServicesInProductionWorkspace
} = require('../../../lib/app-helper')

const BaseCommand = require('../../../BaseCommand')

const { ENTP_INT_CERTS_FOLDER } = require('../../../lib/defaults')

class AddServiceCommand extends BaseCommand {
  async run () {
    const { flags } = await this.parse(AddServiceCommand)

    aioLogger.debug(`adding services to the current workspace, using flags: ${JSON.stringify(flags, null, 2)}`)

    // init console CLI sdk consoleCLI
    // NOTE: the user must be able to login
    const consoleCLI = await this.getLibConsoleCLI()

    // load console configuration from .aio and .env files
    const projectConfig = config.get('project')
    if (!projectConfig) {
      this.error(`Incomplete .aio configuration, please import a valid Adobe Developer Console configuration via \`${this.config.bin} app use\` first.`)
    }
    const orgId = projectConfig.org.id
    const project = { name: projectConfig.name, id: projectConfig.id }
    const workspace = { name: projectConfig.workspace.name, id: projectConfig.workspace.id }

    // get project credential type
    const projectCredentialType = getProjectCredentialType(projectConfig, flags)

    // get latest support services
    const supportedServices = await consoleCLI.getEnabledServicesForOrg(orgId)

    // get current service properties
    const currentServiceProperties = await consoleCLI.getServicePropertiesFromWorkspaceWithCredentialType({
      orgId,
      projectId: project.id,
      workspace,
      supportedServices,
      credentialType: projectCredentialType
    })

    // update the service config, subscriptions and supported services
    setOrgServicesConfig(supportedServices)
    setWorkspaceServicesConfig(currentServiceProperties)

    // log currently selected services (messages on stderr)
    const currentServiceNames = currentServiceProperties.map(s => s.name)
    console.error(`Workspace ${workspace.name} currently subscribes to the following services:\n${JSON.stringify(currentServiceNames, null, 2)}`)

    // prompt user to decide on how to add services:
    // - select service subscription manually
    // - or clone from existing workspace
    const op = await consoleCLI.promptForServiceSubscriptionsOperation(
      workspace.name,
      { cloneChoice: true, nopChoice: true }
    )

    if (op === 'nop') {
      return null
    }

    let newServiceProperties = []
    if (op === 'select') {
      // filter out already added services for selection
      const currentServiceCodesSet = new Set(currentServiceProperties.map(s => s.sdkCode))
      const filteredServices = supportedServices.filter(s => s.type === 'entp' && !currentServiceCodesSet.has(s.code))
      if (filteredServices.length <= 0) {
        await this.cleanConsoleCLIOutput()
        this.error(`All supported Services in the Organization have already been added to Workspace ${workspace.name}`)
      }
      // prompt to manually select services
      newServiceProperties = await consoleCLI.promptForSelectServiceProperties(
        workspace.name,
        filteredServices
      )
      // now past services are appended to the selection for subscription
      newServiceProperties.push(...currentServiceProperties)
    }
    if (op === 'clone') {
      // get the latest workspaces which are not the current
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
      newServiceProperties = await consoleCLI.getServicePropertiesFromWorkspaceWithCredentialType({
        orgId,
        projectId: project.id,
        workspace: workspaceFrom,
        supportedServices,
        credentialType: projectCredentialType
      })

      if (currentServiceNames.length > 0) {
        warnIfOverwriteServicesInProductionWorkspace(project.name, workspace.name)
        if (workspace.name !== 'Production') {
          console.error(chalk.yellow(`⚠ Service subscriptions in Workspace '${workspace.name}' will be overwritten.`))
        }
      }
    }
    // prompt confirm the new service subscription list
    const confirm = await consoleCLI.confirmNewServiceSubscriptions(
      workspace.name,
      newServiceProperties
    )
    if (confirm) {
      // if confirmed update the services
      await consoleCLI.subscribeToServicesWithCredentialType({
        orgId,
        project,
        workspace,
        certDir: path.join(this.config.dataDir, ENTP_INT_CERTS_FOLDER),
        serviceProperties: newServiceProperties,
        credentialType: projectCredentialType
      })

      // update environment
      const config = {
        org: { id: projectConfig.org.id },
        project: { id: projectConfig.id },
        workspace: { id: projectConfig.workspace.id }
      }
      const buffer = await downloadConsoleConfigToBuffer(consoleCLI, config, supportedServices)
      await importConsoleConfig(buffer, flags)

      // success !
      this.log(chalk.green(chalk.bold(`Successfully updated Service Subscriptions in Workspace ${workspace.name}`)))
      return newServiceProperties
    }
    // confirm == false, do nothing
    return null
  }
}

AddServiceCommand.description = `Subscribe to Services in the current Workspace
`

AddServiceCommand.flags = {
  ...BaseCommand.flags,
  'use-jwt': Flags.boolean({
    description: 'if the config has both jwt and OAuth Server to Server Credentials (while migrating), prefer the JWT credentials',
    default: false
  })
}

AddServiceCommand.aliases = ['app:add:services']
AddServiceCommand.args = {}

module.exports = AddServiceCommand
