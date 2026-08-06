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

jest.mock('open', () => jest.fn())
jest.mock('@adobe/aio-lib-core-config')

const TheCommand = require('../../../../src/commands/app/console/open')
const BaseCommand = require('../../../../src/BaseCommand')
const open = require('open')
const mockConfig = require('@adobe/aio-lib-core-config')
const libEnv = require('@adobe/aio-lib-env')

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
  libEnv.getCliEnv.mockReturnValue('prod')
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

test('opens the workspace details url for a complete config (prod)', async () => {
  await TheCommand.run([])
  expect(open).toHaveBeenCalledWith(
    'https://developer.adobe.com/console/projects/org-id/projectid/workspaces/workspaceid/details'
  )
})

test('opens the stage url when the cli env is stage', async () => {
  libEnv.getCliEnv.mockReturnValue('stage')
  await TheCommand.run([])
  expect(open).toHaveBeenCalledWith(
    'https://developer-stage.adobe.com/console/projects/org-id/projectid/workspaces/workspaceid/details'
  )
})

test('opens the project overview url when there is no workspace selected', async () => {
  delete fakeCurrentConfig.workspace
  setConfigMock()
  await TheCommand.run([])
  expect(open).toHaveBeenCalledWith(
    'https://developer.adobe.com/console/projects/org-id/projectid/overview'
  )
})

test('errors when org is missing', async () => {
  delete fakeCurrentConfig.org
  setConfigMock()
  await expect(TheCommand.run([])).rejects.toThrow(
    'Incomplete .aio configuration, cannot open the Developer Console.' +
    ' Please import a valid Adobe Developer Console configuration file via `aio app use <config>.json`.'
  )
  expect(open).not.toHaveBeenCalled()
})

test('errors when project is missing', async () => {
  fakeCurrentConfig = {}
  setConfigMock()
  await expect(TheCommand.run([])).rejects.toThrow(
    'Incomplete .aio configuration, cannot open the Developer Console.' +
    ' Please import a valid Adobe Developer Console configuration file via `aio app use <config>.json`.'
  )
  expect(open).not.toHaveBeenCalled()
})
