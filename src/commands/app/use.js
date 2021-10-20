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
const { CONSOLE_CONFIG_KEY, importConfigJson, loadAndValidateConfigFile } = require('../../lib/import')
const { flags } = require('@oclif/command')
const inquirer = require('inquirer')
const config = require('@adobe/aio-lib-core-config')
const { EOL } = require('os')
const { warnIfOverwriteServicesInProductionWorkspace } = require('../../lib/app-helper')
const path = require('path')
const { SERVICE_API_KEY_ENV, ENTP_INT_CERTS_FOLDER } = require('../../lib/defaults')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:use', { provider: 'debug' })
const chalk = require('chalk')

/* global LibConsoleCLI */

class Use extends BaseCommand {
  async run () {
    const { flags, args } = this.parse(Use)

    flags.workspace = flags.workspace || flags['workspace-name'] || ''

    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}, flags: ${JSON.stringify(flags, null, 2)}`)

    // some additional checks and updates of flags and args on top of what oclif provides
    this.additionalArgsFlagsProcessing(args, flags)
    aioLogger.debug(`After processing - args: ${JSON.stringify(args, null, 2)}, flags: ${JSON.stringify(flags, null, 2)}`)

    // make sure to prompt on stderr
    const prompt = inquirer.createPromptModule({ output: process.stderr })

    // load local config
    const currentConfig = this.loadCurrentConfiguration()
    const currentConfigString = this.configString(currentConfig)
    const currentConfigIsComplete = this.isCompleteConfig(currentConfig)
    this.log(`You are currently in:${EOL}${currentConfigString}${EOL}`)

    if (args.config_file_path) {
      const consoleConfig = await this.importConsoleConfig(args.config_file_path, flags)
      this.finalLogMessage(consoleConfig)
      return
    }

    // init console CLI sdk consoleCLI
    // NOTE: the user must be able to login now
    const consoleCLI = await this.getLibConsoleCLI()

    // load global console config
    const globalConfig = this.loadGlobalConfiguration()
    const globalConfigString = this.configString(globalConfig, 4)

    // load from global configuration or select workspace ?
    const globalOperationFromFlag = flags.global ? 'global' : null
    const workspaceOperationFromFlag = flags.workspace || flags.workspaceId ? 'workspace' : null
    // did the user specify --global or --workspace
    // Note: global workspace(-name) flags are exclusive (see oclif flags options)
    let useOperation = globalOperationFromFlag || workspaceOperationFromFlag
    // if operation was not specified via flags we need to prompt the user for it
    if (!useOperation) {
      useOperation = await this.promptForUseOperation(prompt, globalConfigString)
    }

    // load the new workspace, project, org config
    let newConfig
    if (useOperation === 'global') {
      if (!this.isCompleteConfig(globalConfig)) {
        const message = `Your global Console configuration is incomplete.${EOL}` +
        'Use the `aio console` commands to select your Organization, Project, and Workspace.'
        this.error(message)
      }
      newConfig = globalConfig
      if (
        currentConfigIsComplete &&
        newConfig.org.id === currentConfig.org.id &&
        newConfig.project.id === currentConfig.project.id &&
        newConfig.workspace.id === currentConfig.workspace.id
      ) {
        this.error('The selected configuration is the same as the current configuration.')
      }
    } else {
      // useOperation = 'workspace'
      if (!currentConfigIsComplete) {
        this.error(
          'Incomplete .aio configuration. Cannot select a new Workspace in same Project.' + EOL +
          'Please import a valid Adobe Developer Console configuration file via `aio app use <config>.json`.'
        )
      }
      const workspace = await this.selectTargetWorkspaceInProject(
        consoleCLI,
        currentConfig,
        flags
      )
      newConfig = {
        ...currentConfig,
        workspace
      }
    }

    // get supported org services
    const supportedServices = await consoleCLI.getEnabledServicesForOrg(newConfig.org.id)

    // sync services in target workspace
    if (currentConfigIsComplete) {
      // only sync if the current configuration is complete
      await this.syncServicesToTargetWorkspace(consoleCLI, prompt, currentConfig, newConfig, supportedServices, flags)
    }

    // download the console configuration for the newly selected org, project, workspace
    const buffer = await this.downloadConsoleConfigToBuffer(consoleCLI, newConfig, supportedServices)

    const consoleConfig = await this.importConsoleConfig(buffer, flags)
    this.finalLogMessage(consoleConfig)
  }

  additionalArgsFlagsProcessing (args, flags) {
    if (args.config_file_path &&
      (flags.workspace || flags.global)
    ) {
      this.error('Flags \'--workspace\' and \'--global\' cannot be used together with arg \'config_file_path\'.')
    }
    if (flags['no-input']) {
      if (!args.config_file_path && !flags.workspace && !flags.global) {
        this.error('Flag \'--no-input\', requires one of: arg \'config_file_path\', flag \'--workspace\' or flag \'--global\'')
      }
      flags['no-service-sync'] = !flags['confirm-service-sync']
      flags.merge = !flags.overwrite
    }
  }

  loadCurrentConfiguration () {
    const projectConfig = config.get('project') || {}
    const org = (projectConfig.org && { id: projectConfig.org.id, name: projectConfig.org.name }) || {}
    const project = { name: projectConfig.name, id: projectConfig.id }
    const workspace = (projectConfig.workspace && { name: projectConfig.workspace.name, id: projectConfig.workspace.id }) || {}
    return { org, project, workspace }
  }

  loadGlobalConfiguration () {
    return config.get(CONSOLE_CONFIG_KEY) || {}
  }

  configString (config, spaces = 0) {
    const { org = {}, project = {}, workspace = {} } = config
    const list = [
      `1. Org: ${org.name || '<no org selected>'}`,
      `2. Project: ${project.name || '<no project selected>'}`,
      `3. Workspace: ${workspace.name || '<no workspace selected>'}`
    ]

    return list
      .map(line => ' '.repeat(spaces) + line)
      .join(EOL)
  }

  async promptForUseOperation (prompt, globalConfigString) {
    const op = await prompt([
      {
        type: 'list',
        name: 'res',
        message: 'Switch to a new Adobe Developer Console configuration:',
        choices: [
          { name: `A. Use the global Org / Project / Workspace configuration:${EOL}${globalConfigString}`, value: 'global' },
          { name: 'B. Switch to another Workspace in the current Project', value: 'workspace' }
        ]
      }
    ])
    return op.res
  }

  isCompleteConfig (config) {
    return config &&
      config.org && config.org.id && config.org.name &&
      config.project && config.project.id && config.project.name &&
      config.workspace && config.workspace.id && config.workspace.name
  }

  /**
   * @param {LibConsoleCLI} consoleCLI lib console config
   * @param {object} config local configuration
   * @param {object} flags input flags
   * @returns {Buffer} the Adobe Developer Console configuration file for the workspace
   */
  async selectTargetWorkspaceInProject (consoleCLI, config, flags) {
    const workspaceNameFlag = flags.workspace
    const workspaceIdFlag = flags.workspaceId
    // workspace flags
    const workspaceDetails = {
      workspaceName: workspaceNameFlag,
      workspaceId: workspaceIdFlag
    }
    // workspaceName flag or workspaceId flag
    const workspaceNameOrId = workspaceNameFlag || workspaceIdFlag

    const { project, org, workspace: currentWorkspace } = config

    // 1. Check if the current selected workspace is the same as the requested one
    if (this.workspaceExist(currentWorkspace, workspaceDetails)) {
      this.cleanConsoleCLIOutput()
      this.error(`--workspace=${workspaceNameOrId} is the same as the currently selected workspace, nothing to be done.`)
    }

    // retrieve all workspaces
    const workspaces = await consoleCLI.getWorkspaces(
      org.id,
      project.id
    )
    const workspacesButCurrent = workspaces.filter(w => w.id !== currentWorkspace.id)
    let workspace

    if (workspaceNameOrId) {
      // 2. Find a workspace with the given name or id
      workspace = workspacesButCurrent.find(currentWorkspace => this.workspaceExist(currentWorkspace, workspaceDetails))
      if (!workspace && workspaceNameFlag) {
        aioLogger.debug(`--workspace=${workspaceNameOrId} was not found in the current Project ${project.name}.
Creating workspace ${workspaceNameOrId}...`)
        const skipPrompt = !!flags['confirm-new-workspace']
        // 2.1. Create the workspace with the given name.
        if (!skipPrompt) {
          const shouldNewWorkspace = await consoleCLI.prompt.promptConfirm(`Workspace ${workspaceNameFlag} was not found \n > Do you wish to create a new workspace named: '${workspaceNameFlag}'`)
          if (!shouldNewWorkspace) {
            this.error(`Workspace creation for ${workspaceNameFlag} was denied by user`)
          }
        }
        workspace = await this.createWorkspace(consoleCLI, config, { workspaceName: workspaceNameFlag })
      }
    } else {
      // 3. Allow user to select or create a workspace.
      workspace = await this.selectOrCreateWorkspace(consoleCLI, config, workspaces)
    }
    return {
      name: workspace.name,
      id: workspace.id
    }
  }

  /**
   * Check if the desired workspace is already selected.
   *
   * @param {{id: string, name:string}} currentWorkspace the current workspace
   * @param {{workspaceName:string, workspaceId:string}} workspaceDetails workspace name or id flag
   * @returns {boolean} true if the workspace name or id flag is the same as current selected workspace.
   * @private
   */
  workspaceExist (currentWorkspace, workspaceDetails) {
    const { workspaceName, workspaceId } = workspaceDetails
    return currentWorkspace.name === workspaceName || currentWorkspace.id === workspaceId
  }

  async selectOrCreateWorkspace (consoleCLI, config, workspaces) {
    const options = { allowCreate: true }
    let workspace = await consoleCLI.promptForSelectWorkspace(workspaces, {}, options)
    if (!workspace) {
      workspace = await this.createWorkspace(consoleCLI, config, {})
    }
    return workspace
  }

  async createWorkspace (consoleCLI, config, { workspaceName = '', workspaceTitle = '' }) {
    const { project: { id: projectId }, org: { id: orgId } } = config
    const workspaceDetails = await consoleCLI.promptForCreateWorkspaceDetails(workspaceName, workspaceTitle)
    return await consoleCLI.createWorkspace(orgId, projectId, workspaceDetails)
  }

  /**
   * @param {LibConsoleCLI} consoleCLI lib console config
   * @private
   */
  async syncServicesToTargetWorkspace (consoleCLI, prompt, currentConfig, newConfig, supportedServices, flags) {
    if (flags['no-service-sync']) {
      console.error('Skipping Services sync as \'--no-service-sync=true\'')
      console.error('Please verify Service subscriptions manually for the new Org/Project/Workspace configuration.')
      return
    }
    const currentServiceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
      currentConfig.org.id,
      currentConfig.project.id,
      currentConfig.workspace,
      supportedServices
    )
    const serviceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
      newConfig.org.id,
      newConfig.project.id,
      newConfig.workspace,
      supportedServices
    )

    // service subscriptions are same
    if (this.equalSets(
      new Set(currentServiceProperties.map(s => s.sdkCode)),
      new Set(serviceProperties.map(s => s.sdkCode))
    )) {
      return
    }

    // Note: this does not handle different product profiles for same service subscriptions yet

    const newWorkspaceName = newConfig.workspace.name
    const newProjectName = newConfig.project.name
    const currentProjectName = currentConfig.project.name

    // service subscriptions are different
    console.error(
      chalk.yellow('⚠ Services attached to the target Workspace do not match Service subscriptions in the current Workspace.')
    )

    // if org is different, sync is more complex as we would need to check if the target
    // org supports the services attached in the current workspace, for now defer to
    // manual selection
    if (currentConfig.org.id !== newConfig.org.id) {
      console.error(chalk.yellow(
        `⚠ Target Project '${newProjectName}' is in a different Org than the current Project '${currentProjectName}.'`
      ))
      console.error(chalk.yellow(
        '⚠ Services cannot be synced across Orgs, please make sure to subscribe' +
        ' to missing Services manually in the Adobe Developer Console.'
      ))
      return
    }

    // go on with sync, ensure user is aware of what where are doing
    console.error(`The '${newWorkspaceName}' Workspace in Project '${newProjectName}' subscribes to the following Services:`)
    console.error(JSON.stringify(serviceProperties.map(s => s.name), null, 2))
    console.error(
      'Your project requires the following Services based on your current Project / Workspace configuration:' +
      `${EOL}${JSON.stringify(currentServiceProperties.map(s => s.name), null, 2)}`
    )

    if (!flags['confirm-service-sync']) {
      // ask for confirmation, overwriting service subscriptions is a destructive
      // operation, especially if done in Production
      warnIfOverwriteServicesInProductionWorkspace(newProjectName, newWorkspaceName)
      const confirm = await prompt([{
        type: 'confirm',
        name: 'res',
        message:
          `${EOL}Do you want to sync and update Services for Workspace '${newWorkspaceName}' in Project '${newProjectName}' now ?`
      }])

      if (!confirm.res) {
        // abort service sync
        console.error('Service will not be synced, make sure to manually add missing Services from the Developer Console.')
        return
      }
    }

    await consoleCLI.subscribeToServices(
      newConfig.org.id,
      newConfig.project,
      newConfig.workspace,
      path.join(this.config.dataDir, ENTP_INT_CERTS_FOLDER),
      currentServiceProperties
    )

    console.error(`✔ Successfully updated Services in Project ${newConfig.project.name} and Workspace ${newConfig.workspace.name}.`)
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

    await importConfigJson(consoleConfigFileOrBuffer, process.cwd(), { interactive, overwrite, merge }, extraEnvVars)
    return config
  }

  async downloadConsoleConfigToBuffer (consoleCLI, config, supportedServices) {
    const workspaceConfig = await consoleCLI.getWorkspaceConfig(
      config.org.id,
      config.project.id,
      config.workspace.id,
      supportedServices
    )
    return Buffer.from(JSON.stringify(workspaceConfig))
  }

  async finalLogMessage (consoleConfig) {
    const config = { org: consoleConfig.project.org, project: consoleConfig.project, workspace: consoleConfig.project.workspace }
    const configString = this.configString(config)
    this.log(chalk.green(chalk.bold(
      `${EOL}✔ Successfully imported configuration for:${EOL}${configString}.`
    )))
  }

  equalSets (setA, setB) {
    if (setA.size !== setB.size) {
      return false
    }
    for (const a of setA) {
      if (!setB.has(a)) {
        return false
      }
    }
    return true
  }
}

Use.description = `Import an Adobe Developer Console configuration file.

If the optional configuration file is not set, this command will retrieve the console org, project, and workspace settings from the global config.

To set these global config values, see the help text for 'aio console --help'.

To download the configuration file for your project, select the 'Download' button in the toolbar of your project's page in https://console.adobe.io
`

Use.flags = {
  ...BaseCommand.flags,
  overwrite: flags.boolean({
    description: 'Overwrite any .aio and .env files during import of the Adobe Developer Console configuration file',
    default: false,
    exclusive: ['merge']
  }),
  merge: flags.boolean({
    description: 'Merge any .aio and .env files during import of the Adobe Developer Console configuration file',
    default: false,
    exclusive: ['overwrite']
  }),
  global: flags.boolean({
    description: 'Use the global Adobe Developer Console Org / Project / Workspace configuration, which can be set via `aio console` commands',
    default: false,
    char: 'g',
    exclusive: ['workspace']
  }),
  workspace: flags.string({
    description: 'Specify the Adobe Developer Console Workspace name to import the configuration from',
    default: '',
    char: 'w',
    exclusive: ['global', 'workspace-name']
  }),
  'confirm-new-workspace': flags.boolean({
    description: 'Skip and confirm prompt for creating a new workspace',
    default: ''
  }),
  'workspace-name': flags.string({
    description: '[DEPRECATED]: please use --workspace instead',
    default: '',
    char: 'w',
    exclusive: ['global', 'workspace']
  }),
  workspaceId: flags.string({
    description: 'Specify the Adobe Developer Console Workspace id to import the configuration from',
    default: '',
    exclusive: ['global', 'workspace-name']
  }),
  'no-service-sync': flags.boolean({
    description: 'Skip the Service sync prompt and do not attach current Service subscriptions to the new Workspace',
    default: false,
    exclusive: ['confirm-service-sync']
  }),
  'confirm-service-sync': flags.boolean({
    description: 'Skip the Service sync prompt and overwrite Service subscriptions in the new Workspace with current subscriptions',
    default: false,
    exclusive: ['no-service-sync']
  }),
  'no-input': flags.boolean({
    description: 'Skip user prompts by setting --no-service-sync and --merge. Requires one of config_file_path or --global or --workspace',
    default: false
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
