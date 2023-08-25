/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const AddCommand = require('../../../AddCommand')
const TemplatesCommand = require('../../../TemplatesCommand')
const yeoman = require('yeoman-environment')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:event', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const ora = require('ora')
const path = require('path')
const generators = require('@adobe/generator-aio-app')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')

class AddEventCommand extends TemplatesCommand {
  async run () {
    const { flags } = await this.parse(AddEventCommand)

    aioLogger.debug(`add events with flags: ${JSON.stringify(flags)}`)
    const spinner = ora()

    // guaranteed to have at least one, otherwise would throw in config load or in matching the ext name
    const entries = Object.entries(this.getAppExtConfigs(flags))
    if (entries.length > 1) {
      this.error('Please use the \'-e\' flag to specify to which implementation you want to add events to.')
    }

    const configName = entries[0][0]
    const config = entries[0][1]
    const actionFolder = path.relative(config.root, config.actions.src)
    const runtimeManifestData = this.getRuntimeManifestConfigFile(configName)

    const templateOptions = {
      'skip-prompt': false,
      'action-folder': actionFolder,
      'config-path': runtimeManifestData.file,
      'full-key-to-manifest': runtimeManifestData.key
    }

    if (flags['allow-events-templates']) {
      const eventsData = this.getEventsConfigFile(configName)
      templateOptions['full-key-to-events-manifest'] = eventsData.key
      const [searchCriteria, orderByCriteria] = await this.getSearchCriteria()
      const templates = await this.selectTemplates(searchCriteria, orderByCriteria)
      if (templates.length === 0) {
        this.error('No events templates were chosen to be installed.')
      } else {
        await this.installTemplates({
          useDefaultValues: flags.yes,
          installNpm: flags.install,
          templateOptions,
          templates
        })
      }
      // by default yeoman runs the install, we control installation from the app plugin
    } else {
      templateOptions['skip-prompt'] = flags.yes
      templateOptions.force = true
      const env = yeoman.createEnv()
      env.options = { skipInstall: true }
      const eventsGen = env.instantiate(generators['add-events'], {
        options: templateOptions
      })
      await env.runGenerator(eventsGen)

      await this.runInstallPackages(flags, spinner)
    }
  }

  async getSearchCriteria () {
    const TEMPLATE_CATEGORIES = ['events', 'helper-template']
    const searchCriteria = {
      [TemplateRegistryAPI.SEARCH_CRITERIA_STATUSES]: TemplateRegistryAPI.TEMPLATE_STATUS_APPROVED,
      [TemplateRegistryAPI.SEARCH_CRITERIA_CATEGORIES]: TEMPLATE_CATEGORIES,
      [TemplateRegistryAPI.SEARCH_CRITERIA_EXTENSIONS]: TemplateRegistryAPI.SEARCH_CRITERIA_FILTER_NONE
    }

    // an optional OrderBy Criteria object
    const orderByCriteria = {
      [TemplateRegistryAPI.ORDER_BY_CRITERIA_PUBLISH_DATE]: TemplateRegistryAPI.ORDER_BY_CRITERIA_SORT_DESC
    }

    return [searchCriteria, orderByCriteria]
  }
}

AddEventCommand.description = `Add a new Adobe I/O Events action
`

AddEventCommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  extension: Flags.string({
    description: 'Add events to a specific extension',
    char: 'e',
    multiple: false,
    parse: str => [str]
  }),
  'allow-events-templates': Flags.boolean({
    description: 'Feature flag to enable events templates',
    default: false
  }),
  ...AddCommand.flags
}

AddEventCommand.aliases = ['app:add:events']
AddEventCommand.args = {}

module.exports = AddEventCommand
