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
const { wrapError } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')
const fs = require('fs-extra')

class Logs extends BaseCommand {
  async run () {
    const { flags } = this.parse(Logs)
    const config = this.getFullConfig()
    if (!fs.existsSync('manifest.yml')) {
      this.error(wrapError(new Error('no manifest.yml')))
    }

    if (flags.limit < 1) {
      this.log('--limit should be > 0, using --limit=1')
      flags.limit = 1
    } else if (flags.limit > 50) {
      this.log('--limit should be <= 50, using --limit=50')
      flags.limit = 50
    }

    const filterActions = []
    if (flags.action) {
      flags.action.forEach((actionName) => {
        if (!actionName.includes('/')) {
          actionName = config.ow.package + '/' + actionName
        }
        filterActions.push(actionName)
      })
    } else {
      Object.entries(config.manifest.full.packages).forEach((packageTuple) => {
        packageTuple[0] = packageTuple[0].replace(/__APP_PACKAGE__/g, config.ow.package)

        Object.keys(packageTuple[1].actions).forEach((actionName) => {
          filterActions.push(packageTuple[0] + '/' + actionName)
        })
      })
    }

    try {
      await rtLib.printActionLogs(config, this.log, flags.limit, filterActions, flags.strip, flags.poll || flags.tail || flags.watch)
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
  }),
  action: flags.string({
    description: 'Fetch logs for a specific action',
    char: 'a',
    multiple: true
  }),
  strip: flags.boolean({
    char: 'r',
    description: 'strip timestamp information and output first line only',
    default: false
  }),
  tail: flags.boolean({
    description: 'Fetch logs continuously',
    char: 't',
    default: false,
    exclusive: ['watch', 'poll']
  }),
  watch: flags.boolean({
    description: 'Fetch logs continuously',
    default: false,
    char: 'w',
    exclusive: ['tail', 'poll']
  }),
  poll: flags.boolean({
    description: 'Fetch logs continuously',
    default: false,
    char: 'o',
    exclusive: ['watch', 'tail']
  })
}

module.exports = Logs
