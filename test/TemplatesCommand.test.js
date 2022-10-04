/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../src/TemplatesCommand')
const BaseCommand = require('../src/BaseCommand')
const nock = require('nock')
const inquirer = require('inquirer')

jest.mock('inquirer', () => ({
  registerPrompt: jest.fn(),
  prompt: jest.fn()
}))

const CUSTOM_TEMPLATE_REGISTRY_CONFIG = {
  server: {
    url: 'https://template-registry-api.adobe.tbd',
    version: 'v1.0.0'
  }
}

const DEFAULT_TEMPLATE_REGISTRY_CONFIG = {
  server: {
    url: 'https://360030-templateregistryapi.adobeioruntime.net',
    version: 'v1'
  }
}

const defaultSearchCriteria = () => ({
  categories: ['action', 'ui'],
  statuses: ['Approved'],
  adobeRecommended: true
})

const defaultOrderByCriteria = () => ({
  names: 'desc'
})

/** @private */
function createQuery (searchCriteria, orderByCriteria) {
  const orderBy = Object
    .entries(orderByCriteria)
    .map(([key, value]) => `${key} ${value}`)

  const size = 50
  return Object
    .entries(searchCriteria)
    .reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        value = value.join(',')
      }
      return {
        ...acc,
        [key]: value
      }
    },
    {
      size,
      orderBy: orderBy.join(',')
    })
}

/** @private */
function nockGetTemplates ({
  contents = fixtureFile('response.templates.json'),
  config = DEFAULT_TEMPLATE_REGISTRY_CONFIG,
  searchCriteria = defaultSearchCriteria(),
  orderByCriteria = defaultOrderByCriteria(),
  query = createQuery(searchCriteria, orderByCriteria)
} = {}) {
  nock(config.server.url)
    .get(`/apis/${config.server.version}/templates`)
    .query(query)
    .times(1)
    .reply(200, contents)

  return {
    contents,
    config,
    searchCriteria,
    orderByCriteria,
    query
  }
}

let command

beforeEach(() => {
  command = new TheCommand()
  command.config = {
    runCommand: jest.fn()
  }

  inquirer.registerPrompt.mockReset()
  inquirer.prompt.mockReset()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
  test('flags', async () => {
    expect(TheCommand.flags).toEqual(expect.objectContaining(BaseCommand.flags))
  })
})

describe('getTemplates', () => {
  test('custom Template Registry API config', async () => {
    const config = CUSTOM_TEMPLATE_REGISTRY_CONFIG
    const { searchCriteria, orderByCriteria } = nockGetTemplates({
      config
    })

    const templates = await command.getTemplates(searchCriteria, orderByCriteria, config)
    expect(templates.length).toBeGreaterThan(0)
  })

  test('default Template Registry API config', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const { searchCriteria, orderByCriteria } = nockGetTemplates({ config })

    const templates = await command.getTemplates(searchCriteria, orderByCriteria)
    expect(templates.length).toBeGreaterThan(0)
  })
})

describe('selectTemplates', () => {
  test('query has at least one item', async () => {
    const config = CUSTOM_TEMPLATE_REGISTRY_CONFIG
    const orgSupportedServices = ['api1']
    const { searchCriteria, orderByCriteria } = nockGetTemplates({ config })
    inquirer.prompt.mockResolvedValue({
      'select template': ['my-template']
    })

    const templates = await command.selectTemplates(searchCriteria, orderByCriteria, orgSupportedServices, config)
    expect(templates.length).toBeGreaterThan(0)
  })

  test('query has at least one item, no template apis', async () => {
    const config = CUSTOM_TEMPLATE_REGISTRY_CONFIG
    const { searchCriteria, orderByCriteria } = nockGetTemplates({ config })
    inquirer.prompt.mockResolvedValue({
      'select template': ['my-template']
    })

    const templates = await command.selectTemplates(searchCriteria, orderByCriteria, undefined, config)
    expect(templates.length).toBeGreaterThan(0)
  })

  test('query has no items', async () => {
    const config = CUSTOM_TEMPLATE_REGISTRY_CONFIG
    const contents = {
      _links: {},
      items: []
    }

    const { searchCriteria, orderByCriteria } = nockGetTemplates({ contents, config })
    await expect(command.selectTemplates(searchCriteria, orderByCriteria, undefined, config))
      .rejects.toThrow('There are no templates that match the query for selection')
  })

  test('use default Template Registry API config', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const orgSupportedServices = []
    const { searchCriteria, orderByCriteria } = nockGetTemplates({ config })
    inquirer.prompt.mockResolvedValue({
      'select template': ['my-template']
    })

    const templates = await command.selectTemplates(searchCriteria, orderByCriteria, orgSupportedServices)
    expect(templates.length).toBeGreaterThan(0)
  })
})

