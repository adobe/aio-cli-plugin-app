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

const BaseCommand = require('../../../../BaseCommand')
const LogForwarding = require('../../../../lib/log-forwarding')
const { setRuntimeApiHostAndAuthHandler } = require('../../../../lib/auth-helper')

class LogForwardingCommand extends BaseCommand {
  async run() {
    const { flags } = await this.parse(LogForwardingCommand)
    let aioConfig = (await this.getFullConfig({}, flags)).aio
    aioConfig = setRuntimeApiHostAndAuthHandler(aioConfig)
    const lf = await LogForwarding.init(aioConfig)

    const localConfig = lf.getLocalConfig()
    const serverConfig = await lf.getServerConfig()

    if (!localConfig.isEqual(serverConfig)) {
      this.log('Local and server log forwarding configuration is different')
      let message = 'Run'
      if (localConfig.isDefined()) {
        message += " either 'aio app:deploy' to update the server, or"
      }
      message += " 'aio app:config:set:log-forwarding' to set new local and server configuration"
      this.log(message)
      this.log('Local configuration:')
      this.printConfig(localConfig)
      this.log('\nServer configuration:')
    }
    this.printConfig(serverConfig)
  }

  printConfig(config) {
    if (config.isDefined()) {
      this.log(`destination: ${config.getDestination()}`)
      this.log('settings:', config.getSettings())
    } else {
      this.log('Not defined')
    }
  }
}

LogForwardingCommand.description = 'Get log forwarding destination configuration'
LogForwardingCommand.aliases = ['app:config:get:log-forwarding', 'app:config:get:lf']

module.exports = LogForwardingCommand
