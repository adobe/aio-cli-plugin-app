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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const path = require('path')
const aioConfigLoader = require('@adobe/aio-lib-core-config')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')
const inquirer = require('inquirer')

class AddActionCommand extends TemplatesCommand {
  async run() {
    const { flags } = await this.parse(AddActionCommand)

    aioLogger.debug(`add actions with flags: ${JSON.stringify(flags)}`)

    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(await this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('Please use the \'-e\' flag to specify to which implementation you want to add actions to.')
    }
    const configName = entries[0][0]
    const config = entries[0][1]

    const actionFolder = path.relative(config.root, config.actions.src)
    const configData = await this.getRuntimeManifestConfigFile(configName, flags)

    const projectOrgId = aioConfigLoader.get('project.org.id')
    if (!projectOrgId) {
      this.error(`Incomplete .aio configuration, please import a valid Adobe Developer Console configuration via \`${this.config.bin} app use\` first.`)
    }

    const consoleCLI = await this.getLibConsoleCLI()
    const orgSupportedServices = await consoleCLI.getEnabledServicesForOrg(projectOrgId)

    const templateOptions = {
      'skip-prompt': flags.yes,
      'action-folder': actionFolder,
      'config-path': configData.file,
      'full-key-to-manifest': configData.key
    }

    const [searchCriteria, orderByCriteria] = await this.getSearchCriteria(orgSupportedServices)
    const templates = await this.selectTemplates(searchCriteria, orderByCriteria, orgSupportedServices)
    if (templates.length === 0) {
      this.error('No action templates were chosen to be installed.')
    } else {
      await this.installTemplates({
        useDefaultValues: flags.yes,
        installNpm: flags.install,
        templateOptions,
        templates
      })
    }
  }

  async getSearchCriteria(orgSupportedServices) {
    const choices = [
      {
        name: 'All Action Templates',
        value: 'allActionTemplates',
        checked: true
      }
    ]

    if (orgSupportedServices) {
      choices.push({
        name: 'Only Action Templates Supported By My Org',
        value: 'orgActionTemplates',
        checked: false
      })
    }

    const { components: selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'components',
        message: 'What action templates do you want to search for?',
        loop: false,
        choices
      }
    ])

    const TEMPLATE_CATEGORIES = ['action', 'helper-template']
    const searchCriteria = {
      [TemplateRegistryAPI.SEARCH_CRITERIA_STATUSES]: TemplateRegistryAPI.TEMPLATE_STATUS_APPROVED,
      [TemplateRegistryAPI.SEARCH_CRITERIA_CATEGORIES]: TEMPLATE_CATEGORIES,
      [TemplateRegistryAPI.SEARCH_CRITERIA_EXTENSIONS]: TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_NONE
    }

    switch (selection) {
      case 'orgActionTemplates': {
        const supportedServiceCodes = new Set(orgSupportedServices.map(s => `|${s.code}`)) // | symbol denotes an OR clause
        searchCriteria[TemplateRegistryAPI.SEARCH_CRITERIA_APIS] = Array.from(supportedServiceCodes)
      }
        break
      case 'allActionTemplates':
      default:
        break
    }

    const { name: selectionLabel } = choices.find(item => item.value === selection)

    // an optional OrderBy Criteria object
    const orderByCriteria = {
      [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
    }

    return [searchCriteria, orderByCriteria, selection, selectionLabel]
  }
}

AddActionCommand.description = `Add new actions
`

AddActionCommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  extension: Flags.string({
    description: 'Add actions to a specific extension',
    char: 'e',
    multiple: false,
    parse: str => [str]
  }),
  ...TemplatesCommand.flags
}

AddActionCommand.aliases = ['app:add:actions']
AddActionCommand.args = {}

module.exports = AddActionCommand
