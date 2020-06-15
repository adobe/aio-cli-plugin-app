/*
Copyright 2020 Adobe. All rights reserved.
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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:event', { provider: 'debug' })
const { flags } = require('@oclif/command')

class AddEventCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddEventCommand)

    aioLogger.debug('adding event to the project, using flags: ', flags)

    const generator = '@adobe/generator-aio-app/generators/add-events'
    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-install': flags['skip-install'],
      'skip-prompt': flags.yes
    })
    return res
  }
}

AddEventCommand.description = `Add a new Adobe I/O Events action
`

AddEventCommand.flags = {
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

AddEventCommand.args = []

module.exports = AddEventCommand
