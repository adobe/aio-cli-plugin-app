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

class LogForwardingCommand extends BaseCommand {
  async run () {
    const lf = await LogForwarding.init(this.getFullConfig().aio)

    const destination = await this.promptDestination(lf.getSupportedDestinations())
    const destinationSettingsConfig = lf.getSettingsConfig(destination)
    const settings = await this.prompt(destinationSettingsConfig)
    const lfConfig = new LogForwarding.LogForwardingConfig(destination, settings)

    const res = await lf.updateServerConfig(lfConfig)
    this.log(`Log forwarding is set to '${destination}'`)

    const fullSanitizedConfig = lfConfig.getMergedConfig(lf.getConfigFromJson(res))
    await lf.updateLocalConfig(fullSanitizedConfig)
    this.log('Log forwarding settings are saved to the local configuration')
  }

  async promptDestination (supportedDestinations) {
    const responses = await this.prompt([{
      name: 'type',
      message: 'select log forwarding destination',
      type: 'list',
      choices: supportedDestinations
    }])
    return responses.type
  }
}

LogForwardingCommand.description = 'Set log forwarding destination configuration'
LogForwardingCommand.aliases = ['app:config:set:log-forwarding', 'app:config:set:lf']

module.exports = LogForwardingCommand
