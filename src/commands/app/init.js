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
const debug = require('debug')('aio-cli-plugin-app:init')
const { flags } = require('@oclif/command')

class InitCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(InitCommand)
    if (args.path !== '.') {
      const destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }
    debug('creating new app with init command ', flags)

    const env = yeoman.createEnv()

    // todo integrate with console project generator to get/generate projectname, service-integrations, ..
    const projectName = path.basename(process.cwd())
    this.log(`You are about to initialize the project '${projectName}'`)

    // call code generator
    env.register(require.resolve('@adobe/generator-aio-app'), 'aio-app')
    const res = await env.run('aio-app', {
      'skip-prompt': flags.yes,
      'project-name': projectName,
      'adobe-services': 'target,analytics,campaign-standard' // todo those are fake for now, get real service sdk codes from console
    })
    // finalize configuration data
    this.log('✔ App initialization finished!')
    return res
  }
}

InitCommand.description = `Create a new Adobe I/O App
`

InitCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...BaseCommand.flags
}

InitCommand.args = [
  {
    name: 'path',
    description: 'Path to the app directory',
    default: '.'
  }
]

module.exports = InitCommand
