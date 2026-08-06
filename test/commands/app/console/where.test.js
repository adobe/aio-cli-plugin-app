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
function setConfigMock (localConfig = fakeCurrentConfig) {
  mockConfig.get.mockImplementation((k, source) => {
    if (k === 'project') {
      return source === 'local' ? localConfig : fakeCurrentConfig
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

test('errors when no local .aio configuration is found', async () => {
  setConfigMock(undefined)
  await expect(TheCommand.run([])).rejects.toThrow(
    'No local .aio configuration found for this app. Run `aio app use` to link this app to an Org/Project/Workspace.'
  )
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

  test('errors when local .aio config is present but empty', async () => {
    fakeCurrentConfig = {}
    setConfigMock()
    await expect(TheCommand.run([])).rejects.toThrow(
      'No local .aio configuration found for this app. Run `aio app use` to link this app to an Org/Project/Workspace.'
    )
  })

  test('shows the no-workspace-selected placeholder when local .aio has no workspace', async () => {
    delete fakeCurrentConfig.workspace
    setConfigMock()
    const logSpy = jest.spyOn(TheCommand.prototype, 'log').mockReturnValue()
    await TheCommand.run([])
    expect(logSpy).toHaveBeenCalledWith(`This app is set to use:${EOL}` + [
      '1. Org: org name',
      '2. Project: projectname',
      '3. Workspace: <no workspace selected>'
    ].join(EOL))
  })

  test('global config is never used, even if it defines a complete org/project/workspace', async () => {
    delete fakeCurrentConfig.workspace
    setConfigMock()
    mockConfig.get.mockImplementation((k, source) => {
      if (k === 'project') {
        if (source === 'local') return fakeCurrentConfig
        // global/merged fallback: a different, complete project - must never be used
        return {
          name: 'globalprojectname',
          id: 'globalprojectid',
          org: { name: 'global org name', id: 'global-org-id' },
          workspace: { name: 'globalworkspacename', id: 'globalworkspaceid' }
        }
      }
    })
    const logSpy = jest.spyOn(TheCommand.prototype, 'log').mockReturnValue()
    await TheCommand.run([])
    expect(logSpy).toHaveBeenCalledWith(`This app is set to use:${EOL}` + [
      '1. Org: org name',
      '2. Project: projectname',
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
