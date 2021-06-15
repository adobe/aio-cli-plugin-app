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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:delete:event', { provider: 'debug' })
const { flags } = require('@oclif/command')
const DeleteActionCommand = require('./action')
const chalk = require('chalk')

class DeleteEventCommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(DeleteEventCommand)

    aioLogger.debug(`deleting events from the project, with args ${JSON.stringify(args)}, and flags: ${JSON.stringify(flags)}`)

    // NOTE: this command only wraps app delete action, events will have more than actions later on

    if (!args['event-action-name']) {
      this.log(chalk.bold(chalk.blue('NOTE: this is running the \'app delete action\' command, please select events actions.')))
      this.log()
    }

    const cmdLineArgs = []
    if (args['event-action-name']) {
      cmdLineArgs.push(args['event-action-name'])
    }
    if (flags.yes) {
      cmdLineArgs.push('--yes')
    }
    await DeleteActionCommand.run(cmdLineArgs)
  }
}

DeleteEventCommand.description = `Delete existing Adobe I/O Events actions
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
    description: 'Action `pkg/name` to delete, you can specify multiple actions via a comma separated list',
    required: false
  }
]

DeleteEventCommand.aliases = ['app:delete:events']

module.exports = DeleteEventCommand
