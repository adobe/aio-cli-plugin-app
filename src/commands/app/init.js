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
const { loadAndValidateConfigFile, importConfigJson } = require('../../lib/import')
const { getCliInfo } = require('../../lib/app-helper')
const chalk = require('chalk')
const { servicesToGeneratorInput } = require('../../lib/app-helper')

const SERVICE_API_KEY_ENV = 'SERVICE_API_KEY'

class InitCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(InitCommand)
    let res

    if (flags.import) {
      // resolve to absolute path before any chdir
      flags.import = path.resolve(flags.import)
    }

    if (args.path !== '.') {
      const destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }

    const env = yeoman.createEnv()
    aioLogger.debug(`creating new app with init command: ${flags}`)

    // default project name and services
    let projectName = path.basename(process.cwd())
    // list of services added to the workspace
    let workspaceServices = []
    // list of services supported by the organization
    let supportedServices = []

    // client id of the console's workspace jwt credentials
    let serviceClientId = ''

    // delete console credentials only if it was generated
    let deleteConsoleCredentials = false

    if (!flags.import && !flags.yes && flags.login) {
      try {
        const { accessToken, env: imsEnv } = await getCliInfo()
        const generatedFile = 'console.json'
        env.register(require.resolve('@adobe/generator-aio-console'), 'gen-console')
        res = await env.run('gen-console', {
          'destination-file': generatedFile,
          'access-token': accessToken,
          'ims-env': imsEnv
        })
        // trigger import
        flags.import = generatedFile
        // delete console credentials
        deleteConsoleCredentials = true
      } catch (e) {
        this.log(chalk.red(e.message))
      }
      this.log()
    }

    if (flags.import) {
      const { values: config } = loadAndValidateConfigFile(flags.import)

      const project = config.project
      projectName = project.name
      workspaceServices = project.workspace.details.services
      supportedServices = project.org.details.services
      const jwtConfig = project.workspace.details.credentials && project.workspace.details.credentials.find(c => c.jwt)
      serviceClientId = (jwtConfig && jwtConfig.jwt.client_id) || serviceClientId // defaults to ''
    }

    this.log(`You are about to initialize the project '${projectName}'`)

    // call code generator
    env.register(require.resolve('@adobe/generator-aio-app'), 'gen-app')
    res = await env.run('gen-app', {
      'skip-install': flags['skip-install'],
      'skip-prompt': flags.yes,
      'project-name': projectName,
      'adobe-services': servicesToGeneratorInput(workspaceServices),
      'supported-adobe-services': servicesToGeneratorInput(supportedServices)
    })

    // config import
    // always auto merge
    const interactive = false
    const merge = true
    if (flags.import) {
      await importConfigJson(flags.import, process.cwd(), { interactive, merge }, { [SERVICE_API_KEY_ENV]: serviceClientId })
      if (deleteConsoleCredentials) {
        fs.unlinkSync(flags.import)
      }
    }

    // finalize configuration data
    this.log('✔ App initialization finished!')
    return res
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
