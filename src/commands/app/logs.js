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

const openwhisk = require('openwhisk')
const aioConfig = require('@adobe/aio-lib-core-config')

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')
const BaseCommand = require('../../BaseCommand')

class Logs extends BaseCommand {
  async run () {
    const { flags } = this.parse(Logs)
    this.foundLogs = false
    this.aioConfig = aioConfig.get() || {}
    this.validateConfig()
    await this.getLogs(flags.limit)
    if (this.foundLogs) { this.log('✔ Finished fetching logs!') } else { this.log('No Logs Found') }
  }

  async getLogs (limit) {
    const options = {
      apihost: 'runtime.adobe.io',
      api_key: this.aioConfig.runtime.auth,
      namespace: this.aioConfig.runtime.namespace
    }
    const ow = openwhisk(options)
    // get activations
    const listOptions = { limit: limit, skip: 0 }
    const activations = await ow.activations.list(listOptions)
    for (let i = 0; i < activations.length; i++) {
      await this.getActivationLogs(activations[i], ow)
    }
  }

  async getActivationLogs (activation, ow) {
    const logOptions = { activationId: activation.activationId }
    const results = await ow.activations.logs(logOptions)
    // send fetched logs to console
    if (results.logs && results.logs.length > 0) {
      this.foundLogs = true
      const logger = this.log
      logger(activation.name + ':' + activation.activationId)
      results.logs.forEach(function (log) {
        logger(log)
      })
    }
  }

  validateConfig () {
    if (!this.aioConfig) { throw new Error('Missing aio config') } else if (!this.aioConfig.runtime || !this.aioConfig.runtime.auth || !this.aioConfig.runtime.namespace) { throw new Error('Missing aio runtime config') }
  }
}

Logs.description = `Fetch logs for an Adobe I/O App
`

Logs.flags = {
  limit: flags.integer({
    description: 'Limit number of activations to fetch logs from',
    default: 1,
    char: 'l'
  }),
  ...BaseCommand.flags
}

// Logs.args = [
//   ...BaseCommand.args
// ]

module.exports = Logs
