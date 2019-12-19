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

class DeleteActionCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(DeleteActionCommand)

    debug('deleting an action from the project, using flags: ', flags)

    // todo should undeploy specific action ?

    const generator = '@adobe/generator-aio-app/generators/delete-action'

    const env = yeoman.createEnv()
    env.register(require.resolve(generator), 'gen')
    const res = await env.run('gen', {
      'skip-prompt': flags.yes,
      'action-name': flags['action-name']
    })

    this.log('✔ An action was deleted locally, run `aio app deploy -a` to sync your current actions deployment')

    return res
  }
}

DeleteActionCommand.description = `Delete an action from an existing Adobe I/O App
`

DeleteActionCommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    char: 'y',
    dependsOn: ['action-name']
  }),
  'action-name': flags.boolean({
    description: 'Action name to delete, if not specified you will choose from a list of actions',
    default: '',
    char: 'a'
  }),
  ...BaseCommand.flags
}

DeleteActionCommand.args = []

module.exports = DeleteActionCommand
