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
const debug = require('debug')('aio-cli-plugin-app:init')
const { flags } = require('@oclif/command')

class DeleteEventCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(DeleteEventCommand)

    debug('deleting an action from the project, with args', args, 'and flags:', flags)

    // is there an oclif mechanism for flag depends on arg?
    if (flags.yes && !args['action-name']) {
      this.error('<action-name> must also be provided when using --yes=')
    }

    // todo should undeploy specific action ?

    const generator = '@adobe/generator-aio-app/generators/delete-events'

    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-prompt': flags.yes,
      'action-name': args['action-name']
    })

    this.log('✔ An action was deleted locally, run `aio app deploy --skip-static` to sync your current actions deployment')

    return res
  }
}

DeleteEventCommand.description = `Delete an existing event action
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
    name: 'action-name',
    description: 'Action name to delete, if not specified you will choose from a list of actions',
    default: '',
    required: false
  }
]

module.exports = DeleteEventCommand
