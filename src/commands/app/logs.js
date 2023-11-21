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

const { Flags } = require('@oclif/core')
const BaseCommand = require('../../BaseCommand')
const { wrapError } = require('../../lib/app-helper')
const rtLib = require('@adobe/aio-lib-runtime')
const LogForwarding = require('../../lib/log-forwarding')

const SECURED = 'require-adobe-auth'

class Logs extends BaseCommand {
  _processEachAction (fullConfig, processFn) {
    const isSecuredAction = (pkg, aName) => pkg && pkg.actions && pkg.actions[aName] &&
      pkg.actions[aName].annotations && pkg.actions[aName].annotations[SECURED]

    Object.entries(fullConfig.all).forEach(([, config]) => {
      Object.entries(config.manifest.full.packages).forEach(([packageName, pkg]) => {
        // handle default package
        packageName = packageName.replace(/__APP_PACKAGE__/g, config.ow.package)
        Object.keys(pkg.actions).forEach((aName) => {
          processFn(packageName, aName, isSecuredAction(pkg, aName))
        })
      })
    })
  }

  async run () {
    const { flags } = await this.parse(Logs)
    const fullConfig = await this.getFullConfig()

    // has any backend
    const hasAnyBackend = Object.values(fullConfig.all).reduce((hasBackend, config) => hasBackend && config.app.hasBackend, true)
    if (!hasAnyBackend) {
      throw new Error('There are no backend implementations for this project folder.')
    }

    const lf = await LogForwarding.init(fullConfig.aio)
    const serverConfig = await lf.getServerConfig()
    const logForwardingDestination = serverConfig.getDestination()
    if (logForwardingDestination !== 'adobe_io_runtime') {
      this.log(`Namespace is configured with custom log forwarding destination: '${logForwardingDestination}'. ` +
        'Please use corresponding logging platform to view logs.')
      return
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
        if (actionName.includes('/')) {
          filterActions.push(actionName)
          return
        }
        // handle action name without package
        const actionsToAdd = []
        this._processEachAction(fullConfig, (packageName, aName) => {
          const normalizedActionName = `${packageName}/${aName}`
          if (normalizedActionName.includes(actionName)) {
            actionsToAdd.push(normalizedActionName)
          }
        })

        if (actionsToAdd.length === 0) {
          throw new Error(`There is no match for action '${actionName}' in any of the packages.`)
        } else {
          filterActions.push(...actionsToAdd)
        }
      })
    } else {
      this._processEachAction(fullConfig, (packageName, aName, isSecured) => {
        if (isSecured) {
          const securedAName = '__secured_' + aName
          filterActions.push(`${packageName}/${securedAName}`)
        }
        filterActions.push(`${packageName}/${aName}`)
      })
    }

    try {
      const owConfig = { ow: Object.values(fullConfig.all)[0].ow }
      await rtLib.printActionLogs(owConfig, this.log.bind(this), flags.limit, filterActions, flags.strip, flags.poll || flags.tail || flags.watch)
    } catch (error) {
      this.error(wrapError(error))
    }
  }
}

Logs.description = `Fetch logs for an Adobe I/O App
`

Logs.flags = {
  ...BaseCommand.flags,
  limit: Flags.integer({
    description: 'Limit number of activations to fetch logs from ( 1-50 )',
    default: 1,
    char: 'l'
  }),
  action: Flags.string({
    description: 'Fetch logs for a specific action',
    char: 'a',
    multiple: true
  }),
  strip: Flags.boolean({
    char: 'r',
    description: 'strip timestamp information and output first line only',
    default: false
  }),
  tail: Flags.boolean({
    description: 'Fetch logs continuously',
    char: 't',
    default: false,
    exclusive: ['watch', 'poll']
  }),
  watch: Flags.boolean({
    description: 'Fetch logs continuously',
    default: false,
    char: 'w',
    exclusive: ['tail', 'poll']
  }),
  poll: Flags.boolean({
    description: 'Fetch logs continuously',
    default: false,
    char: 'o',
    exclusive: ['watch', 'tail']
  })
}

module.exports = Logs
