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

const BaseCommand = require('../../../../../BaseCommand')
const rtLib = require('@adobe/aio-lib-runtime')
const ora = require('ora')
const { setRuntimeApiHostAndAuthHandler } = require('../../../../../lib/auth-helper')

class ErrorsCommand extends BaseCommand {
  async run () {
    const spinner = ora()
    const lf = await this.getLogForwarding()
    spinner.start('Checking for errors...')
    const res = await lf.getErrors()
    const destinationMessage = res.configured_forwarder !== undefined
      ? ` for the last configured destination '${res.configured_forwarder}'`
      : ''
    if (res.errors && res.errors.length > 0) {
      spinner.succeed(`Log forwarding errors${destinationMessage}:\n` + res.errors.join('\n'))
    } else {
      spinner.succeed(`No log forwarding errors${destinationMessage}`)
    }
  }

  async getLogForwarding () {
    let aioConfig = (await this.getFullConfig()).aio
    aioConfig = setRuntimeApiHostAndAuthHandler(aioConfig)

    const runtimeConfig = aioConfig.runtime
    rtLib.utils.checkOpenWhiskCredentials({ ow: runtimeConfig })
    const rt = await rtLib.init({
      ...runtimeConfig,
      api_key: runtimeConfig.auth
    })
    return rt.logForwarding
  }
}

ErrorsCommand.description = 'Get log forwarding errors'
ErrorsCommand.aliases = ['app:config:get:log-forwarding:errors', 'app:config:get:lf:errors']

module.exports = ErrorsCommand
