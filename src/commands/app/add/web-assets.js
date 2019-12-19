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

const BaseCommand = require('../../../BaseCommand')
const yeoman = require('yeoman-environment')
const debug = require('debug')('aio-cli-plugin-app:init')
const { flags } = require('@oclif/command')

class AddWebAssetsCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(AddWebAssetsCommand)

    debug(`adding component ${args.component} to the project, using flags: `, flags)

    const generator = '@adobe/generator-aio-app/generators/add-web-assets'
    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-prompt': flags.yes,
      'adobe-services': 'target,analytics,campaign-standard' // todo update with real service sdk codes from console later
    })
    return res
  }
}

AddWebAssetsCommand.description = `Add web assets to an existing Adobe I/O App
`

AddWebAssetsCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...BaseCommand.flags
}

AddWebAssetsCommand.args = []

module.exports = AddWebAssetsCommand
