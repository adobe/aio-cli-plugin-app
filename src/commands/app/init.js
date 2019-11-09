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
const inquirer = require('inquirer')

class InitCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(InitCommand)
    if (args.path !== '.') {
      let destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }
    debug('creating new app with init command ', flags)

    let template = flags.template
    if (!template) {
      if (flags.yes) {
        template = 'hello'
      } else {
        let responses = await inquirer.prompt([{
          name: 'template',
          message: 'select a starter template',
          type: 'list',
          choices: [{ name: 'hello' }, { name: 'target' }, { name: 'campaign' }, { name: 'analytics' }]
        }])
        template = responses.template
      }
    }
    if (!InitCommand.flags.template.options.includes(template)) {
      this.error(`Expected --template=${template} to be one of: hello, target, campaign, analytics`)
    }
    const env = yeoman.createEnv()
    try {
      env.register(require.resolve('../../generators/create-' + template), 'gen')
    } catch (err) {
      this.error(`the '${flags.template}' template is not available.`)
    }

    let res = await env.run('gen', { 'skip_prompt': flags.yes })
    // finalize configuration data
    this.log(`✔ App initialization finished!`)
    return res
  }
}

InitCommand.description = `Create a new Adobe I/O App
`

InitCommand.flags = {
  'yes': flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  'template': flags.string({
    description: 'Adobe I/O App starter template',
    char: 't',
    options: ['hello', 'target', 'campaign', 'analytics']
  }),
  ...BaseCommand.flags
}

InitCommand.args = [
  ...BaseCommand.args
]

module.exports = InitCommand
