/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const TheCommand = require('../../../src/commands/app/use')
const BaseCommand = require('../../../src/BaseCommand')
const importLib = require('../../../src/lib/import')
const inquirer = require('inquirer')
const fs = require('fs-extra')

jest.mock('fs-extra')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

const mockAccessToken = 'some-access-token'
const mockGetCli = jest.fn()
const mockSetCli = jest.fn()
jest.mock('@adobe/aio-lib-ims', () => {
  return {
    context: {
      getCli: () => mockGetCli(),
      setCli: () => mockSetCli()
    },
    getToken: () => mockAccessToken
  }
})

jest.mock('../../../src/lib/import')
jest.mock('yeoman-environment')

const yeoman = require('yeoman-environment')

const mockRegister = jest.fn()
const mockRun = jest.fn()
yeoman.createEnv.mockReturnValue({
  register: mockRegister,
  run: mockRun
})

/** @private */
function mockValidConfig ({ name = 'lifeisgood', credentials = null } = {}) {
  const project = {
    name,
    workspace: {
      details: {
        credentials
      }
    }
  }

  importLib.loadAndValidateConfigFile.mockReturnValue({
    values: { project }
  })

  return project
}

/** @private */
function mockInvalidConfig () {
  importLib.loadAndValidateConfigFile.mockImplementation(() => { throw new Error('fake error') })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCli.mockReturnValue({})
  importLib.loadConfigFile.mockReset()
  importLib.validateConfig.mockReset()
  fs.unlinkSync.mockClear()
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
  expect(typeof TheCommand.description).toBe('string')
})

test('bad flags - unknown', async () => {
  const result = TheCommand.run(['.', '--wtf'])
  expect(result instanceof Promise).toBeTruthy()
  return new Promise((resolve, reject) => {
    return result
      .then(() => reject(new Error()))
      .catch(res => {
        expect(res).toEqual(new Error('Unexpected argument: --wtf\nSee more help with --help'))
        resolve()
      })
  })
})

test('runs (config file)', async () => {
  mockValidConfig()
  await TheCommand.run(['config-file'])
  await TheCommand.run(['config-file', '--overwrite'])
  await TheCommand.run(['config-file', '--merge'])

  expect(importLib.importConfigJson).toHaveBeenCalledTimes(3)
  expect(fs.unlinkSync).not.toHaveBeenCalled()
})

test('runs invalid config', async () => {
  mockInvalidConfig()
  await expect(TheCommand.run(['config-file'])).rejects.toThrow('fake error')
  expect(fs.unlinkSync).not.toHaveBeenCalled()
})

test('runs (generator, confirmation yes, got global console config)', async () => {
  mockValidConfig()
  inquirer.prompt.mockResolvedValueOnce({ res: true })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue({})

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(1)
  expect(importLib.importConfigJson).toHaveBeenCalledWith('console.json', process.cwd(), { interactive: true, merge: false, overwrite: false }, { SERVICE_API_KEY: '' })
  expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
})

test('runs (generator, confirmation yes, got global console config, no cli context)', async () => {
  mockValidConfig()
  inquirer.prompt.mockResolvedValueOnce({ res: true })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue()

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(1)
  expect(importLib.importConfigJson).toHaveBeenCalledWith('console.json', process.cwd(), { interactive: true, merge: false, overwrite: false }, { SERVICE_API_KEY: '' })
  expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
})

test('runs (generator, confirmation yes, got global console config, no cli context, jwt client id is set)', async () => {
  const fakeCredentials = [
    { id: '1', fake: { client_id: 'notjwtId' } },
    { id: '2', jwt: { client_id: 'fakeId123' } }
  ]
  mockValidConfig({ credentials: fakeCredentials })
  inquirer.prompt.mockResolvedValueOnce({ res: true })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue()

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(1)
  expect(importLib.importConfigJson).toHaveBeenCalledWith('console.json', process.cwd(), { interactive: true, merge: false, overwrite: false }, { SERVICE_API_KEY: 'fakeId123' })
  expect(fs.unlinkSync).toHaveBeenCalledWith('console.json')
})

test('runs (generator, confirmation no, got global console config)', async () => {
  mockValidConfig()
  inquirer.prompt.mockResolvedValueOnce({ res: false })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue({})

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(0)
  expect(fs.unlinkSync).not.toHaveBeenCalled()
})

test('runs (generator, error in global console config)', async () => {
  inquirer.prompt.mockResolvedValue({ res: 'true' })
  mockConfig.get.mockReturnValueOnce(null)

  await expect(TheCommand.run([])).rejects.toThrowError()
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(0)
  expect(fs.unlinkSync).not.toHaveBeenCalled()
})
