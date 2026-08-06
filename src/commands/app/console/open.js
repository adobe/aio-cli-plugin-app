/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const open = require('open')
const { getCliEnv } = require('@adobe/aio-lib-env')
const BaseCommand = require('../../../BaseCommand')
const { loadCurrentConfiguration, hasLocalConfiguration } = require('../../../lib/console-helper')
const { OPEN_URLS } = require('../../../lib/defaults')

class OpenCommand extends BaseCommand {
  async run () {
    await this.parse(OpenCommand)

    if (!hasLocalConfiguration()) {
      this.error('No local .aio configuration found for this app. Run `aio app use` to link this app to an Org/Project/Workspace.')
    }

    const { org, project, workspace } = loadCurrentConfiguration()

    if (!org.id || !project.id) {
      this.error(
        'Incomplete .aio configuration, cannot open the Developer Console.' +
        ' Please import a valid Adobe Developer Console configuration file via `aio app use <config>.json`.'
      )
    }

    let url = `${OPEN_URLS[getCliEnv()]}/${org.id}/${project.id}/`
    url += workspace.id ? `workspaces/${workspace.id}/details` : 'overview'
    await open(url)
  }
}

OpenCommand.description = 'Open the Adobe Developer Console workspace this app is set to use (as set by `aio app use`) in the default web browser'

OpenCommand.flags = {
  ...BaseCommand.flags
}

OpenCommand.args = {}

module.exports = OpenCommand
