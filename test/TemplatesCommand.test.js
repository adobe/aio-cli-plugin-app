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

const templateRegistryConfig = {
  server: {
    url: 'https://template-registry-api.adobe.tbd',
    version: 'v1.0.0'
  }
}

let command

beforeEach(() => {
  command = new TheCommand()
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

test('getTemplates', async () => {
  const searchCriteria = {
    categories: ['action', 'ui'],
    statuses: ['Approved'],
    adobeRecommended: true
  }
  const orderByCriteria = {
    names: 'desc'
  }

  nock(templateRegistryConfig.server.url)
    .get(`/apis/${templateRegistryConfig.server.version}/templates`)
    .query({
      size: 50,
      categories: 'action,ui',
      statuses: 'Approved',
      adobeRecommended: true,
      orderBy: 'names desc'
    })
    .times(1)
    .reply(200, fixtureFile('response.templates.json'))

  const templates = await command.getTemplates(searchCriteria, orderByCriteria, templateRegistryConfig)
  expect(templates).not.toEqual(null)
})
