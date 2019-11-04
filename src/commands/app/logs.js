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

const openwhisk = require('openwhisk');
const aioConfig = require('@adobe/aio-lib-core-config')

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')
const BaseCommand = require('../../BaseCommand')

class Logs extends BaseCommand {
  async run () {
    const { flags } = this.parse(Logs)

    this.aioConfig = aioConfig.get() || {}
    await this.getLogs(flags.limit)
    this.log(`✔ Finished fetching logs!`)
  }

  async getLogs (limit) {
    const auth = Buffer.from(this.aioConfig.runtime.auth).toString('base64')
    const authHandler = {
      getAuthHeader: ()=>{
        return Promise.resolve('Basic ' + auth)
      }
    }
    // get activations
    const options = {apihost: 'runtime.adobe.io',
    auth_handler: authHandler,
    namespace: this.aioConfig.runtime.namespace
  };
    const ow = openwhisk(options);
    const listOptions = {limit: limit, skip: 0}
    let activations = await ow.activations.list(listOptions)
    for (let i = 0; i < activations.length; i++) {
      await this.getActivationLogs(activations[i], ow)
    }
  }

  async getActivationLogs (activation, ow) {
    const logOptions = {activationId: activation.activationId}
    let results = await ow.activations.logs(logOptions)
    // send fetched logs to console
    if (results.logs) {
      results.logs.forEach(function (log) {
        console.log(log + " - " + activation.name)
      })
    }
  }
}

Logs.description = `Fetch logs for application
`

Logs.flags = {
  'limit': flags.integer({
    description: 'Limit number of activations to fetch logs from',
    default: 1,
    char: 'l'
  }),
  ...BaseCommand.flags
}

Logs.args = [
  ...BaseCommand.args
]

module.exports = Logs
