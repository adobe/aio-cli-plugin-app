/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const AddCommand = require('./AddCommand')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:TemplatesCommand', { provider: 'debug' })
const inquirerTablePrompt = require('inquirer-table-prompt')
const inquirer = require('inquirer')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')
const hyperlinker = require('hyperlinker')
const ora = require('ora')
const terminalSize = require('term-size')

class TemplatesCommand extends AddCommand {
  /**
   * Gets a list of templates from the Template Registry API using the criteria provided.
   *
   * @param {object} searchCriteria the Template Registry API search criteria
   * @param {object} orderByCriteria the Template Registry API orderBy criteria
   * @returns {Array<object>} list of templates
   */
  async getTemplates (searchCriteria, orderByCriteria) {
    const templateRegistryClient = TemplateRegistryAPI.init()
    const templateList = []

    const templatesIterator = templateRegistryClient.getTemplates(searchCriteria, orderByCriteria)

    for await (const templates of templatesIterator) {
      for (const template of templates) {
        templateList.push(template)
      }
    }
    aioLogger.debug('template list', JSON.stringify(templateList, null, 2))

    return templateList
  }

  /**
   * Select templates from the Template Registry API, via a cli table.
   *
   * @param {object} searchCriteria the Template Registry API search criteria
   * @param {object} orderByCriteria the Template Registry API orderBy criteria
   * @returns {string} the selected template module name
   */
  async selectTemplates (searchCriteria, orderByCriteria) {
    aioLogger.debug('searchCriteria', JSON.stringify(searchCriteria, null, 2))
    aioLogger.debug('orderByCriteria', JSON.stringify(orderByCriteria, null, 2))

    const spinner = ora()
    spinner.start('Getting available templates')

    const templateList = await this.getTemplates(searchCriteria, orderByCriteria)
    aioLogger.debug('templateList', JSON.stringify(templateList, null, 2))
    spinner.succeed('Downloaded the list of templates')

    if (templateList.length === 0) {
      throw new Error('There are no templates that match the query for selection')
    }

    const { columns: terminalColumns } = terminalSize()

    const colPadding = 3
    const colWidths = [
      Math.round(0.3 * terminalColumns) - colPadding,
      Math.round(0.3 * terminalColumns) - colPadding,
      Math.round(0.2 * terminalColumns) - colPadding,
      Math.round(0.2 * terminalColumns) - colPadding]

    const COLUMNS = {
      COL_TEMPLATE: 'Template',
      COL_DESCRIPTION: 'Description',
      COL_EXTENSION_POINT: 'Extension Point',
      COL_CATEGORIES: 'Categories'
    }

    const rows = templateList.map(template => {
      const extensionPoint = template.extensions ? template.extensions.map(ext => ext.extensionPointId).join(',') : 'N/A'
      const name = template.adobeRecommended ? `${template.name} *` : template.name
      return {
        value: template.name,
        [COLUMNS.COL_TEMPLATE]: name,
        [COLUMNS.COL_DESCRIPTION]: template.description,
        [COLUMNS.COL_EXTENSION_POINT]: extensionPoint,
        [COLUMNS.COL_CATEGORIES]: template.categories.join(', ')
      }
    })
    const promptName = 'select template'

    inquirer.registerPrompt('table', inquirerTablePrompt)
    const answers = await inquirer
      .prompt([
        {
          type: 'table',
          name: promptName,
          bottomContent: `* = recommended by Adobe; to learn more about the templates, go to ${hyperlinker('https://adobe.ly/templates', 'https://adobe.ly/templates')}`,
          message: 'Choose the template(s) to install:',
          style: { head: [], border: [] },
          wordWrap: true,
          wrapOnWordBoundary: false,
          colWidths,
          columns: [
            { name: COLUMNS.COL_TEMPLATE },
            { name: COLUMNS.COL_DESCRIPTION, wrapOnWordBoundary: true },
            { name: COLUMNS.COL_EXTENSION_POINT },
            { name: COLUMNS.COL_CATEGORIES, wrapOnWordBoundary: false }
          ],
          rows
        }
      ])

    return answers[promptName]
  }

  /**
   * Install the templates.
   *
   * @param {object} templateData the template data
   * @param {boolean} [templateData.useDefaultValues=false] use default values when installing the template
   * @param {boolean} [templateData.skipInstallConfig=false] skip processing the install.yml of the template
   * @param {object} [templateData.templateOptions=null] set the template options for installation
   * @param {Array} templateData.templates the list of templates to install
   */
  async installTemplates ({
    useDefaultValues = false,
    skipInstallConfig = false,
    templateOptions = null,
    templates = []
  } = {}) {
    const spinner = ora()

    // install the templates in sequence
    for (const template of templates) {
      spinner.info(`Installing template ${template}`)
      const installArgs = [template]
      if (useDefaultValues) {
        installArgs.push('--yes')
      }
      if (skipInstallConfig) {
        installArgs.push('--no-process-install-config')
      }

      if (templateOptions) {
        if (typeof templateOptions !== 'object' || Array.isArray(templateOptions)) { // must be a non-array object
          throw new Error(`templateOptions ${templateOptions} is not a JavaScript object.`)
        }
        const jsonString = JSON.stringify(templateOptions)
        installArgs.push(`--template-options=${Buffer.from(jsonString).toString('base64')}`)
      }

      await this.config.runCommand('templates:install', installArgs)
      spinner.succeed(`Installed template ${template}`)
    }
  }
}

TemplatesCommand.flags = {
  ...AddCommand.flags
}

module.exports = TemplatesCommand
