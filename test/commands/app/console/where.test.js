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

const TheCommand = require('../../../../src/commands/app/console/where')
const BaseCommand = require('../../../../src/BaseCommand')
const { EOL } = require('os')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

let fakeCurrentConfig = {}
/** @private */
function setConfigMock () {
  mockConfig.get.mockImplementation(k => {
    if (k === 'project') {
      return fakeCurrentConfig
    }
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  fakeCurrentConfig = {
    name: 'projectname',
    id: 'projectid',
    org: { name: 'org name', id: 'org-id' },
    workspace: { name: 'workspacename', id: 'workspaceid' }
  }
  setConfigMock()
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
  expect(typeof TheCommand.description).toBe('string')
})

test('flags', async () => {
  expect(TheCommand.flags.json.char).toEqual('j')
  expect(TheCommand.flags.json.exclusive).toEqual(['yml'])
  expect(TheCommand.flags.yml.char).toEqual('y')
  expect(TheCommand.flags.yml.exclusive).toEqual(['json'])
})

test('--json and --yml cannot be used together', async () => {
  await expect(TheCommand.run(['--json', '--yml'])).rejects.toThrow()
})

describe('text output', () => {
  test('complete config', async () => {
    const logSpy = jest.spyOn(TheCommand.prototype, 'log').mockReturnValue()
    await TheCommand.run([])
    expect(logSpy).toHaveBeenCalledWith(`This app is set to use:${EOL}` + [
      '1. Org: org name',
      '2. Project: projectname',
      '3. Workspace: workspacename'
    ].join(EOL))
  })

  test('no config set', async () => {
    fakeCurrentConfig = {}
    setConfigMock()
    const logSpy = jest.spyOn(TheCommand.prototype, 'log').mockReturnValue()
    await TheCommand.run([])
    expect(logSpy).toHaveBeenCalledWith(`This app is set to use:${EOL}` + [
      '1. Org: <no org selected>',
      '2. Project: <no project selected>',
      '3. Workspace: <no workspace selected>'
    ].join(EOL))
  })
})

test('--json output', async () => {
  const logSpy = jest.spyOn(TheCommand.prototype, 'log').mockReturnValue()
  await TheCommand.run(['--json'])
  expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
    org: { name: 'org name', id: 'org-id' },
    project: { name: 'projectname', id: 'projectid' },
    workspace: { name: 'workspacename', id: 'workspaceid' }
  }, null, 2))
})

test('--yml output', async () => {
  const logSpy = jest.spyOn(TheCommand.prototype, 'log').mockReturnValue()
  await TheCommand.run(['--yml'])
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('org:'))
  expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('name: org name'))
})
