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

const AddCommand = require('../../../AddCommand')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')
const { selectTemplates, installTemplates } = require('../../../lib/templates-helper')

class AddExtensionCommand extends AddCommand {
  async run () {
    const { flags } = await this.parse(AddExtensionCommand)

    aioLogger.debug(`add extensions with flags: ${JSON.stringify(flags)}`)
    // const spinner = ora()

    if (flags.yes && !flags.extension) {
      this.error('--extension= must also be provided when using --yes')
    }

    const fullConfig = this.getFullConfig({ allowNoImpl: true })
    const excludeExtensions = fullConfig.implements.map(e => `${TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_NOT}${e}`)

    const searchCriteria = {
      [TemplateRegistryAPI.SEARCH_CRITERIA_EXTENSIONS]: excludeExtensions
    }
    const orderByCriteria = {
      [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
    }

    const templates = await selectTemplates(searchCriteria, orderByCriteria)
    if (templates.length === 0) {
      this.error('No extensions were chosen to be installed.')
    } else {
      const installer = (args) => this.config.runCommand('templates:install', args)
      await installTemplates(flags.yes, false, templates, installer)
    }
  }
}

AddExtensionCommand.description = `Add new extensions to the project
`
AddExtensionCommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...AddCommand.flags
}

AddExtensionCommand.aliases = ['app:add:ext', 'app:add:extensions']
AddExtensionCommand.args = []

module.exports = AddExtensionCommand
