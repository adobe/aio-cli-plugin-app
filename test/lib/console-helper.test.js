/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { EOL } = require('os')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

const { loadCurrentConfiguration, configString, isCompleteConfig } = require('../../src/lib/console-helper')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('loadCurrentConfiguration', () => {
  test('complete project config', () => {
    mockConfig.get.mockImplementation(k => {
      if (k === 'project') {
        return {
          name: 'projectname',
          id: 'projectid',
          org: { name: 'org name', id: 'org-id' },
          workspace: { name: 'workspacename', id: 'workspaceid' }
        }
      }
    })
    expect(loadCurrentConfiguration()).toEqual({
      org: { name: 'org name', id: 'org-id' },
      project: { name: 'projectname', id: 'projectid' },
      workspace: { name: 'workspacename', id: 'workspaceid' }
    })
  })

  test('no project config set', () => {
    mockConfig.get.mockReturnValue(undefined)
    expect(loadCurrentConfiguration()).toEqual({
      org: {},
      project: { name: undefined, id: undefined },
      workspace: {}
    })
  })

  test('project config without org/workspace', () => {
    mockConfig.get.mockReturnValue({ name: 'projectname', id: 'projectid' })
    expect(loadCurrentConfiguration()).toEqual({
      org: {},
      project: { name: 'projectname', id: 'projectid' },
      workspace: {}
    })
  })
})

describe('configString', () => {
  test('complete config', () => {
    const result = configString({
      org: { name: 'my org' },
      project: { name: 'my project' },
      workspace: { name: 'my workspace' }
    })
    expect(result).toEqual([
      '1. Org: my org',
      '2. Project: my project',
      '3. Workspace: my workspace'
    ].join(EOL))
  })

  test('empty config uses placeholders', () => {
    const result = configString({})
    expect(result).toEqual([
      '1. Org: <no org selected>',
      '2. Project: <no project selected>',
      '3. Workspace: <no workspace selected>'
    ].join(EOL))
  })

  test('indents by the given number of spaces', () => {
    const result = configString({ org: { name: 'my org' } }, 4)
    expect(result.split(EOL)[0]).toEqual('    1. Org: my org')
  })
})

describe('isCompleteConfig', () => {
  test('complete config', () => {
    expect(isCompleteConfig({
      org: { id: 'oid', name: 'oname' },
      project: { id: 'pid', name: 'pname' },
      workspace: { id: 'wid', name: 'wname' }
    })).toBeTruthy()
  })

  test('missing org', () => {
    expect(isCompleteConfig({
      project: { id: 'pid', name: 'pname' },
      workspace: { id: 'wid', name: 'wname' }
    })).toBeFalsy()
  })

  test('null config', () => {
    expect(isCompleteConfig(null)).toBeFalsy()
  })
})