describe('installTemplates', () => {
  test('default options (no templates)', async () => {
    await command.installTemplates()
    // nothing to install
    expect(command.config.runCommand).not.toHaveBeenCalled()
  })

  test('default options (with templates)', async () => {
    await command.installTemplates({
      templates: ['template-1', 'template-2']
    })
    expect(command.config.runCommand).toHaveBeenCalledTimes(2)
    expect(command.config.runCommand).toHaveBeenCalledWith('templates:install', ['template-1'])
    expect(command.config.runCommand).toHaveBeenCalledWith('templates:install', ['template-2'])
  })

  test('non-default options', async () => {
    await command.installTemplates({
      useDefaultValues: true,
      installConfig: false,
      installNpm: false,
      templateOptions: {},
      templates: ['template-1']
    })
    expect(command.config.runCommand).toHaveBeenCalledTimes(1)
    expect(command.config.runCommand).toHaveBeenCalledWith('templates:install', [
      'template-1',
      '--yes',
      '--no-process-install-config',
      '--no-install',
      '--template-options=e30=' // e30= is "{}" in base64
    ])
  })

  test('malformed: templateOptions is an array', async () => {
    const options = {
      templateOptions: [],
      templates: ['template-1']
    }
    await expect(command.installTemplates(options)).rejects.toThrow('The templateOptions is not a JavaScript object.')
  })

  test('malformed: templateOptions is not an object', async () => {
    const options = {
      templateOptions: 123,
      templates: ['template-1']
    }
    await expect(command.installTemplates(options)).rejects.toThrow('The templateOptions is not a JavaScript object.')
  })
})

describe('get templates by extension point ids', () => {
  test('not found', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const contents = {
      _links: {},
      items: [
        {
          name: '@adobe/my-extension',
          extensions: [
            { extensionPointId: 'dx/excshell/1' }
          ]
        }
      ]
    }

    const extensions = ['dx/excshell/1', 'unknown-extension']

    nockGetTemplates({
      contents,
      config,
      searchCriteria: {
        statuses: ['Approved'],
        extensions
      },
      orderByCriteria: {
        publishDate: 'desc'
      }
    })

    const { found, notFound, templates } = await command.getTemplatesByExtensionPointIds(extensions)
    expect(found.length).toEqual(1)
    expect(notFound.length).toEqual(1)
    expect(templates.length).toEqual(1)
  })

  test('all found', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const contents = {
      _links: {},
      items: [
        {
          name: '@adobe/my-extension',
          extensions: [
            { extensionPointId: 'dx/excshell/1' }
          ]
        }
      ]
    }

    const extensions = ['dx/excshell/1']

    nockGetTemplates({
      contents,
      config,
      searchCriteria: {
        statuses: ['Approved'],
        extensions
      },
      orderByCriteria: {
        publishDate: 'desc'
      }
    })

    const { found, notFound, templates } = await command.getTemplatesByExtensionPointIds(extensions)
    expect(found.length).toEqual(1)
    expect(notFound.length).toEqual(0)
    expect(templates.length).toEqual(1)
  })
})

describe('install extensions by extension point ids', () => {
  test('extension not found in Template Registry', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const contents = {
      _links: {},
      items: [
        {
          name: '@adobe/my-extension',
          extensions: [
            { extensionPointId: 'dx/excshell/1' }
          ]
        }
      ]
    }

    const extensionsToInstall = ['dx/excshell/1', 'unknown-extension']
    const extensionsAlreadyImplemented = []

    nockGetTemplates({
      contents,
      config,
      searchCriteria: {
        statuses: ['Approved'],
        extensions: extensionsToInstall
      },
      orderByCriteria: {
        publishDate: 'desc'
      }
    })

    await expect(command.installTemplatesByExtensionPointIds(extensionsToInstall, extensionsAlreadyImplemented))
      .rejects.toThrow('Extension(s) \'unknown-extension\' not found in the Template Registry.')
  })

  test('extension found, will install', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const contents = {
      _links: {},
      items: [
        {
          name: '@adobe/my-extension',
          extensions: [
            { extensionPointId: 'dx/excshell/1' }
          ]
        }
      ]
    }

    const extensionsToInstall = ['dx/excshell/1']
    const extensionsAlreadyImplemented = []

    nockGetTemplates({
      contents,
      config,
      searchCriteria: {
        statuses: ['Approved'],
        extensions: extensionsToInstall
      },
      orderByCriteria: {
        publishDate: 'desc'
      }
    })

    await command.installTemplatesByExtensionPointIds(extensionsToInstall, extensionsAlreadyImplemented)
    expect(command.config.runCommand).toHaveBeenCalledTimes(1)
  })

  test('extension already implemented', async () => {
    const config = DEFAULT_TEMPLATE_REGISTRY_CONFIG
    const contents = {
      _links: {},
      items: [
        {
          name: '@adobe/my-extension',
          extensions: [
            { extensionPointId: 'dx/excshell/1' }
          ]
        }
      ]
    }

    const extensionsToInstall = ['dx/excshell/1', 'foo/bar', 'bar/baz']
    const extensionsAlreadyImplemented = ['dx/excshell/1', 'foo/bar']

    nockGetTemplates({
      contents,
      config,
      searchCriteria: {
        statuses: ['Approved'],
        extensions: extensionsToInstall
      },
      orderByCriteria: {
        publishDate: 'desc'
      }
    })

    await expect(command.installTemplatesByExtensionPointIds(extensionsToInstall, extensionsAlreadyImplemented))
      .rejects.toThrow("'dx/excshell/1, foo/bar' extension(s) are already implemented in this project.")
  })
})
