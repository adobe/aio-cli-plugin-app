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

const TemplatesCommand = require('../../../TemplatesCommand')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:web-assets', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')

class AddWebAssetsCommand extends TemplatesCommand {
  async run () {
    const { flags } = await this.parse(AddWebAssetsCommand)
    aioLogger.debug(`add web-assets with flags: ${JSON.stringify(flags)}`)

    const projectName = this.getFullConfig().packagejson.name
    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('Please use the \'-e\' flag to specify to which implementation you want to add web-assets to.')
    }
    const config = entries[0][1]
    const webSrcFolder = config.web.src

    const templateOptions = {
      'skip-prompt': flags.yes,
      'project-name': projectName,
      'web-src-folder': webSrcFolder
    }

    const TEMPLATE_CATEGORIES = ['ui', 'helper-template']
    const searchCriteria = {
      [TemplateRegistryAPI.SEARCH_CRITERIA_STATUSES]: TemplateRegistryAPI.TEMPLATE_STATUS_APPROVED,
      [TemplateRegistryAPI.SEARCH_CRITERIA_CATEGORIES]: TEMPLATE_CATEGORIES,
      [TemplateRegistryAPI.SEARCH_CRITERIA_EXTENSIONS]: TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_NONE
    }
    const orderByCriteria = {
      [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
    }
    const templates = await this.selectTemplates(searchCriteria, orderByCriteria)
    if (templates.length === 0) {
      this.error('No web-asset templates were chosen to be installed.')
    } else {
      await this.installTemplates({
        useDefaultValues: flags.yes,
        installNpm: flags.install,
        templateOptions,
        templates
      })
    }
  }
}

AddWebAssetsCommand.description = `Add web assets support
`

AddWebAssetsCommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  extension: Flags.string({
    description: 'Add web-assets to a specific extension',
    char: 'e',
    multiple: false,
    parse: str => [str]
  }),
  ...TemplatesCommand.flags
}

AddWebAssetsCommand.args = {}

module.exports = AddWebAssetsCommand
