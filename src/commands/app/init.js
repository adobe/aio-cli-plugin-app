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

const AddCommand = require('../../AddCommand')
const yeoman = require('yeoman-environment')
const path = require('path')
const fs = require('fs-extra')
const ora = require('ora')
const chalk = require('chalk')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:init', { provider: 'debug' })
const { flags } = require('@oclif/command')
const generators = require('@adobe/generator-aio-app')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')
const inquirer = require('inquirer')
const inquirerTablePrompt = require('inquirer-table-prompt')

const { loadAndValidateConfigFile, importConfigJson } = require('../../lib/import')
const { ENTP_INT_CERTS_FOLDER, SERVICE_API_KEY_ENV } = require('../../lib/defaults')

const DEFAULT_WORKSPACE = 'Stage'

class InitCommand extends AddCommand {
  async run () {
    const { args, flags } = this.parse(InitCommand)

    if (!flags.login && flags.workspace !== DEFAULT_WORKSPACE) {
      this.error('--no-login and --workspace flags cannot be used together.')
    }

    if (flags.import) {
      // resolve to absolute path before any chdir
      flags.import = path.resolve(flags.import)
    }

    const destDir = this.destDir(args)
    if (destDir !== '.') {
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }

    const spinner = ora()
    if (flags.import || !flags.login) {
      // import a console config - no login required!
      await this.initNoLogin(destDir, flags)
    } else {
      // we can login
      await this.initWithLogin(destDir, flags)
    }

    // install packages, always at the end, so user can ctrl+c
    await this.runInstallPackages(flags, spinner)

    this.log(chalk.bold(chalk.green('✔ App initialization finished!')))
    this.log('> Tip: you can add more actions, web-assets and events to your project via the `aio app add` commands')
  }

  /** @private */
  destDir (args) {
    let destDir = '.'
    if (args.path !== '.') {
      destDir = path.resolve(args.path)
    }

    return destDir
  }

  /** @private */
  async initNoLogin (destDir, flags) {
    // 1. load console details - if any
    let consoleConfig
    if (flags.import) {
      consoleConfig = loadAndValidateConfigFile(flags.import).values
      this.log(chalk.green(`Loaded Adobe Developer Console configuration file for the Project '${consoleConfig.project.title}' in the Organization '${consoleConfig.project.org.name}'`))
    }

    // 2. prompt for templates to be installed
    let templates = []
    if (flags.template) {
      templates = flags.template
    } else if (!flags['standalone-app']) {
      templates = await this.selectTemplates(flags)
    }

    // 3. run base code generators
    const projectName = (consoleConfig && consoleConfig.project.name) || path.basename(process.cwd())
    await this.runCodeGenerators(destDir, flags, templates, projectName)

    // 4. install templates
    await this.installTemplates(destDir, flags, templates)

    // 5. import config - if any
    if (flags.import) {
      await this.importConsoleConfig(consoleConfig)
    }
  }

  async initWithLogin (destDir, flags) {
    // this will trigger a login
    const consoleCLI = await this.getLibConsoleCLI()

    // 1. select org
    const org = await this.selectConsoleOrg(consoleCLI)
    // 2. get supported services
    const orgSupportedServices = await consoleCLI.getEnabledServicesForOrg(org.id)
    // 3. select or create project
    const project = await this.selectOrCreateConsoleProject(consoleCLI, org)
    // 4. retrieve workspace details, defaults to Stage
    const workspace = await this.retrieveWorkspaceFromName(consoleCLI, org, project, flags)

    // 5. get list of templates to install
    let templates = []
    if (flags.template) {
      templates = flags.template
    } else if (!flags['standalone-app']) {
      templates = await this.selectTemplates(flags, orgSupportedServices)
    }

    // 6. download workspace config
    const consoleConfig = await consoleCLI.getWorkspaceConfig(org.id, project.id, workspace.id, orgSupportedServices)

    // 7. run base code generators
    await this.runCodeGenerators(destDir, flags, templates, consoleConfig.project.name)

    // 8. import config
    await this.importConsoleConfig(consoleConfig)

    // 9. install templates
    await this.installTemplates(destDir, flags, templates)

    this.log(chalk.blue(chalk.bold(`Project initialized for Workspace ${workspace.name}, you can run 'aio app use -w <workspace>' to switch workspace.`)))
  }

  async ensureDevTermAccepted (consoleCLI, orgId) {
    const isTermAccepted = await consoleCLI.checkDevTermsForOrg(orgId)
    if (!isTermAccepted) {
      const terms = await consoleCLI.getDevTermsForOrg()
      const confirmDevTerms = await consoleCLI.prompt.promptConfirm(`${terms.text}
      \nDo you agree with the new Developer Terms?`)
      if (!confirmDevTerms) {
        this.error('The Developer Terms of Service were declined')
      } else {
        const accepted = await consoleCLI.acceptDevTermsForOrg(orgId)
        if (!accepted) {
          this.error('The Developer Terms of Service could not be accepted')
        }
        this.log(`The Developer Terms of Service were successfully accepted for org ${orgId}`)
      }
    }
  }

