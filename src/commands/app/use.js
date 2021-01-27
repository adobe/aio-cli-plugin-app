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
const path = require('path')
const { SERVICE_API_KEY_ENV, CONSOLE_API_KEYS, ENTP_INT_CERTS_FOLDER } = require('../../lib/defaults')

const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli')
const chalk = require('chalk')

class Use extends BaseCommand {
  async run () {
    const { flags, args } = this.parse(Use)

    // load local config
    const currentConfig = this.loadCurrentConfiguration()
    const currentConfigString = this.consoleConfigString(currentConfig)

    console.error(`You are currently in:${EOL}${currentConfigString}${EOL}`)

    if (args.config_file_path) {
      await this.importConsoleConfig(args.config_file_path, flags)
      return
    }

    // login will be required now
    const { accessToken, env: imsEnv } = await getCliInfo()

    // load global console config
    const globalConfig = this.loadGlobalConfiguration()
    const globalConfigString = this.consoleConfigString(globalConfig, 4)

    // init console CLI sdk consoleCLI
    const consoleCLI = await LibConsoleCLI.init({ accessToken, imsEnv, apiKey: CONSOLE_API_KEYS[imsEnv] })

    // load from global configuration or select workspace
    let useOperation = (flags.global && 'global') || ((flags.workspace || flags['workspace-name']) && 'workspace')
    if (!useOperation) {
      // no flags were provided prompt for type of use
      useOperation = await this.promptForUseOperation(globalConfigString)
    }

    // load the new workspace, project, org config
    let newConfig
    if (useOperation === 'global') {
      this.checkGlobalConfig(globalConfig)
      newConfig = globalConfig
      if (
        newConfig.org.id === currentConfig.org.id &&
        newConfig.project.id === currentConfig.project.id &&
        newConfig.workspace.id === currentConfig.workspace.id
      ) {
        this.error('The selected configuration is the same as the current configuration')
      }
    } else {
      // useOperation = 'workspace'
      this.checkLocalConfig(currentConfig)
      const workspace = await this.selectTargetWorkspaceInProject(
        consoleCLI,
        currentConfig,
        flags['workspace-name']
      )
      newConfig = {
        ...currentConfig,
        workspace
      }
    }

    // get supported org services
    const supportedServices = await consoleCLI.getEnabledServicesForOrg(newConfig.org.id)

    // sync services in target workspace
    await this.syncServicesToTargetWorkspace(consoleCLI, currentConfig, newConfig, supportedServices, flags)

    // download the console configuration for the newly selected org, project, workspace
    const buffer = await this.downloadConsoleConfigToBuffer(consoleCLI, newConfig, supportedServices)

    await this.importConsoleConfig(buffer, flags)
  }

  loadCurrentConfiguration () {
    const projectConfig = config.get('project')
    const org = (projectConfig.org && { id: projectConfig.org.id, name: projectConfig.org.name }) || {}
    const project = { name: projectConfig.name, id: projectConfig.id }
    const workspace = (projectConfig.workspace && { name: projectConfig.workspace.name, id: projectConfig.workspace.id }) || {}
    return { org, project, workspace }
  }

  loadGlobalConfiguration () {
    return config.get(CONSOLE_CONFIG_KEY)
  }

  consoleConfigString (globalConfig, spaces = 0) {
    const { org = {}, project = {}, workspace = {} } = globalConfig || {}
    const list = [
      `1. Org: ${org.name || '<no org selected>'}`,
      `2. Project: ${project.name || '<no project selected>'}`,
      `3. Workspace: ${workspace.name || '<no workspace selected>'}`
    ]

    return list
      .map(line => ' '.repeat(spaces) + line)
      .join(EOL)
  }

  async promptForUseOperation (globalConfigString) {
    const op = await inquirer.prompt([
      {
        type: 'list',
        name: 'res',
        message: 'Switch to a new Adobe Developer Console configuration:',
        choices: [
          { name: `A. Use the globally selected Org/Project/Workspace configuration:${EOL}${globalConfigString}`, value: 'global' },
          { name: 'B. Switch to another Workspace in the current Project', value: 'workspace' }
        ]
      }
    ])
    return op.res
  }

  isNotCompleteConfig (config) {
    const { org = {}, project = {}, workspace = {} } = config || {}
    return !config || org === {} || project === {} || workspace === {}
  }

  checkGlobalConfig (globalConfig) {
    if (this.isNotCompleteConfig(globalConfig)) {
      const message = `Your console configuration is incomplete.${EOL}`+
        'Use the `aio console` commands to select your Organization, Project, and Workspace.'
      this.error(message)
    }
  }

  checkLocalConfig (currentConfig) {
    if (this.isNotCompleteConfig(currentConfig)) {
      this.error(
        'Incomplete .aio configuration.' + EOL +
        'Please import a valid Adobe Developer Console configuration file via `aio app use <config>.json`'
      )
    }
  }

