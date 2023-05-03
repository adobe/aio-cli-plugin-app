/*
Copyright 2023 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../src/commands/app/install.js')
const BaseCommand = require('../../../src/BaseCommand.js')
const fs = require('fs-extra')
const unzipper = require('unzipper')
const execa = require('execa')
const installHelper = require('../../../src/lib/install-helper')
const path = require('node:path')

jest.mock('execa')
jest.mock('fs-extra')
jest.mock('unzipper')
jest.mock('../../../src/lib/install-helper')

const mockReadStreamPipe = jest.fn()
const mockUnzipExtract = jest.fn()

beforeAll(() => {
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
  installHelper.validateJsonWithSchema.mockClear()

  mockReadStreamPipe.mockClear()
  fs.createReadStream.mockImplementation(() => {
    return {
      pipe: mockReadStreamPipe
    }
  })
  unzipper.Parse = jest.fn()

  mockUnzipExtract.mockClear()
  unzipper.Open.file = jest.fn(async () => {
    return {
      extract: mockUnzipExtract
    }
  })

  execa.mockReset()
  execa.command.mockReset()

  fakeCwd = 'cwd'
  process.chdir = jest.fn().mockImplementation(dir => { fakeCwd = dir })
  process.cwd = jest.fn().mockImplementation(() => fakeCwd)
  process.chdir.mockClear()
  process.cwd.mockClear()
})

test('exports', () => {
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
  expect(TheCommand.flags.output.char).toBe('o')
  expect(TheCommand.flags.output.default).toBe('.')
})

test('unknown flag', async () => {
  const message = 'Unexpected argument: --wtf\nSee more help with --help'
  const command = new TheCommand()
  command.argv = ['my-app.zip', '--wtf'] // have to specify the default arg because an oclif quirk
  await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(message) }))
})

test('diffArray', () => {
  const command = new TheCommand()

  const a1 = ['a', 'b', 'c', 'd', 'e']
  const b1 = ['b', 'e']
  expect(command.diffArray(a1, b1)).toEqual(['a', 'c', 'd'])

  const a2 = ['a', 'b', 'c']
  const b2 = ['d']
  expect(command.diffArray(a2, b2)).toEqual(['a', 'b', 'c'])

  const a3 = ['a', 'b', 'c']
  const b3 = null
  expect(command.diffArray(a3, b3)).toEqual(['a', 'b', 'c'])

  const a4 = null
  const b4 = ['d']
  expect(command.diffArray(a4, b4)).toEqual([])

  const a5 = ['a']
  const b5 = null
  expect(command.diffArray(a5, b5)).toEqual(a5)

  const a6 = null
  const b6 = null
  expect(command.diffArray(a6, b6)).toEqual([])
})

describe('validateZipDirectoryStructure', () => {
  const autodrain = jest.fn()

  test('fail', async () => {
    /** @private */
    async function * iter () {
      yield { path: 'a', autodrain }
      yield { path: 'b', autodrain }
    }

    mockReadStreamPipe.mockReturnValue(iter())

    const command = new TheCommand()
    await expect(command.validateZipDirectoryStructure('app.zip'))
      .rejects.toThrowError('The app package app.zip is missing these files:')
  })

  test('success', async () => {
    /** @private */
    async function * iter () {
      yield { path: 'app.config.yaml', autodrain }
      yield { path: 'deploy.yaml', autodrain }
      yield { path: 'package.json', autodrain }
    }

    mockReadStreamPipe.mockReturnValue(iter())

    const command = new TheCommand()
    await expect(command.validateZipDirectoryStructure('app.zip'))
      .resolves.not.toThrowError()
  })
})

test('unzipFile', async () => {
  const command = new TheCommand()
  await expect(command.unzipFile('app.zip', 'my-dest-folder'))
    .resolves.toEqual(undefined)

  expect(unzipper.Open.file).toBeCalledTimes(1)
  expect(unzipper.Open.file).toHaveBeenCalledWith('app.zip')
  expect(mockUnzipExtract).toBeCalledTimes(1)
  expect(mockUnzipExtract).toHaveBeenCalledWith(expect.objectContaining({ path: 'my-dest-folder' }))
})

describe('validateConfig', () => {
  test('success', async () => {
    installHelper.validateJsonWithSchema.mockReturnValue({
      valid: true,
      errors: null
    })

    const command = new TheCommand()
    await expect(command.validateConfig('my-dest-folder', 'app.config.yaml'))
      .resolves.toEqual(undefined)
    expect(installHelper.validateJsonWithSchema).toHaveBeenCalledWith(
      path.join('my-dest-folder', 'app.config.yaml'),
      'app.config.yaml'
    )
  })

  test('failure', async () => {
    installHelper.validateJsonWithSchema.mockReturnValue({
      valid: false,
      errors: ['missing some key']
    })

    const command = new TheCommand()
    await expect(command.validateConfig('my-dest-folder', 'app.config.yaml'))
      .rejects.toThrowError('Missing or invalid keys in app.config.yaml:')
  })
})

describe('runTests', () => {
  test('success', async () => {
    const outputPath = 'my-dest-folder'

    execa.mockImplementationOnce((cmd, args, options) => {
      expect(cmd).toEqual('aio')
      expect(args).toEqual(['app', 'test'])
      expect(options).toEqual(expect.objectContaining({ cwd: outputPath }))
      return { exitCode: 0 }
    })

    const command = new TheCommand()
    await expect(command.runTests(outputPath))
      .resolves.toEqual(undefined)
  })

  test('failure', async () => {
    const outputPath = 'my-dest-folder'

    execa.mockImplementationOnce((cmd, args, options) => {
      expect(cmd).toEqual('aio')
      expect(args).toEqual(['app', 'test'])
      expect(options).toEqual(expect.objectContaining({ cwd: outputPath }))
      return { exitCode: 1 }
    })

    const command = new TheCommand()
    await expect(command.runTests(outputPath))
      .rejects.toThrow(`The tests failed for the app at ${outputPath}`)
  })
})

test('run (no flags)', async () => {
  const command = new TheCommand()
  command.argv = ['my-app.zip']

  // since we already unit test the methods above, we mock it here
  command.validateZipDirectoryStructure = jest.fn()
  command.unzipFile = jest.fn()
  command.validateConfig = jest.fn()
  command.runTests = jest.fn()
  await command.run()

  expect(command.validateZipDirectoryStructure).toHaveBeenCalledTimes(1)
  expect(command.unzipFile).toHaveBeenCalledTimes(1)
  expect(command.validateConfig).toHaveBeenCalledTimes(2)
  expect(command.runTests).toHaveBeenCalledTimes(1)
})

test('run (flag --output)', async () => {
  const command = new TheCommand()
  command.argv = ['my-app.zip', '--output', 'my-dest-folder']

  // since we already unit test the methods above, we mock it here
  command.validateZipDirectoryStructure = jest.fn()
  command.unzipFile = jest.fn()
  command.validateConfig = jest.fn()
  command.runTests = jest.fn()
  await command.run()

  expect(command.validateZipDirectoryStructure).toHaveBeenCalledTimes(1)
  expect(command.unzipFile).toHaveBeenCalledTimes(1)
  expect(command.validateConfig).toHaveBeenCalledTimes(2)
  expect(command.runTests).toHaveBeenCalledTimes(1)
  expect(fakeCwd).toEqual(path.resolve('my-dest-folder'))
})
