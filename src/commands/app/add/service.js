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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:service', { provider: 'debug' })
const { flags } = require('@oclif/command')
const config = require('@adobe/aio-lib-core-config')

const { getCliInfo } = require('../../../lib/app-helper')
const BaseCommand = require('../../../BaseCommand')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli')

// todo embed into lib console cli
const ApiKey = {
  prod: 'aio-cli-console-auth',
  stage: 'aio-cli-console-auth-stage'
}

class AddServiceCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(AddServiceCommand)

    aioLogger.debug(`adding component ${args.component} to the project, using flags: ${flags}`)

    // login
    const { accessToken, env } = await getCliInfo()
    const consoleCLI = await LibConsoleCLI.init({ accessToken, env, apiKey: ApiKey[env] })

    // load console configuration from .aio and .env files
    const project = config.get('project')
    if (!project) {
      this.error('Incomplete .aio configuration, please import a valid Adobe Developer Console configuration via `aio app use` first.')
    }
    // todo check all of those and parent obj ?
    const workspace = project.workspace
    const workspaceName = workspace.name
    const workspaceId = workspace.id
    const orgId = project.org.id
    const projectId = project.id

    // todo from here on all this should be moved to consoleCLI cause same code as in the generator (but getOtherWorkspaces is not)

    // prompt user to decide on how to add services:
    // - select service subscription manually
    // - or clone from existing workspace
    const op = await consoleCLI.promptForAddServicesOperation(
      project.workspace.name,
      { cloneChoice: true, nopChoice: true }
    )

    if (op === 'nop') {
      return null
    }
    // get latest support services
    const supportedServices = await consoleCLI.getEnabledServicesForOrg(orgId)

    // TODO could do `const supportedServices = config.get('project.org.details.services')` instead
    // const currentServicesSet = new Set(
    //   config.get('services') || // legacy
    //   config.get('project.workspace.details.services') ||
    //   []
    // )
    // TODO get fresh current services from console !

    let serviceProperties = []
    // prompt to manually select services
    // todo support already selected services in prompt or filter out already selected services
    // todo licenseconfigs should not be prompted for already added services
    if (op === 'add') {
      serviceProperties = await consoleCLI.promptForSelectServiceProperties(workspaceName, supportedServices)
    } else if (op === 'clone') {
      // get latest other workspaces
      const otherWorkspaces = (
        await consoleCLI.getWorkspaces(orgId, projectId)
      ).filter(w => w.id !== workspaceId)
      // select one of those
      const workspaceFrom = await consoleCLI.promptForSelectWorkspace(
        otherWorkspaces,
        {},
        { allowCreate: false }
      )
      serviceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
        orgId,
        projectId,
        workspaceFrom,
        supportedServices
      )
    }
    const confirm = await consoleCLI.confirmAddServicesToWorkspace(
      workspaceName,
      serviceProperties
    )
    if (confirm) {
      await consoleCLI.addServicesToWorkspace(orgId, projectId, workspace, this.config.dataDir)
      return serviceProperties
    }
    return null
  }
}

AddServiceCommand.description = `Subscribe to services in the current Workspace
`

AddServiceCommand.flags = {
  // TODO
  // yes: flags.boolean({
  //   description: 'Skip questions, and use all default values',
  //   default: false,
  //   char: 'y'
  // }),
  ...BaseCommand.flags
}

AddServiceCommand.args = []

module.exports = AddServiceCommand
