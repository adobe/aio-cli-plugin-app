/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const BaseCommand = require('../../BaseCommand')
const { flags } = require('@oclif/command')
const yaml = require('js-yaml')

class Info extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Info)
    const appConfig = this.getFullConfig()
    delete appConfig.cli
    // includes .env secret delete all aio config for now
    delete appConfig.aio

    // hide credentials
    Object.values(appConfig.all).forEach(config => {
      if (config.s3.creds) {
        config.s3.creds.accessKeyId = mask(config.s3.creds.accessKeyId)
        config.s3.creds.secretAccessKey = mask(config.s3.creds.secretAccessKey)
      }
      config.ow.auth = mask(config.ow.auth)
    })

    if (flags.json) {
      this.log(JSON.stringify(appConfig))
    } else if (flags.yml) {
      this.log(yaml.safeDump(appConfig))
    } else { // flags.hson
      this.log(JSON.stringify(appConfig, null, 2))
    }
  }
}

/** @private */
function mask (k) {
  return k ? '<hidden>' : 'undefined'
}

Info.description = `Display settings/configuration in use by an Adobe I/O App

`

Info.flags = {
  ...BaseCommand.flags,
  json: flags.boolean({
    description: 'Output json',
    char: 'j',
    exclusive: ['hson', 'yml']
  }),
  hson: flags.boolean({
    default: true,
    description: 'Output human readable json',
    char: 'h',
    exclusive: ['json', 'yml']
  }),
  yml: flags.boolean({
    description: 'Output yml',
    char: 'y',
    exclusive: ['hson', 'json']
  }),
  mask: flags.boolean({
    description: 'Hide known private info',
    default: true,
    allowNo: true
  })
}

Info.args = []

module.exports = Info
