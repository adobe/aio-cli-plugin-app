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

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCli.mockReturnValue({})
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
  await TheCommand.run(['config-file'])
  await TheCommand.run(['config-file', '--overwrite'])
  await TheCommand.run(['config-file', '--merge'])

  expect(importLib.importConfigJson).toHaveBeenCalledTimes(3)
})

test('runs (generator, confirmation yes, got global console config)', async () => {
  inquirer.prompt.mockResolvedValueOnce({ res: true })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue({})

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(1)
})

test('runs (generator, confirmation yes, got global console config, no cli context)', async () => {
  inquirer.prompt.mockResolvedValueOnce({ res: true })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue()

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(1)
})

test('runs (generator, confirmation no, got global console config)', async () => {
  inquirer.prompt.mockResolvedValueOnce({ res: false })
  mockConfig.get.mockReturnValueOnce({
    org: { name: 'MyOrg', id: '123' },
    project: { name: 'MyProject', id: '456' },
    workspace: { name: 'MyWorkspace', id: '789' }
  })
  mockGetCli.mockReturnValue({})

  await TheCommand.run([])
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(0)
})

test('runs (generator, error in global console config)', async () => {
  inquirer.prompt.mockResolvedValue({ res: 'true' })
  mockConfig.get.mockReturnValueOnce(null)

  await expect(TheCommand.run([])).rejects.toThrowError()
  expect(importLib.importConfigJson).toHaveBeenCalledTimes(0)
})
