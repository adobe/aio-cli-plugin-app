/* eslint-disable camelcase */
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
      let destDir = path.resolve(args.path)
      fs.ensureDirSync(destDir)
      process.chdir(destDir)
    }
    debug('creating new app with init command')

    const env = yeoman.createEnv()
    env.register(require.resolve('../../generators/createGenerator'), 'createGenerator')

    let res = await env.run('createGenerator', { 'skip_prompt': flags.yes })
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
  ...BaseCommand.flags
}

InitCommand.args = [
  ...BaseCommand.args
]

module.exports = InitCommand
