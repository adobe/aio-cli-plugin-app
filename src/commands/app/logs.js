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

const rp = require('request-promise')
const aioConfig = require('@adobe/aio-lib-core-config')

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')

const BaseCommand = require('../../BaseCommand')
const baseURL = 'https://runtime.adobe.io/api/v1/namespaces/'

class Logs extends BaseCommand {
  async run () {
    this.aioConfig = aioConfig.get() || {}
    await this.getLogs(flags.limit)
    this.log(`✔ Finished fetching logs!`)
  }

  async getLogs (limit) {
    const auth = Buffer.from(this.aioConfig.runtime.auth).toString('base64')
    let options = { method: 'GET',
      url: baseURL + this.aioConfig.runtime.namespace + '/activations',
      qs: { limit: limit, skip: '0' },
      headers:
       {
         authorization: 'Basic ' + auth
       },
      json: true
    }
    // get activations
    let activations = await rp(options)
    for (let i = 0; i < activations.length; i++) {
      await this.getActivationLogs(activations[i], options)
    }
  }

  async getActivationLogs (activation, options) {
    let args = {
      url: options.url + '/' + activation.activationId + '/logs',
      headers:
       {
         authorization: options.headers.authorization
       },
      json: true
    }
    let results = await rp(args)
    // send fetched logs to console
    if (results.logs) {
      results.logs.forEach(function (log) {
        console.log(log)
      })
    }
  }
}

Logs.description = `Fetch logs for application
`

Logs.flags = {
  'limit': flags.integer({
    description: 'limit number of activations to fetch logs from',
    default: 1,
    char: 'l'
  }),
  ...BaseCommand.flags
}

Logs.args = [
  ...BaseCommand.args
]

module.exports = Logs
