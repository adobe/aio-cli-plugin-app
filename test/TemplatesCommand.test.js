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

/** @private */
function nockGetTemplates ({
  contents = fixtureFile('response.templates.json'),
  config = CUSTOM_TEMPLATE_REGISTRY_CONFIG
} = {}) {
  const searchCriteria = {
    categories: ['action', 'ui'],
    statuses: ['Approved'],
    adobeRecommended: true
  }
  const orderByCriteria = {
    names: 'desc'
  }

  nock(config.server.url)
    .get(`/apis/${config.server.version}/templates`)
    .query({
      size: 50,
      categories: 'action,ui',
      statuses: 'Approved',
      adobeRecommended: true,
      orderBy: 'names desc'
    })
    .times(1)
    .reply(200, contents)

  return [searchCriteria, orderByCriteria]
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
    const [searchCriteria, orderByCriteria] = nockGetTemplates()

    const templates = await command.getTemplates(searchCriteria, orderByCriteria, CUSTOM_TEMPLATE_REGISTRY_CONFIG)
    expect(templates.length).toBeGreaterThan(0)
  })

  test('default Template Registry API config', async () => {
    const [searchCriteria, orderByCriteria] = nockGetTemplates({
      config: DEFAULT_TEMPLATE_REGISTRY_CONFIG
    })

    const templates = await command.getTemplates(searchCriteria, orderByCriteria)
    expect(templates.length).toBeGreaterThan(0)
  })
})

describe('selectTemplates', () => {
  test('query has at least one item', async () => {
    const [searchCriteria, orderByCriteria] = nockGetTemplates()
    inquirer.prompt.mockResolvedValue({
      'select template': ['my-template']
    })

    const templates = await command.selectTemplates(searchCriteria, orderByCriteria, CUSTOM_TEMPLATE_REGISTRY_CONFIG)
    expect(templates.length).toBeGreaterThan(0)
  })

  test('query has no items', async () => {
    const contents = {
      _links: {},
      items: []
    }

    const [searchCriteria, orderByCriteria] = nockGetTemplates({ contents })
    await expect(command.selectTemplates(searchCriteria, orderByCriteria, CUSTOM_TEMPLATE_REGISTRY_CONFIG))
      .rejects.toThrow('There are no templates that match the query for selection')
  })

  test('use default Template Registry API config', async () => {
    const [searchCriteria, orderByCriteria] = nockGetTemplates({ config: DEFAULT_TEMPLATE_REGISTRY_CONFIG })
    inquirer.prompt.mockResolvedValue({
      'select template': ['my-template']
    })

    const templates = await command.selectTemplates(searchCriteria, orderByCriteria)
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
