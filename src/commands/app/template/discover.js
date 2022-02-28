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
const ora = require('ora')
const fetch = require('node-fetch')
const { cli } = require('cli-ux')
const inquirer = require('inquirer')
const { sortValues } = require('../../../lib/app-helper')
const { TEMPLATE_NPM_KEYWORD, TEMPLATE_PACKAGE_JSON_KEY, readPackageJson, npmTextSearch } = require('../../../lib/npm-helper')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:template:discover', { provider: 'debug' })

class DiscoverCommand extends BaseCommand {
  async __install (templates) {
    const packageJson = await readPackageJson()
    const installedTemplates = packageJson[TEMPLATE_PACKAGE_JSON_KEY] || []
    aioLogger.debug(`installedTemplates: ${JSON.stringify(installedTemplates, null, 2)}`)

    const inqChoices = templates
      .filter(elem => { // remove any installed plugins from the list
        aioLogger.debug(`elem (filter): ${elem}`)
        return !installedTemplates.includes(elem.name)
      })
      .map(elem => { // map to expected inquirer format
        aioLogger.debug(`elem (map): ${elem}`)
        return {
          name: `${elem.name}@${elem.version}`,
          value: elem.name
        }
      })

    if (!inqChoices.length) {
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
      await this.config.runCommand('app:template:install', [template])
    }

    return response.templates
  }

  async __list (plugins) {
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
    cli.table(plugins, columns)
  }

  async run () {
    const { flags } = this.parse(DiscoverCommand)
    const spinner = ora()

    try {
      let packages = {}
      const registrySpec = flags['experimental-registry']

      spinner.start()
      if (registrySpec === 'npm') {
        const json = await npmTextSearch(`keywords:${TEMPLATE_NPM_KEYWORD}`)
        aioLogger.debug(`retrieved templates: ${JSON.stringify(json, null, 2)}`)
        packages = json.objects.map(e => e.package)
      } else {
        const json = await this.__getRegistryPackages(registrySpec)
        aioLogger.debug(`retrieved templates from registry ${registrySpec}: ${JSON.stringify(json, null, 2)}`)
        packages = json.data
      }
      spinner.stop()

      if (flags.scope) {
        packages = packages.filter(elem => elem.scope === flags.scope)
      }

      sortValues(packages, {
        descending: flags['sort-order'] !== 'asc',
        field: flags['sort-field']
      })

      if (flags.interactive) {
        return this.__install(packages)
      } else {
        return this.__list(packages)
      }
    } catch (error) {
      spinner.stop()
      this.error('Oops:' + error)
    }
  }

  async __getRegistryPackages (registrySpec) {
    let response = await fetch(registrySpec)
    const regMetadata = await response.json()
    const registryFile = regMetadata.registry

    aioLogger.debug(`retrieved metadata from registry ${registrySpec}: ${JSON.stringify(regMetadata, null, 2)}`)

    if (!registryFile) {
      this.error('App template registry file not found (missing registry key in metadata)')
    }

    response = await fetch(registryFile)
    return response.json()
  }
}

DiscoverCommand.description = 'Discover App Builder templates to install'

DiscoverCommand.aliases = ['app:template:disco']

DiscoverCommand.flags = {
  ...BaseCommand.flags,
  'experimental-registry': flags.string({
    char: 'r',
    description: '',
    default: 'npm'
  }),
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
