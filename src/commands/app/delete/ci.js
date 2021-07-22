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
const generators = require('@adobe/generator-aio-app')

class DeleteCICommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(DeleteCICommand)

    aioLogger.debug(`deleting CI files from the project, using flags: ${JSON.stringify(flags)}`)

    const env = yeoman.createEnv()
    const gen = env.instantiate(generators['delete-ci'], {
      options: {
        'skip-prompt': flags.yes
      }
    })
    await env.runGenerator(gen)
  }
}

DeleteCICommand.description = `Delete existing CI files
`

DeleteCICommand.flags = {
  yes: flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...BaseCommand.flags
}

DeleteCICommand.args = []

module.exports = DeleteCICommand
