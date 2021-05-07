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

const BaseCommand = require('../../BaseCommand')
const yeoman = require('yeoman-environment')
const path = require('path')
const fs = require('fs-extra')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:init', { provider: 'debug' })
const { flags } = require('@oclif/command')
const { loadAndValidateConfigFile, importConfigJson, writeDefaultAppConfig } = require('../../lib/import')
const { installPackage } = require('../../lib/app-helper')

const { ENTP_INT_CERTS_FOLDER, SERVICE_API_KEY_ENV } = require('../../lib/defaults')

class InitCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(InitCommand)

    if (flags.import) {
      // resolve to absolute path before any chdir
      flags.import = path.resolve(flags.import)
    }

    if (args.path !== '.') {
      const destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }

    if (flags.import) {
      // import a console config - no login required!
      await this.initWithConsoleConfig(flags)
    } else {
      // we can login
      await this.initWithLogin(flags)
    }
    this.log('✔ App initialization finished!')
  }

  /**
   * @param flags
   */
  async initWithConsoleConfig (flags) {
  // 1. load console details
    const { values: consoleConfig } = loadAndValidateConfigFile(flags.import)
    this.log(`✔ Loaded Adobe Developer Console configuration file for the Project '${consoleConfig.project.title}' in the Organization '${consoleConfig.project.org.name}'`)

    // 2. prompt for extension points to be implemented
    const extensionPoints = await this.selectExtensionPoints()

    // 3. run extension point code generators
    await this.runAllCodeGenerators(flags, consoleConfig, extensionPoints)

    // 4. import config
    await this.importConsoleConfig(consoleConfig)

    // 5. This flow supports non logged in users so we can't now for sure if the project has
    //    required services installed. So we output a note on required services instead.
    const requiredServices = this.getAllRequiredServicesFromExtPoints(extensionPoints)
    this.log(`Please ensure the following service(s) are enabled in the Organization and added to the Console Workspace: ${requiredServices}`)
  }

  /**
   *
   */
  async initWithLogin (flags) {
  // this will trigger a login
    const consoleCLI = await this.getLibConsoleCLI()

    // 1. select org
    const org = await this.selectConsoleOrg(consoleCLI)
    // 2. get supported services
    const orgSupportedServices = await consoleCLI.getEnabledServicesForOrg(org.id)
    // 3. ask for exensionPoints, only allow selection for extensions that have services enabled in Org
    const extensionPoints = await this.selectExtensionPoints(orgSupportedServices)
    // 4. select or create project
    const project = await this.selectOrCreateConsoleProject(consoleCLI, org)
    // 5. setup workspace, default to 'Stage' workspace
    // This will also add any required services
    const requiredServices = this.getAllRequiredServicesFromExtPoints(extensionPoints)
    const workspace = await this.setupConsoleWorkspace(
      consoleCLI,
      org,
      project,
      orgSupportedServices,
      requiredServices,
      'Stage'
    )
    // 6. download workspace config
    const consoleConfig = await consoleCLI.getWorkspaceConfig(org.id, project.id, workspace.id, orgSupportedServices)

    // 7. run code generators
    await this.runAllCodeGenerators(flags, consoleConfig, extensionPoints)

    // 8. import config
    await this.importConsoleConfig(consoleConfig)
  }

  /**
   * @param orgSupportedServices
   */
  async selectExtensionPoints (orgSupportedServices = null) {
    const choices = [
      // NOTE: those are hardcoded for now
      // TODO those need to be set by extension point providers
      {
        name: 'Firefly Experience Cloud Shell',
        value: {
          name: 'firefly/excshell/v1',
          generator: '@adobe/generator-aio-app/generators/ext/firefly-excshell-v1',
          requiredServices: []
        }
      },
      {
        name: 'AEM Asset Compute v1',
        value: {
          name: 'aem/nui/v1',
          generator: '@adobe/generator-aio-app/generators/ext/aem-nui-v1',
          requiredServices: ['AssetComputeSDK']
        }
      },
      {
        name: 'Blank',
        value: {
          name: 'blank',
          generator: '@adobe/generator-aio-app/generators/ext/blank',
          requiredServices: []
        }
      }
    ]

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
      // todo make until
      validate: function atLeastOne (input) {
        if (input.length === 0) {
          return 'please choose at least one option'
        }
        return true
      }
    }])

    return answers.res
  }

  /**
   * @param consoleCLI
   */
  async selectConsoleOrg (consoleCLI) {
    const organizations = await consoleCLI.getOrganizations()
    const selectedOrg = await consoleCLI.promptForSelectOrganization(organizations)
    return selectedOrg
  }

  /**
   * @param consoleCLI
   * @param org
   */
  async selectOrCreateConsoleProject (consoleCLI, org) {
  // todo somehow create project is the default
    const projects = await consoleCLI.getProjects(org.id)
    let project = await consoleCLI.promptForSelectProject(
      projects,
      {},
      { allowCreate: true }
    )
    if (!project) {
    // todo simplify flow only ask for project name, infer title and description
    // user has escaped project selection prompt, let's create a new one
      const projectDetails = await consoleCLI.promptForCreateProjectDetails()
      project = await consoleCLI.createProject(org.id, projectDetails)
      project.isNew = true
    }
    return project
  }

  /**
   * @param consoleCLI
   * @param org
   * @param project
   * @param orgSupportedServices
   * @param requiredServices
   * @param workspaceName
   */
  async setupConsoleWorkspace (consoleCLI, org, project, orgSupportedServices, requiredServices, workspaceName = 'Stage') {
  // get workspace details
    const workspaces = await consoleCLI.getWorkspaces(org.id, project.id)
    // this won't prompt but load details for the given workspace
    // todo support passing workspaceName as flag and create if not exist
    const workspace = await consoleCLI.promptForSelectWorkspace(workspaces, { workspaceName })

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
            licenseConfig: orgServiceDefinition.properties.licenseConfigs
          }
        })

      consoleCLI.subscribeToServices(
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

  /**
   * @param extensionPoints
   */
  getAllRequiredServicesFromExtPoints (extensionPoints) {
    const requiredServicesWithDuplicates = extensionPoints
      .map(e => e.requiredServices)
    // flat not supported in node 10
      .reduce((res, arr) => res.concat(arr), [])
    return [...new Set(requiredServicesWithDuplicates)]
  }

  getMissingSupportedServices (requiredServices, orgSupportedServices) {
    return requiredServices.filter(s => !orgSupportedServices.some(os => os.code === s))
  }

  /**
   * @param flags
   * @param consoleConfig
   * @param extensionPoints
   */
  async runAllCodeGenerators (flags, consoleConfig, extensionPoints) {
    // todo spinners !!!

    const env = yeoman.createEnv()
    // first run app generator that will generate the root skeleton
    env.register(require.resolve('@adobe/generator-aio-app'), 'gen-app')
    const appGen = env.create(require.resolve('@adobe/generator-aio-app'), {
      options: {
        // todo clear up skip-install flags
        'skip-install': true,
        'skip-prompt': flags.yes,
        'project-name': consoleConfig.project.name
      }
    })

    extensionPoints.forEach(e => {
      appGen.composeWith(
        require.resolve(e.generator), {
          options: {
          // todo clear up skip-install flags
            'skip-install': true,
            'skip-prompt': flags.yes
          }
        })
    })

    await env.runGenerator(appGen)

    if (!flags['skip-install']) {
      // todo should this be in generators ?
      this.log('Installing packages, this might take a while..')
      await installPackage('.')
    }
  }

  // console config is already loaded into object
  /**
   * @param config
   */
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
  ...BaseCommand.flags,
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  'skip-install': flags.boolean({
    description: 'Skip npm installation after files are created',
    char: 's',
    default: false
  }),
  import: flags.string({
    description: 'Import an Adobe I/O Developer Console configuration file',
    char: 'i'
  }),
  login: flags.boolean({
    description: 'Login using your Adobe ID for interacting with Adobe I/O Developer Console',
    default: true,
    allowNo: true
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