  async selectTemplates (flags, orgSupportedServices = null) {
    // check that the template plugin has been installed
    const command = await this.config.findCommand('templates:install')
    if (!command) {
      this.error('aio-cli plugin @adobe/aio-cli-plugin-app-templates was not found. This plugin is required to install templates.')
    }

    // const supportedServiceCodes = new Set(orgSupportedServices.map(s => s.code))
    const templateRegistryClient = TemplateRegistryAPI.init()

    const searchCriteria = {
      [TemplateRegistryAPI.SEARCH_CRITERIA_CATEGORIES]: flags.category,
      [TemplateRegistryAPI.SEARCH_CRITERIA_STATUSES]: TemplateRegistryAPI.TEMPLATE_STATUS_APPROVED //,
      // [TemplateRegistryAPI.SEARCH_CRITERIA_APIS]: Array.from(supportedServiceCodes)
    }

    // an optional OrderBy Criteria object
    const orderByCriteria = {
      [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
    }

    const spinner = ora()
    const templateList = []

    spinner.start('Getting available templates')
    const templatesIterator = templateRegistryClient.getTemplates(searchCriteria, orderByCriteria)

    for await (const templates of templatesIterator) {
      for (const template of templates) {
        templateList.push(template)
      }
    }
    aioLogger.debug('template list', JSON.stringify(templateList, null, 2))
    spinner.succeed('Downloaded the list of templates')

    if (templateList.length === 0) {
      console.warn('There are no templates that match the query.')
      return
    }

    const COLUMNS = {
      COL_TEMPLATE: 'Template',
      COL_DESCRIPTION: 'Description',
      COL_EXTENSION_POINT: 'Extension Point',
      COL_CATEGORIES: 'Categories'
    }

    const rows = templateList.map(template => {
      const extensionPoint = template.extension ? template.extension.serviceCode : 'N/A'
      const name = template.adobeRecommended ? `${template.name} *` : template.name
      return {
        value: template.name,
        [COLUMNS.COL_TEMPLATE]: name,
        [COLUMNS.COL_DESCRIPTION]: template.description,
        [COLUMNS.COL_EXTENSION_POINT]: extensionPoint,
        [COLUMNS.COL_CATEGORIES]: template.categories.join(', ')
      }
    })
    const promptName = 'select template'

    inquirer.registerPrompt('table', inquirerTablePrompt)
    const answers = await inquirer
      .prompt([
        {
          type: 'table',
          name: promptName,
          bottomContent: '* = recommended by Adobe; to learn more about the templates, go to http://adobe.ly/templates',
          message: 'Choose the template(s) to install:',
          style: { head: [], border: [] },
          wordWrap: true,
          wrapOnWordBoundary: false,
          colWidths: [30, 30, 20, 15],
          columns: [
            { name: COLUMNS.COL_TEMPLATE },
            { name: COLUMNS.COL_DESCRIPTION, wrapOnWordBoundary: true },
            { name: COLUMNS.COL_EXTENSION_POINT },
            { name: COLUMNS.COL_CATEGORIES, wrapOnWordBoundary: true }
          ],
          rows
        }
      ])

    return answers[promptName]
  }

  async selectConsoleOrg (consoleCLI) {
    const organizations = await consoleCLI.getOrganizations()
    const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations)
    await this.ensureDevTermAccepted(consoleCLI, selectedOrg.id)
    return selectedOrg
  }

  async selectOrCreateConsoleProject (consoleCLI, org) {
    const projects = await consoleCLI.getProjects(org.id)
    let project = await consoleCLI.promptForSelectProject(
      projects,
      {},
      { allowCreate: true }
    )
    if (!project) {
      // user has escaped project selection prompt, let's create a new one
      const projectDetails = await consoleCLI.promptForCreateProjectDetails()
      project = await consoleCLI.createProject(org.id, projectDetails)
      project.isNew = true
    }
    return project
  }

  async retrieveWorkspaceFromName (consoleCLI, org, project, flags) {
    const workspaceName = flags.workspace
    // get workspace details
    const workspaces = await consoleCLI.getWorkspaces(org.id, project.id)
    let workspace = workspaces.find(w => w.name.toLowerCase() === workspaceName.toLowerCase())
    if (!workspace) {
      if (!flags['confirm-new-workspace']) {
        const shouldNewWorkspace = await consoleCLI.prompt.promptConfirm(`Workspace '${workspaceName}' does not exist \n > Do you wish to create a new workspace?`)
        if (!shouldNewWorkspace) {
          this.error(`Workspace '${workspaceName}' does not exist and creation aborted`)
        }
      }
      this.log(`'--workspace=${workspaceName}' in Project '${project.name}' not found. \n Creating one...`)
      workspace = await consoleCLI.createWorkspace(org.id, project.id, {
        name: workspaceName,
        title: ''
      })
    }
    return workspace
  }

