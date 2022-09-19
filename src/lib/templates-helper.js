const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:lib:templates-helper', { provider: 'debug' })
const inquirerTablePrompt = require('inquirer-table-prompt')
const inquirer = require('inquirer')
const TemplateRegistryAPI = require('@adobe/aio-lib-templates')
const hyperlinker = require('hyperlinker')
const ora = require('ora')

/**
 * Gets a list of templates from the Template Registry API using the criteria provided.
 *
 * @param {object} searchCriteria the Template Registry API search criteria
 * @param {object} orderByCriteria the Template Registry API orderBy criteria
 * @returns {Array<object>} list of templates
 */
async function getTemplates (searchCriteria, orderByCriteria) {
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
async function selectTemplates (searchCriteria, orderByCriteria) {
  aioLogger.debug('searchCriteria', JSON.stringify(searchCriteria, null, 2))
  aioLogger.debug('orderByCriteria', JSON.stringify(orderByCriteria, null, 2))

  const spinner = ora()
  spinner.start('Getting available templates')

  const templateList = await getTemplates(searchCriteria, orderByCriteria)
  aioLogger.debug('templateList', JSON.stringify(templateList, null, 2))
  spinner.succeed('Downloaded the list of templates')

  if (templateList.length === 0) {
    throw new Error('There are no templates that match the query for selection')
  }

  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const { default: terminalSize } = await import('term-size')
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
        bottomContent: `* = recommended by Adobe; to learn more about the templates, go to ${hyperlinker('http://adobe.ly/templates', 'http://adobe.ly/templates')}`,
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
 * @param {boolean} [useDefaultValues=false] use default values when installing the template
 * @param {boolean} [skipInstallConfig=false] skip processing the install.yml of the template
 * @param {object} installer the actual function that will install the template
 * @param {Array} templates the list of templates to install
 */
async function installTemplates (useDefaultValues = false, skipInstallConfig = false, templates, installer) {
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
    await installer(installArgs)
    spinner.succeed(`Installed template ${template}`)
  }
}

module.exports = {
  getTemplates,
  selectTemplates,
  installTemplates
}
