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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:ci', { provider: 'debug' })
const generators = require('@adobe/generator-aio-app')

class AddCICommand extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(AddCICommand)

    aioLogger.debug(`adding component ${args.component} to the project, using flags: ${flags}`)

    const env = yeoman.createEnv()
    const gen = env.instantiate(generators['add-ci'], {})
    await env.runGenerator(gen)
  }
}

AddCICommand.description = `Add CI files
`

AddCICommand.flags = {
  ...BaseCommand.flags
}

AddCICommand.args = []

module.exports = AddCICommand
