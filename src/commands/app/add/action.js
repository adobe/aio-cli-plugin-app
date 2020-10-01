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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { flags } = require('@oclif/command')

const config = require('@adobe/aio-lib-core-config')

class AddActionCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(AddActionCommand)

    aioLogger.debug(`adding component ${args.component} to the project, using flags: ${flags}`)

    const services = (config.get('services') || config.get('project.workspace.details.services') || []).map(s => s.code).join(',')

    const generator = '@adobe/generator-aio-app/generators/add-action'
    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-install': flags['skip-install'],
      'skip-prompt': flags.yes,
      'adobe-services': services
    })
    return res
  }
}

AddActionCommand.description = `Add a new action
`

AddActionCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  'skip-install': flags.boolean({
    description: 'Skip npm installation after files are created',
    default: false
  }),
  ...BaseCommand.flags
}

AddActionCommand.args = []

module.exports = AddActionCommand
