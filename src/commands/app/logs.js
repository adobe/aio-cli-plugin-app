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

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')
const BaseCommand = require('../../BaseCommand')
const { wrapError, getLogs } = require('../../lib/app-helper')

class Logs extends BaseCommand {
  async run () {
    const { flags } = this.parse(Logs)

    if (flags.limit < 1) {
      this.log('--limit should be > 0, using --limit=1')
      flags.limit = 1
    } else if (flags.limit > 50) {
      this.log('--limit should be <= 50, using --limit=50')
      flags.limit = 50
    }

    try {
      const config = this.getAppConfig()

      await getLogs(config, flags.limit, this.log)
    } catch (error) {
      this.error(wrapError(error))
    }
  }
}

Logs.description = `Fetch logs for an Adobe I/O App
`

Logs.flags = {
  ...BaseCommand.flags,
  limit: flags.integer({
    description: 'Limit number of activations to fetch logs from ( 1-50 )',
    default: 1,
    char: 'l'
  })
}

// Logs.args = [
//   ...BaseCommand.args
// ]

module.exports = Logs
