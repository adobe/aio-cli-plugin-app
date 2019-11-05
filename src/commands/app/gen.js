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
const debug = require('debug')('aio-cli-plugin-app:gen')
const { flags } = require('@oclif/command')

class Gen extends BaseCommand {
  async run () {
    const { flags } = this.parse(Gen)
    debug('creating new app with gen command')
    let skip_prompt = false
    if (flags.yes) {
      skip_prompt = true
    }

    const env = yeoman.createEnv()
    env.register(require.resolve('../../generators/createGenerator'), 'createGenerator')

    await new Promise((resolve, reject) => {
      env.run('createGenerator', { 'skip_prompt': skip_prompt })
    })
  }
}

Gen.description = `Create a new Cloud Native Application
`

Gen.flags = {
  'yes': flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),

  ...BaseCommand.flags
}

module.exports = Gen
