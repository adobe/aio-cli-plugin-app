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

const TemplatesCommand = require('../../TemplatesCommand')
const yeoman = require('yeoman-environment')
const path = require('path')
const fs = require('fs-extra')
const ora = require('ora')
const chalk = require('chalk')
const { Flags } = require('@oclif/core')
const generators = require('@adobe/generator-aio-app')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')
const inquirer = require('inquirer')
const hyperlinker = require('hyperlinker')

const { loadAndValidateConfigFile, importConfigJson } = require('../../lib/import-helper')
const { SERVICE_API_KEY_ENV } = require('../../lib/defaults')
const { Octokit } = require('@octokit/rest')

const DEFAULT_WORKSPACE = 'Stage'

class InitCommand extends TemplatesCommand {
  async run () {
    const { args, flags } = await this.parse(InitCommand)

    if (!flags.login && flags.workspace !== DEFAULT_WORKSPACE) {
      this.error('--no-login and --workspace flags cannot be used together.')
    }

    // check that the template plugin has been installed
    const command = await this.config.findCommand('templates:install')
    if (!command) {
      this.error('aio-cli plugin @adobe/aio-cli-plugin-app-templates was not found. This plugin is required to install templates.')
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
    const noLogin = flags.import || !flags.login
    if (noLogin) {
      // import a console config - no login required!
      await this.initNoLogin(flags)
    } else {
      // we can login
      await this.initWithLogin(flags)
    }

    // install packages, always at the end, so user can ctrl+c
    await this.runInstallPackages(flags, spinner)

    this.log(chalk.bold(chalk.green('✔ App initialization finished!')))
    this.log(`> Tip: you can add more actions, web-assets and events to your project via the '${this.config.bin} app add' commands`)

    if (noLogin) {
      this.log(`> Run '${this.config.bin} templates info --required-services' to list the required services for the installed templates`)
    }
  }

  getInitialGenerators (flags) {
    // TODO read from config to override
    const initialGenerators = ['base-app', 'add-ci']

    if (flags['standalone-app']) {
      initialGenerators.push('application')
    }

    return initialGenerators
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
  async initNoLogin (flags) {
    // 1. load console details - if any
    let consoleConfig
    if (flags.import) {
      consoleConfig = loadAndValidateConfigFile(flags.import).values
      this.log(chalk.green(`Loaded Adobe Developer Console configuration file for the Project '${consoleConfig.project.title}' in the Organization '${consoleConfig.project.org.name}'`))
    }

    if (flags.repo) {
      await this.withQuickstart(flags.repo)
    } else {
      // 2. prompt for templates to be installed
      const templates = await this.getTemplatesForFlags(flags)
      // If no templates selected, init a standalone app
      if (templates.length <= 0) {
        flags['standalone-app'] = true
      }

      // 3. run base code generators
      const projectName = (consoleConfig && consoleConfig.project.name) || path.basename(process.cwd())
      await this.runCodeGenerators(this.getInitialGenerators(flags), flags.yes, projectName)

      // 4. install templates
      await this.installTemplates({
        useDefaultValues: flags.yes,
        installNpm: flags.install,
        installConfig: flags.login,
        templates
      })
    }

    // 5. import config - if any
    if (flags.import) {
      await this.importConsoleConfig(consoleConfig)
    }
  }

  async initWithLogin (flags) {

    if (flags.repo) {
      await this.withQuickstart(flags.repo)
    }

    // this will trigger a login
    const consoleCLI = await this.getLibConsoleCLI()

    // 1. select org
    const org = await this.selectConsoleOrg(consoleCLI, flags)
    // 2. get supported services
    const orgSupportedServices = await consoleCLI.getEnabledServicesForOrg(org.id)
    // 3. select or create project
    const project = await this.selectOrCreateConsoleProject(consoleCLI, org, flags)
    // 4. retrieve workspace details, defaults to Stage
    const workspace = await this.retrieveWorkspaceFromName(consoleCLI, org, project, flags)

    let templates
    if (!flags.repo) {
      // 5. get list of templates to install
      templates = await this.getTemplatesForFlags(flags, orgSupportedServices)
      // If no templates selected, init a standalone app
      if (templates.length <= 0) {
        flags['standalone-app'] = true
      }
    }

    // 6. download workspace config
    const consoleConfig = await consoleCLI.getWorkspaceConfig(org.id, project.id, workspace.id, orgSupportedServices)

    // 7. run base code generators
    if (!flags.repo) {
      await this.runCodeGenerators(this.getInitialGenerators(flags), flags.yes, consoleConfig.project.name)
    }

    // 8. import config
    await this.importConsoleConfig(consoleConfig)

    // 9. install templates
    if (!flags.repo) {
      await this.installTemplates({
        useDefaultValues: flags.yes,
        installNpm: flags.install,
        templates
      })
    }

    this.log(chalk.blue(chalk.bold(`Project initialized for Workspace ${workspace.name}, you can run 'aio app use -w <workspace>' to switch workspace.`)))
  }

  async getTemplatesForFlags (flags, orgSupportedServices = null) {
    if (flags.template) {
      return flags.template
    } else if (flags.extension) {
      const { notFound, templates: extensionTemplates } = await this.getTemplatesByExtensionPointIds(flags.extension)
      if (notFound.length > 0) {
        this.error(`Extension(s) '${notFound.join(', ')}' not found in the Template Registry.`)
      }
      return extensionTemplates.map(t => t.name)
    } else if (!flags['standalone-app']) {
      const noLogin = flags.import || !flags.login
      let [searchCriteria, orderByCriteria] = await this.getSearchCriteria(orgSupportedServices)
      if (noLogin) {
        searchCriteria = {
          [TemplateRegistryAPI.SEARCH_CRITERIA_STATUSES]: TemplateRegistryAPI.TEMPLATE_STATUS_APPROVED,
          [TemplateRegistryAPI.SEARCH_CRITERIA_CATEGORIES]: TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_NOT + 'helper-template'
        }
        orderByCriteria = {
          [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
        }
      }
      return this.selectTemplates(searchCriteria, orderByCriteria, orgSupportedServices)
    } else {
      return []
    }
  }

  async ensureDevTermAccepted (consoleCLI, orgId) {
    const isTermAccepted = await consoleCLI.checkDevTermsForOrg(orgId)
    if (!isTermAccepted) {
      const terms = await consoleCLI.getDevTermsForOrg()
      const confirmDevTerms = await consoleCLI.prompt.promptConfirm(`${terms.text}
      \nYou have not accepted the Developer Terms of Service. Go to ${hyperlinker('https://www.adobe.com/go/developer-terms', 'https://www.adobe.com/go/developer-terms')} to view the terms. Do you accept the terms? (y/n):`)
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

  async getSearchCriteria (orgSupportedServices) {
    const choices = [
      {
        name: 'All Templates',
        value: 'allTemplates',
        checked: true
      },
      {
        name: 'All Extension Points',
        value: 'allExtensionPoints',
        checked: false
      }
    ]

    if (orgSupportedServices) {
      choices.push({
        name: 'Only Templates Supported By My Org',
        value: 'orgTemplates',
        checked: false
      })
    }

    const { components: selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'components',
        message: 'What templates do you want to search for?',
        loop: false,
        choices
      }
    ])

    const searchCriteria = {
      [TemplateRegistryAPI.SEARCH_CRITERIA_STATUSES]: TemplateRegistryAPI.TEMPLATE_STATUS_APPROVED,
      [TemplateRegistryAPI.SEARCH_CRITERIA_CATEGORIES]: TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_NOT + 'helper-template'
    }

    switch (selection) {
      case 'orgTemplates': {
        const supportedServiceCodes = new Set(orgSupportedServices.map((elem, index) => {
          const operator = index > 0 ? '|' : '' // | symbol denotes an OR clause (only if it's not the first item)
          return `${operator}${elem.code}`
        }))
        searchCriteria[TemplateRegistryAPI.SEARCH_CRITERIA_APIS] = Array.from(supportedServiceCodes)
      }
        break
      case 'allExtensionPoints':
        searchCriteria[TemplateRegistryAPI.SEARCH_CRITERIA_EXTENSIONS] = TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_ANY
        break
      case 'allTemplates':
      default:
        break
    }

    const { name: selectionLabel } = choices.find(item => item.value === selection)

    // an optional OrderBy Criteria object
    const orderByCriteria = {
      [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
    }

    return [searchCriteria, orderByCriteria, selection, selectionLabel]
  }

  async selectConsoleOrg (consoleCLI, flags) {
    const organizations = await consoleCLI.getOrganizations()
    const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations, { orgId: flags.org, orgCode: flags.org })
    await this.ensureDevTermAccepted(consoleCLI, selectedOrg.id)
    return selectedOrg
  }

  async selectOrCreateConsoleProject (consoleCLI, org, flags) {
    const projects = await consoleCLI.getProjects(org.id)
    let project = await consoleCLI.promptForSelectProject(
      projects,
      { projectId: flags.project, projectName: flags.project },
      { allowCreate: true }
    )
    if (!project) {
      if (flags.project) {
        this.error(`--project ${flags.project} not found`)
      }
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

  async runCodeGenerators (generatorNames, skipPrompt, projectName) {
    const env = yeoman.createEnv()
    env.options = { skipInstall: true }

    // first run app generator that will generate the root skeleton + ci
    for (const generatorKey of generatorNames) {
      const appGen = env.instantiate(generators[generatorKey], {
        options: {
          'skip-prompt': skipPrompt,
          'project-name': projectName,
          force: true
        }
      })
      await env.runGenerator(appGen)
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

  async withQuickstart (fullRepo) {
    const octokit = new Octokit({
      auth: ''
    })

    /** @private */
    function relative (basePath, filePath) {
      filePath = filePath.replace(/^\/+/, '') // remove fist slash
      basePath = basePath.replace(/\/+$/, '') // remove last slash
      if (!filePath.startsWith(basePath + '/')) {
        return filePath
      }
      return filePath.slice(`${basePath}/`.length)
    }

    /** @private */
    async function downloadRepoDirRecursive (owner, repo, filePath, basePath = '') {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath })

      for (const fileOrDir of data) {
        if (fileOrDir.type === 'dir') {
          const destDir = relative(basePath, fileOrDir.path)

          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true })
          }

          await downloadRepoDirRecursive(owner, repo, fileOrDir.path, basePath)
        } else {
          const response = await fetch(fileOrDir.download_url)
          const jsonResponse = await response.text()
          fs.writeFileSync(relative(basePath, fileOrDir.path), jsonResponse)
        }
      }
    }

    const [owner, repo, basePath] = fullRepo.split('/')
    try {
      await octokit.repos.getContent({ owner, repo, path: `${basePath}/app.config.yaml` })
    } catch (e) {
      this.error('--repo does not point to a valid Adobe App Builder app')
    }

    await downloadRepoDirRecursive(owner, repo, basePath, basePath)
  }
}

InitCommand.description = `Create a new Adobe I/O App
`

InitCommand.flags = {
  ...TemplatesCommand.flags,
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  import: Flags.string({
    description: 'Import an Adobe I/O Developer Console configuration file',
    char: 'i'
  }),
  login: Flags.boolean({
    description: 'Login using your Adobe ID for interacting with Adobe I/O Developer Console',
    default: true,
    allowNo: true
  }),
  extension: Flags.string({
    description: 'Extension point(s) to implement',
    char: 'e',
    multiple: true,
    exclusive: ['template', 'repo']
  }),
  'standalone-app': Flags.boolean({
    description: 'Create a stand-alone application',
    default: false,
    exclusive: ['template', 'repo']
  }),
  template: Flags.string({
    description: 'Specify a link to a template that will be installed',
    char: 't',
    multiple: true
  }),
  org: Flags.string({
    description: 'Specify the Adobe Developer Console Org to init from',
    exclusive: ['import'] // also no-login
  }),
  project: Flags.string({
    description: 'Specify the Adobe Developer Console Project to init from',
    exclusive: ['import'] // also no-login
  }),
  workspace: Flags.string({
    description: 'Specify the Adobe Developer Console Workspace to init from, defaults to Stage',
    default: DEFAULT_WORKSPACE,
    char: 'w',
    exclusive: ['import'] // also no-login
  }),
  'confirm-new-workspace': Flags.boolean({
    description: 'Skip and confirm prompt for creating a new workspace',
    default: false
  }),
  repo: Flags.string({
    description: 'Init from gh quick-start repo. Expected to be of the form <owner>/<repo>/<path>',
    exclusive: ['template', 'extension', 'standalone-app']
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
