/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/* eslint jest/expect-expect: [
  "error",
  {
    "assertFunctionNames": [
        "expect", "expectNoErrors", "expectFlagError"
    ]
  }
]
*/

const TheCommand = require('../../../src/commands/app/pack')
const BaseCommand = require('../../../src/BaseCommand')
const execa = require('execa')

// mocks
jest.mock('execa')

const mockGetFullConfig = jest.fn()

beforeAll(() => {
  jest.spyOn(BaseCommand.prototype, 'getFullConfig').mockImplementation(mockGetFullConfig)
})

// mock cwd
let fakeCwd
const savedChdir = process.chdir
const savedCwd = process.cwd

afterAll(() => {
  process.chdir = savedChdir
  process.cwd = savedCwd
  jest.clearAllMocks()
})

beforeEach(() => {
  execa.mockReset()
  execa.command.mockReset()

  fakeCwd = 'cwd'
  process.chdir = jest.fn().mockImplementation(dir => { fakeCwd = dir })
  process.cwd = jest.fn().mockImplementation(() => fakeCwd)
  process.chdir.mockClear()
  process.cwd.mockClear()

  mockGetFullConfig.mockClear()
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
  expect(typeof TheCommand.flags).toBe('object')
  expect(TheCommand.description).toBeDefined()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual([])
})

test('flags', async () => {
  expect(typeof TheCommand.flags.output).toBe('object')
  expect(typeof TheCommand.flags.output.type).toBe('string')
  expect(typeof TheCommand.flags.output.description).toBe('string')
  expect(TheCommand.flags.output.default).toBe('app.zip')
})

test('unknown flag', async () => {
  const message = 'Unexpected argument: --wtf\nSee more help with --help'
  const command = new TheCommand()
  command.argv = ['.', '--wtf'] // have to specify the default arg because an oclif quirk
  await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(message) }))
})

test('copyPackageFiles', () => {
})

test('createDeployYamlFile', () => {
})

test('zipHelper', () => {
})

test('filesToPack', () => {
})

test('addCodeDownloadAnnotation', () => {
})
