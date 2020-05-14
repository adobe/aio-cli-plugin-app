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
const { validateConfig, importConfigJson, loadConfigFile, writeAio } = require('../../lib/import')
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const chalk = require('chalk')

class InitCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(InitCommand)
    const env = yeoman.createEnv()
    let res

    if (args.path !== '.') {
      const destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }

    aioLogger.debug('creating new app with init command ', flags)

    // default project name and services
    let projectName = path.basename(process.cwd())
    let services = 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK,McDataServicesSdk,AudienceManagerCustomerSDK' // todo fetch those from console when no --import

    if (!(flags.import || flags.yes)) {
      const accessToken = await getToken(CLI)
      const { env: imsEnv = 'prod' } = await context.getCli() || {}

      try {
        const generatedFile = 'console.json'
        env.register(require.resolve('@adobe/generator-aio-console'), 'gen-console')
        res = await env.run('gen-console', {
          'destination-file': generatedFile,
          'access-token': accessToken,
          'ims-env': imsEnv
        })
        // trigger import
        flags.import = generatedFile
      } catch (e) {
        console.log(chalk.red(e.message))
      }
      this.log()
    }

    if (flags.import) {
      const { values: config } = loadConfigFile(flags.import)
      const { valid: configIsValid, errors: configErrors } = validateConfig(config)
      if (!configIsValid) {
        const message = `Missing or invalid keys in config: ${JSON.stringify(configErrors, null, 2)}`
        this.error(message)
      }

      projectName = config.project.name
      services = config.project.workspace.details.services.map(s => s.code).join(',') || ''
    }

    this.log(`You are about to initialize the project '${projectName}'`)

    // call code generator
    env.register(require.resolve('@adobe/generator-aio-app'), 'gen-app')
    res = await env.run('gen-app', {
      'skip-install': flags['skip-install'],
      'skip-prompt': flags.yes,
      'project-name': projectName,
      'adobe-services': services
    })

    // config import
    // always auto merge
    const interactive = false
    const merge = true
    if (flags.import) {
      await importConfigJson(flags.import, process.cwd(), { interactive, merge })
    } else {
      // write default services value to .aio
      // todo use real imported values from console
      await writeAio({
        services: services.split(',').map(code => ({ code }))
      }, process.cwd(), { merge, interactive })
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
