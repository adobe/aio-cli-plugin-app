/*
 * Copyright 2022 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const { flags } = require('@oclif/command')
const BaseCommand = require('../../../BaseCommand')
const { cli } = require('cli-ux')
const fetch = require('node-fetch')
const inquirer = require('inquirer')
const { sortValues, TEMPLATE_NPM_KEYWORD, TEMPLATE_PACKAGE_JSON_KEY } = require('../../../lib/templates-helper')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:template:discover', { provider: 'debug' })

/*
The npm public registry API:
https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
*/

class DiscoverCommand extends BaseCommand {
  async _install (templates) {
    const installedTemplates = this.config.pjson[TEMPLATE_PACKAGE_JSON_KEY] || []

    const inqChoices = templates
      .filter(elem => { // remove any installed plugins from the list
        return !installedTemplates.includes(elem.name)
      })
      .map(elem => { // map to expected inquirer format
        return {
          name: `${elem.name}@${elem.version}`,
          value: elem.name
        }
      })

    if (!(inqChoices.length)) {
      this.log('All available templates appear to be installed.')
      return []
    }

    const response = await inquirer.prompt([{
      name: 'templates',
      message: 'Select templates to install',
      type: 'checkbox',
      choices: inqChoices
    }])

    // install the templates in sequence
    for (const template of response.templates) {
      await this.config.runCommand('template:install', [template])
    }

    return response.templates
  }

  async _list (plugins) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    const columns = {
      name: {
        width: 10,
        get: row => `${row.name}`
      },
      version: {
        minWidth: 10,
        get: row => `${row.version}`
      },
      description: {
        get: row => `${row.description}`
      },
      published: {
        get: row => `${new Date(row.date).toLocaleDateString('en', options)}`
      }
    }
    // skip ones that aren't from us
    cli.table(plugins, columns)
  }

  async run () {
    const { flags } = this.parse(DiscoverCommand)

    try {
      const url = `https://registry.npmjs.org/-/v1/search?text=keywords:${TEMPLATE_NPM_KEYWORD}`
      aioLogger.debug(`url to retrieve templates: ${url}`)

      const response = await fetch(url)
      const json = await response.json()

      aioLogger.debug(`retrieved templates: ${JSON.stringify(json, null, 2)}`)

      let packages = json.objects.map(e => e.package)

      if (flags.scope) {
        packages = packages.filter(elem => elem.scope === flags.scope)
      }

      sortValues(packages, {
        descending: flags['sort-order'] !== 'asc',
        field: flags['sort-field']
      })

      if (flags.install) {
        return this._install(packages)
      } else {
        return this._list(packages)
      }
    } catch (error) {
      this.error('Oops:' + error)
    }
  }
}

DiscoverCommand.description = 'Discover App Builder templates to install'

DiscoverCommand.aliases = ['template:disco']

DiscoverCommand.flags = {
  ...BaseCommand.flags,
  scope: flags.string({
    char: 's',
    description: 'filter the templates by npm scope'
  }),
  interactive: flags.boolean({
    char: 'i',
    default: false,
    description: 'interactive install mode'
  }),
  'sort-field': flags.string({
    char: 'f',
    default: 'date',
    options: ['date', 'name'],
    description: 'which column to sort, use the sort-order flag to specify sort direction'
  }),
  'sort-order': flags.string({
    char: 'o',
    default: 'desc',
    options: ['asc', 'desc'],
    description: 'sort order for a column, use the sort-field flag to specify which column to sort'
  })
}

module.exports = DiscoverCommand
