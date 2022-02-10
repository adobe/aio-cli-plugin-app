/*
 * Copyright 2019 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const { Command, flags } = require('@oclif/command')
const { cli } = require('cli-ux')
const fetch = require('node-fetch')
const inquirer = require('inquirer')
const { sortValues } = require('../../../lib/templates-helper')

/*
The npm public registry API:
https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
*/

const TEMPLATE_NPM_KEYWORD = 'ecosystem:aio-app-builder-template'

class DiscoverCommand extends Command {
  async _install (templates) {
    // get installed templates
    const installedTemplates = this.config.commands.map(elem => {
      return elem.pluginName
    })

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
      const response = await fetch(url)
      const json = await response.json()

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

DiscoverCommand.aliases = ['template:discover']

DiscoverCommand.flags = {
  scope: flags.string({
    char: 's',
    description: 'filter the templates by npm scope'
  }),
  install: flags.boolean({
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
