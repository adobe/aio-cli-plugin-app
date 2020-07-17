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

const AppScripts = require('@adobe/aio-app-scripts')

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')
const BaseCommand = require('../../BaseCommand')
const RuntimeLib = require('@adobe/aio-lib-runtime')
const { wrapError, checkOpenWhiskCredentials } = require('../../lib/app-helper')

class Logs extends BaseCommand {
  async run () {
    const { flags } = this.parse(Logs)

    const scripts = AppScripts({ listeners: {} })
    const logOptions = {
      logger: this.log,
      limit: flags.limit
    }

    try {
      let args = []
      let limit = logOptions.limit
  
      // parcel bundle options
      const startTime = logOptions.startTime || 0
  
      // remove this bit if app-scripts becomes a lib
      const i = args.indexOf('-l')
      // istanbul ignore next
      if (i >= 0) {
        // istanbul ignore next
        limit = args[i + 1]
      }
      limit = limit || 1
  
      const logger = logOptions.logger || console.log
      const config = AppScripts()._config

      // check for runtime credentials
      checkOpenWhiskCredentials(config)
      const ow = await RuntimeLib.init({
        // todo make this.config.ow compatible with Openwhisk config
        apihost: config.ow.apihost,
        apiversion: config.ow.apiversion,
        api_key: config.ow.auth,
        namespace: config.ow.namespace
      })
  
      let hasLogs = false
  
      // get activations
      const listOptions = { limit: limit, skip: 0 }
      const activations = await ow.activations.list(listOptions)
      let lastActivationTime = 0
      for (let i = (activations.length - 1); i >= 0; i--) {
        const activation = activations[i]
        lastActivationTime = activation.start
        if (lastActivationTime > startTime) {
          const results = await ow.activations.logs({ activationId: activation.activationId })
          // send fetched logs to console
          if (results.logs.length > 0) {
            hasLogs = true
            logger(activation.name + ':' + activation.activationId)
            results.logs.forEach(function (log) {
              logger(log)
            })
            logger()
          }
        }
      }
    
      return { hasLogs: hasLogs, lastActivationTime: lastActivationTime }
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
    description: 'Limit number of activations to fetch logs from',
    default: 1,
    char: 'l'
  })
}

// Logs.args = [
//   ...BaseCommand.args
// ]

module.exports = Logs
