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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:delete:event', { provider: 'debug' })
const { flags } = require('@oclif/command')

class DeleteEventCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(DeleteEventCommand)

    aioLogger.debug('deleting an action from the project, with args', args, 'and flags:', flags)

    const generator = '@adobe/generator-aio-app/generators/delete-events'

    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-prompt': flags.yes,
      'action-name': args['event-action-name']
    })

    return res
  }
}

DeleteEventCommand.description = `Delete an existing Adobe I/O Events action
`

DeleteEventCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    char: 'y',
    default: false
  }),
  ...BaseCommand.flags
}

DeleteEventCommand.args = [
  {
    name: 'event-action-name',
    description: 'Action name to delete',
    required: true
  }
]

module.exports = DeleteEventCommand