  async addServices (consoleCLI, org, project, workspace, orgSupportedServices, requiredServices) {
    // add required services if needed (for extension point)
    const currServiceProperties = await consoleCLI.getServicePropertiesFromWorkspace(
      org.id,
      project.id,
      workspace,
      orgSupportedServices
    )
    const serviceCodesToAdd = requiredServices.filter(s => !currServiceProperties.some(sp => sp.sdkCode === s))
    if (serviceCodesToAdd.length > 0) {
      const servicePropertiesToAdd = serviceCodesToAdd
        .map(s => {
          // previous check ensures orgSupportedServices has required services
          const orgServiceDefinition = orgSupportedServices.find(os => os.code === s)
          return {
            sdkCode: s,
            name: orgServiceDefinition.name,
            roles: orgServiceDefinition.properties.roles,
            // add all licenseConfigs
            licenseConfigs: orgServiceDefinition.properties.licenseConfigs
          }
        })
      await consoleCLI.subscribeToServices(
        org.id,
        project,
        workspace,
        // certDir if need to create integration
        path.join(this.config.dataDir, ENTP_INT_CERTS_FOLDER),
        // new service properties
        currServiceProperties.concat(servicePropertiesToAdd)
      )
    }
    return workspace
  }

  getAllRequiredServicesFromExtPoints (extensionPoints) {
    const requiredServicesWithDuplicates = extensionPoints
      .map(e => e.requiredServices)
      // flat not supported in node 10
      .reduce((res, arr) => res.concat(arr), [])
    return [...new Set(requiredServicesWithDuplicates)]
  }

  async runCodeGenerators (destDir, flags, templates, projectName) {
    const env = yeoman.createEnv()
    const initialGenerators = ['base-app', 'add-ci']

    if (flags['standalone-app']) {
      initialGenerators.push('application')
    }

    // first run app generator that will generate the root skeleton + ci
    for (const generatorKey of initialGenerators) {
      const appGen = env.instantiate(generators[generatorKey], {
        options: {
          'skip-prompt': flags.yes,
          'project-name': projectName,
          // by default yeoman runs the install, we control installation from the app plugin
          'skip-install': true
        }
      })
      await env.runGenerator(appGen)
    }
  }

  async installTemplates (destDir, flags, templates) {
    const spinner = ora()

    // install the templates in sequence
    for (const template of templates) {
      spinner.info(`Installing template ${template}`)
      await this.config.runCommand('templates:install', [template])
      spinner.succeed(`Installed template ${template}`)
    }
  }

  // console config is already loaded into object
  async importConsoleConfig (config) {
    // get jwt client id
    const jwtConfig = config.project.workspace.details.credentials && config.project.workspace.details.credentials.find(c => c.jwt)
    const serviceClientId = (jwtConfig && jwtConfig.jwt.client_id) || ''

    const configBuffer = Buffer.from(JSON.stringify(config))
    const interactive = false
    const merge = true
    await importConfigJson(
      // NOTE: importConfigJson should support reading json directly
      configBuffer,
      process.cwd(),
      { interactive, merge },
      { [SERVICE_API_KEY_ENV]: serviceClientId }
    )
  }
}
InitCommand.description = `Create a new Adobe I/O App
`

InitCommand.flags = {
  ...AddCommand.flags,
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  import: flags.string({
    description: 'Import an Adobe I/O Developer Console configuration file',
    char: 'i'
  }),
  login: flags.boolean({
    description: 'Login using your Adobe ID for interacting with Adobe I/O Developer Console',
    default: true,
    allowNo: true
  }),
  'standalone-app': flags.boolean({
    description: 'Create a stand-alone application',
    default: false,
    exclusive: ['template']
  }),
  template: flags.string({
    description: 'Specify a link to a template that will be installed',
    char: 't',
    multiple: true
  }),
  workspace: flags.string({
    description: 'Specify the Adobe Developer Console Workspace to init from, defaults to Stage',
    default: DEFAULT_WORKSPACE,
    char: 'w',
    exclusive: ['import'] // also no-login
  }),
  'confirm-new-workspace': flags.boolean({
    description: 'Skip and confirm prompt for creating a new workspace',
    default: false
  })
}

InitCommand.args = [
  {
    name: 'path',
    description: 'Path to the app directory',
    default: '.'
  }
]

module.exports = InitCommand
