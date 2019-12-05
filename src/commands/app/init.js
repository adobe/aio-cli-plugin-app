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
      const destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }
    debug('creating new app with init command ', flags)

    const env = yeoman.createEnv()

    // finds and loads all installed generators into yeoman environment
    // > at first glance there doesn't seem to be a way to load all generators within a single module, would be great to
    // > avoid traversing all fs
    await new Promise((resolve, reject) => env.lookup(err => {
      if (err) reject(err)
      resolve()
    }))

    const aioGenerators = Object.keys(env.getGeneratorsMeta())
      .filter(key => key.startsWith('aio-app-base:')) // filter out all yeoman generators which are not from us
      .map(key => key.split('aio-app-base:')[1]) // cleanup the name

    if (aioGenerators.length === 0) {
      this.error('cannot load templates, \'@adobe/generator-aio-app-base\' is not installed')
    }
    env.alias(/^([a-zA-Z0-9:*]+)$/, 'aio-app-base:$1') // allow env to load a generator by its "clean" name

    let template = flags.template
    if (!template) {
      if (flags.yes) {
        template = 'hello'
      } else {
        const responses = await inquirer.prompt([{
          name: 'template',
          message: 'select a starter template',
          type: 'list',
          choices: aioGenerators
        }])
        template = responses.template
      }
    }
    if (!aioGenerators.includes(template)) {
      this.error(`Expected --template=${template} to be one of: ${aioGenerators}`)
    }

    const res = await env.run(template, { skip_prompt: flags.yes })
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
  template: flags.string({
    description: 'Adobe I/O App starter template',
    char: 't'
  }),
  ...BaseCommand.flags
}

InitCommand.args = [
  ...BaseCommand.args
]

module.exports = InitCommand
