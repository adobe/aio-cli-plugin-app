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
const debug = require('debug')('aio-cli-plugin-app:init')

const AppScripts = require('@adobe/aio-app-scripts')

class AddAuthCommand extends BaseCommand {
  async run () {
    const { flags } = this.parse(AddAuthCommand)

    debug('add auth to the project, using flags:', flags)

    const scripts = AppScripts({})
    const res = await scripts.addAuth()
    return res
  }
}

AddAuthCommand.description = `Add auth support to the project
`

AddAuthCommand.flags = {
  ...BaseCommand.flags
}

AddAuthCommand.args = []

module.exports = AddAuthCommand