  /**
   * @param {LibConsoleCLI} consoleCLI lib console config
   * @param {object} config local configuration
   * @param {object} flags
   * @returns {Buffer} the Adobe Developer Console configuration file for the workspace
   */
  async selectTargetWorkspaceInProject (consoleCLI, config, flags) {
    const project = { name: config.name, id: config.id }
    const currentWorkspace = { name: config.workspace.name, id: config.workspace.id }

    // retrieve all workspaces
    const workspaces = await consoleCLI.getWorkspaces(
      config.org.id,
      config.project.id
    )
    const workspacesButCurrent = workspaces.filter(w => w.id !== currentWorkspace.id)

    let workspace

    const workspaceNameFlag = flags['workspace-name']
    if (workspaceNameFlag) {
      // workspace name is given, make sure the workspace is in there
      workspace = workspacesButCurrent.find(w => w.name === workspaceNameFlag)
      if (!workspace) {
        throw new Error(`Workspace name given in --workspace-name=${workspaceNameFlag} does not exist in Project ${project.name}`)
      }
    } else {
      // workspace name is not given, let the user choose the
      workspace = await consoleCLI.promptForSelectWorkspace(workspacesButCurrent)
    }
    return { name: workspace.name, id: workspace.id }
  }

  /**
   * @param {LibConsoleCLI} consoleCLI lib console config
   * @param currentConfig
   * @param newConfig
   * @param supportedServices
   * @param noConfirmation
   * @param flags
   */
  async syncServicesToTargetWorkspace (consoleCLI, currentConfig, newConfig, supportedServices, flags) {
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

    // service subscriptions are different
    console.error(
      EOL,
      chalk.bold('Services attached to the target Workspace do not match service subscriptions in the current Workspace')
    )

    if (flags['no-service-sync']) {
      console.error('Skipping service sync as --no-service-sync=true')
      return
    }

    // if org is different, sync is more complex as we would need to check if the target
    // org supports the services attached in the current workspace, for now deffer to
    // manual selection
    if (currentConfig.org.id !== newConfig.org.id) {
      console.error(
        `Target Project ${newConfig.project.name} is in a different Org (${newConfig.org.name})` +
        ` than current Project ${currentConfig.project.name} (Org: ${currentConfig.org.name})`
      )
      console.error(
        'Services cannot be synced across orgs, please make sure to subscribe' +
        ' to missing services manually in the Adobe Developer Console.'
      )
      return
    }

    // go on with sync, ensure user is aware of what where are doing
    console.error('The target Workspace is attached to the following services:')
    console.error(JSON.stringify(serviceProperties.map(s => s.name), null, 2))

    if (!flags.confirm.includes['sync-services']) {
      if (newConfig.workspace.name === 'Production') {
        console.error('Note you are about to replace service subscriptions in your Production workspace, make sure to understand the implications first')
      }

      // ask for confirmation, overwritting service subscriptions is a destructive operation, especially if done in Production
      const confirm = await inquirer.prompt([{
        type: 'confirm',
        name: 'res',
        message:
          'Proposed new Service subscriptions list from current Workspace:' +
          `${EOL}${JSON.stringify(currentServiceProperties.map(s => s.name), null, 2)}` +
          `${EOL}Do you want to replace Services in the selected Workspace now ?`
      }])

      if (!confirm.res) {
        // abort service sync
        console.error('Service subscriptions will not be synced, make sure to manually add missing services from the Developer Console')
        return
      }
    } else {
      console.error('With the following Services from the current Workspace')
      console.error(JSON.stringify(currentServiceProperties.map(s => s.sdkCode), null, 2))
    }

    await consoleCLI.subscribeToServices(
      newConfig.org.id,
      newConfig.project,
      newConfig.workspace,
      path.join(this.config.dataDir, ENTP_INT_CERTS_FOLDER),
      currentServiceProperties
    )

    console.error(`Successful sync of Services to target Workspace ${newConfig.workspace.name} in Project ${newConfig.project.name}`)
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

  async downloadConsoleConfigToBuffer (consoleCLI, config, supportedServices) {
    const workspaceConfig = await consoleCLI.getWorkspaceConfig(
      config.org.id,
      config.project.id,
      config.workspace.id,
      supportedServices
    )
    return Buffer.from(JSON.stringify(workspaceConfig))
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

Use.description = `Import an Adobe Developer Console configuration file
`

Use.flags = {
  ...BaseCommand.flags,
  overwrite: flags.boolean({
    description: 'Overwrite any .aio and .env files during import of the Adobe Developer Console configuration file',
    char: 'o',
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
    description: 'Select an Adobe Developer Console Workspace in the same Project, and import the configuration for this Workspace',
    default: false
  }),
  'workspace-name': flags.string({
    description: 'Specify the Adobe Developer Console Workspace name to import the configuration from',
    default: '',
    char: 'w'
  }),
  'no-service-sync': flags.boolean({
    description: 'Do not sync service subscriptions from the current Workspace to the new Workspace/Project',
    default: false
  }),
  // todo replace with force ? note this is a destructive operation
  confirm: flags.string({
    description: 'Skip and confirm specified confirmation prompts',
    default: '',
    multiple: true,
    options: ['service-sync']
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
