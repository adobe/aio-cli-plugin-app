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

const BaseCommand = require('../../BaseCommand')
const { CONSOLE_CONFIG_KEY, importConfigJson, loadAndValidateConfigFile, validateConfig } = require('../../lib/import')
const { flags } = require('@oclif/command')
const inquirer = require('inquirer')
const config = require('@adobe/aio-lib-core-config')
const { EOL } = require('os')
const { getCliInfo } = require('../../lib/app-helper')
const fs = require('fs-extra')
const { SERVICE_API_KEY_ENV, CONSOLE_API_KEYS } = require('../../lib/defaults')

const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli')

class Use extends BaseCommand {
  async run () {
    const { flags, args } = this.parse(Use)

    if (args.config_file_path) {
      return this.importConfigFile(args.config_file_path, flags)
    }

    // login will be required now
    const { accessToken, env: imsEnv } = await getCliInfo()

    // load global console config
    const globalConfig = config.get(CONSOLE_CONFIG_KEY)
    const consoleConfigString = this.consoleConfigString(globalConfig)

    let useOperation = (flags.global && 'global') || (flags.workspace && 'workspace')
    if (!useOperation) {
      // no flags were provided prompt for type of use
      useOperation = await this.promptForSwitchOperation(consoleConfigString)
    }

    // init console CLI sdk
    const consoleCLI = await LibConsoleCLI.init({ accessToken, imsEnv, apiKey: CONSOLE_API_KEYS[imsEnv] })

    if (useOperation.global) {
      this.useGlobalConfig(consoleCLI, globalConfig)
    }

    const file = await this.useGlobalConfig(flags)
    if (file) {
      const config = this.importConfigFile(file, flags)
      // delete file only if it was downloaded
      fs.unlinkSync(file)
      return config
    }
  }

  isCompleteConsoleConfig (globalConfig) {
    const { org = {}, project = {}, workspace = {} } = globalConfig || {}
    return !globalConfig || org === {} || project === {} || workspace === {}
  }

  consoleConfigString (globalConfig) {
    const { org = {}, project = {}, workspace = {} } = globalConfig || {}
    const list = [
      `1. Org: ${org.name || '<no org selected>'}`,
      `2. Project: ${project.name || '<no project selected>'}`,
      `3. Workspace: ${workspace.name || '<no workspace selected>'}`
    ]
    const error = !globalConfig || org === {} || project === {} || workspace === {}
    return { value: list.join(EOL), error }
  }

  async promptForUseOperation (globalConfigString) {
    const op = await inquirer.prompt([
      {
        type: 'list',
        name: 'res',
        message: 'Switch to a new Adobe Developer Console configuration:',
        choices: [
          { name: `Use the globally selected Org/Project/Workspace configuration:${EOL}${globalConfigString}`, value: 'global' },
          { name: 'Switch to another Workspace in the current Project', value: 'workspace' }
        ]
      }
    ])
    return op.res
  }

  /**
   * @param {LibConsoleCLI} consoleCLI lib console config
   * @param {string} [workspaceName] optional workspace name, if missing will prompt for it
   * @returns {Buffer} the Adobe Developer Console configuration file for the workspace
   */
  async useWorkspaceInProject (consoleCLI, workspaceName) {
    // first step load local config from .aio and .env files
    const projectConfig = config.get('project')
    if (!projectConfig) {
      this.error(
        'Incomplete .aio configuration, cannot retrieve the current project to load workspaces from.' + EOL +
        'Please import a valid Adobe Developer Console configuration file via `aio app use <config>.json`'
      )
    }
    const orgId = projectConfig.org.id
    const project = { name: projectConfig.name, id: projectConfig.id }
    const currentWorkspace = { name: projectConfig.workspace.name, id: projectConfig.workspace.id }

    // retrieve all workspaces
    const workspaces = await consoleCLI.getWorkspaces()
    const workspacesButCurrent = workspaces.filter(w => w.id !== currentWorkspace.id)

    let workspace

    if (workspaceName) {
      // workspace name is given, make sure the workspace is in there
      workspace = workspacesButCurrent.find(w => w.name === workspaceName)
      if (!workspace) {
        throw new Error(`Workspace name given in --workspace-name=${workspaceName} does not exist in Project ${project.name}`)
      }
    } else {
      // workspace name is not given, let the user choose the
      workspace = await consoleCLI.promptForSelectWorkspace(workspacesButCurrent)
    }

    const getEnabledServicesForOrg
    await consoleCLI.getWorkspaceConfig(workspace, )
  }

  /**
   * @param {LibConsoleCLI} consoleCLI lib console config
   * @param {object} globalConfig global console config
   * @returns {Buffer} the Adobe Developer Console configuration file for the org/project/workspace selected in the global configuration
   */
  async useGlobalConfig (consoleCLI, globalConfig) {
    if (!this.isCompleteConsoleConfig(globalConfig)) {
      const message = `Your console configuration is incomplete.${EOL}Use the 'aio console' commands to select your Organization, Project, and Workspace.`
      this.error(message)
    }

    const { org, project, workspace } = globalConfig

    const supportedServices = await consoleCLI.getEnabledServicesForOrg(org.id)
    const workspaceConfig = await consoleCLI.getWorkspaceConfig(org.id, project.id, workspace.id, supportedServices)

    return Buffer.from(workspaceConfig)
  }

  async importConsoleConfig (consoleConfigFileOrBuffer, flags) {
    const overwrite = flags.overwrite
    const merge = flags.merge
    let interactive = true

    if (overwrite || merge) {
      interactive = false
    }

    // before importing the config, first extract the service api key id
    const { values: config } = loadAndValidateConfigFile(consoleConfigFileOrBuffer)
    const project = config.project
    const jwtConfig = project.workspace.details.credentials && project.workspace.details.credentials.find(c => c.jwt)
    const serviceClientId = (jwtConfig && jwtConfig.jwt.client_id) || ''
    const extraEnvVars = { [SERVICE_API_KEY_ENV]: serviceClientId }

    return importConfigJson(consoleConfigFileOrBuffer, process.cwd(), { interactive, overwrite, merge }, extraEnvVars)
  }

  // async downloadConfigToBuffer (consoleCLI, orgId, projectId, workspaceId) {
  //   const supportedServices = await consoleCLI.getEnabledServicesForOrg(orgId)
  //   const workspaceConfig = await consoleCLI.getWorkspaceConfig(orgId, projectId, workspaceId, supportedServices)

  //   return Buffer.from(workspaceConfig)
  // }
}

Use.description = `Import an Adobe Developer Console configuration file
`

Use.flags = {
  ...BaseCommand.flags,
  overwrite: flags.boolean({
    description: 'Overwrite any .aio and .env files during import of the Adobe Developer Console configuration file',
    char: 'w',
    default: false
  }),
  merge: flags.boolean({
    description: 'Merge any .aio and .env files during import of the Adobe Developer Console configuration file',
    char: 'm',
    default: false
  }),
  global: flags.boolean({
    description: 'Use the global Adobe Developer Console configuration, which can be set via `aio console` commands',
    default: false,
    char: 'g'
  }),
  workspace: flags.boolean({
    description: 'Select an Adobe Developer Console Workspace in the same Project, and import the configuration for this Workspace.',
    default: false
    // todo char
  }),
  'workspace-name': flags.string({
    description: 'Specify the Adobe Developer Console Workspace name to import the configuration from',
    default: ''
  })
}

Use.args = [
  {
    name: 'config_file_path',
    description: 'path to an Adobe I/O Developer Console configuration file',
    required: false
  }
]

module.exports = Use
