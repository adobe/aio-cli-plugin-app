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
// const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:init', { provider: 'debug' })
const { flags } = require('@oclif/command')
const generators = require('@adobe/generator-aio-app')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')

const { loadAndValidateConfigFile, importConfigJson } = require('../../lib/import')
const { atLeastOne } = require('../../lib/app-helper')

const { ENTP_INT_CERTS_FOLDER, SERVICE_API_KEY_ENV, implPromptChoices } = require('../../lib/defaults')
const cloneDeep = require('lodash.clonedeep')

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

    if (args.path !== '.') {
      const destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }

    const spinner = ora()
    if (flags.import || !flags.login) {
      // import a console config - no login required!
      await this.initNoLogin(flags)
    } else {
      // we can login
      await this.initWithLogin(flags)
    }

    // install packages, always at the end, so user can ctrl+c
    await this.runInstallPackages(flags, spinner)

    this.log(chalk.bold(chalk.green('✔ App initialization finished!')))
    this.log('> Tip: you can add more actions, web-assets and events to your project via the `aio app add` commands')
  }

  /** @private */
  async initNoLogin (flags) {
    // 1. load console details - if any
    let consoleConfig
    if (flags.import) {
      consoleConfig = loadAndValidateConfigFile(flags.import).values
      this.log(chalk.green(`Loaded Adobe Developer Console configuration file for the Project '${consoleConfig.project.title}' in the Organization '${consoleConfig.project.org.name}'`))
    }

    // 2. prompt for extension points to be implemented
    const extensionPoints = await this.selectExtensionPoints(flags)

    // 3. run extension point code generators
    const projectName = (consoleConfig && consoleConfig.project.name) || path.basename(process.cwd())
    await this.runCodeGenerators(flags, extensionPoints, projectName)

    // 4. import config - if any
    if (flags.import) {
      await this.importConsoleConfig(consoleConfig)
    }

    // 5. This flow supports non logged in users so we can't now for sure if the project has
    //    required services installed. So we output a note on required services instead.
    const requiredServices = this.getAllRequiredServicesFromExtPoints(extensionPoints)
    if (requiredServices.length > 0) {
      this.log(chalk.bold(`Please ensure the following service(s) are enabled in the Organization and added to the Console Workspace: '${requiredServices}'`))
    }
  }

  async initWithLogin (flags) {
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

    // TODO:
    await this.selectTemplate(flags, orgSupportedServices)

    // 5. ask for exensionPoints, only allow selection for extensions that have services enabled in Org
    const extensionPoints = await this.selectExtensionPoints(flags, orgSupportedServices)
    // 6. add any required services to Workspace

    const requiredServices = this.getAllRequiredServicesFromExtPoints(extensionPoints)
    await this.addServices(
      consoleCLI,
      org,
      project,
      workspace,
      orgSupportedServices,
      requiredServices
    )

    // 7. download workspace config
    const consoleConfig = await consoleCLI.getWorkspaceConfig(org.id, project.id, workspace.id, orgSupportedServices)

    // 8. run code generators
    await this.runCodeGenerators(flags, extensionPoints, consoleConfig.project.name)

    // 9. import config
    await this.importConsoleConfig(consoleConfig)

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

  async selectTemplate (flags, orgSupportedServices = null) {
    const supportedServiceCodes = new Set(orgSupportedServices.map(s => s.code))
    const templateRegistryClient = TemplateRegistryAPI.init()

    const searchCriteria = {
      statuses: ['Approved'],
      apis: Array.from(supportedServiceCodes)
    }

    const orderByCriteria = {
      names: 'desc'
    }

    let empty = true

    for await (const templates of templateRegistryClient.getTemplates(searchCriteria, orderByCriteria)) {
      for (const template of templates) {
        empty = false
        console.log(template)
      }
    }

    if (empty) {
      console.warn('there are no templates that match the services supported by the org')
    }
  }

  async selectExtensionPoints (flags, orgSupportedServices = null) {
    if (!flags.extensions) {
      return [implPromptChoices.find(i => i.value.name === 'application').value]
    } else if (flags.extension) {
      const extList = implPromptChoices.filter(i => flags.extension.indexOf(i.value.name) > -1)
        .map(i => i.value)
      if (extList.length < 1) {
        throw new Error(`--extension=${flags.extension} not found.`)
      }
      return extList
    } else {
      const choices = cloneDeep(implPromptChoices)

      // disable extensions that lack required services
      if (orgSupportedServices) {
        const supportedServiceCodes = new Set(orgSupportedServices.map(s => s.code))
        // filter choices
        choices.forEach(c => {
          const missingServices = c.value.requiredServices.filter(s => !supportedServiceCodes.has(s))
          if (missingServices.length > 0) {
            c.disabled = true
            c.name = `${c.name}: missing service(s) in Org: '${missingServices}'`
          }
        })
      }
      const answers = await this.prompt([{
        type: 'checkbox',
        name: 'res',
        message: 'Which extension point(s) do you wish to implement ?',
        choices,
        validate: atLeastOne
      }])
      return answers.res
    }
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

  async runCodeGenerators (flags, extensionPoints, projectName) {
    let env = yeoman.createEnv()
    const initialGenerators = ['base-app', 'add-ci']
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

    // Creating new Yeoman env here to workaround an issue where yeoman reuses the conflicter from previous environment.
    // https://github.com/yeoman/environment/issues/324

    env = yeoman.createEnv()
    // try to use appGen.composeWith
    for (let i = 0; i < extensionPoints.length; ++i) {
      const extGen = env.instantiate(
        extensionPoints[i].generator,
        {
          options: {
            'skip-prompt': flags.yes,
            // do not prompt for overwrites
            force: true,
            // by default yeoman runs the install, we control installation from the app plugin
            'skip-install': true
          }
        })
      await env.runGenerator(extGen)
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
  extensions: flags.boolean({
    description: 'Use --no-extensions to create a blank application that does not integrate with Exchange',
    default: true,
    allowNo: true
  }),
  extension: flags.string({
    description: 'Extension point(s) to implement',
    char: 'e',
    multiple: true,
    exclusive: ['extensions']
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
