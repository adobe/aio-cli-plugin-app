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
const { USER_CONFIG_FILE, DEPLOY_CONFIG_FILE } = require('../../../src/lib/defaults')
const path = require('node:path')
const jsYaml = require('js-yaml')

jest.mock('fs-extra')
jest.mock('unzipper')
jest.mock('../../../src/lib/install-helper')
jest.mock('js-yaml')
jest.mock('ora')
jest.mock('execa')

const mockReadStreamPipe = jest.fn()
const mockUnzipExtract = jest.fn()

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

  installHelper.validateJsonWithSchema.mockClear()

  mockReadStreamPipe.mockClear()
  jsYaml.load.mockClear()

  fs.readFileSync.mockClear()
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
  const message = 'Nonexistent flag: --wtf\nSee more help with --help'
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
      .rejects.toThrow('The app package app.zip is missing these files:')
  })

  test('success', async () => {
    /** @private */
    async function * iter () {
      yield { path: USER_CONFIG_FILE, autodrain }
      yield { path: DEPLOY_CONFIG_FILE, autodrain }
      yield { path: 'package.json', autodrain }
    }

    mockReadStreamPipe.mockReturnValue(iter())

    const command = new TheCommand()
    await expect(command.validateZipDirectoryStructure('app.zip'))
      .resolves.not.toThrow()
  })
})

test('unzipFile', async () => {
  const command = new TheCommand()
  await expect(command.unzipFile('app.zip', 'my-dest-folder'))
    .resolves.toEqual(undefined)

  expect(unzipper.Open.file).toHaveBeenCalledTimes(1)
  expect(unzipper.Open.file).toHaveBeenCalledWith('app.zip')
  expect(mockUnzipExtract).toHaveBeenCalledTimes(1)
  expect(mockUnzipExtract).toHaveBeenCalledWith(expect.objectContaining({ path: 'my-dest-folder' }))
})

describe('validateConfig', () => {
  test('success', async () => {
    installHelper.validateJsonWithSchema.mockReturnValue({
      valid: true,
      errors: null
    })
    fs.readFileSync.mockReturnValue('')
    jsYaml.load.mockReturnValue({})

    const command = new TheCommand()
    await expect(command.validateConfig('my-dest-folder', USER_CONFIG_FILE))
      .resolves.toEqual(undefined)
    expect(installHelper.validateJsonWithSchema).toHaveBeenCalledWith(
      expect.any(Object),
      USER_CONFIG_FILE
    )
  })

  test('failure', async () => {
    installHelper.validateJsonWithSchema.mockReturnValue({
      valid: false,
      errors: ['missing some key']
    })

    const command = new TheCommand()
    await expect(command.validateConfig('my-dest-folder', USER_CONFIG_FILE))
      .rejects.toThrow(`Missing or invalid keys in ${USER_CONFIG_FILE}:`)
  })
})

describe('npmInstall', () => {
  let command

  beforeEach(() => {
    execa.mockReset()
    command = new TheCommand()
  })

  test('success', async () => {
    execa.mockImplementationOnce((cmd, args, options) => {
      expect(cmd).toEqual('npm')
      expect(args).toEqual(['install'])
      expect(options.stdio).toEqual('ignore')
      return Promise.resolve({ stdout: '' })
    })

    const isVerbose = false
    await expect(command.npmInstall(isVerbose)).resolves.toEqual(undefined)
  })

  test('success --verbose', async () => {
    execa.mockImplementationOnce((cmd, args, options) => {
      expect(cmd).toEqual('npm')
      expect(args).toEqual(['install'])
      expect(options.stdio).toEqual('inherit')
      return Promise.resolve({ stdout: '' })
    })

    const isVerbose = true
    await expect(command.npmInstall(isVerbose)).resolves.toEqual(undefined)
  })

  test('failure', async () => {
    const errorMessage = 'npm install error'

    execa.mockImplementationOnce((cmd, args) => {
      expect(cmd).toEqual('npm')
      expect(args).toEqual(['install'])
      throw new Error(errorMessage)
    })

    await expect(command.npmInstall()).rejects.toThrow(errorMessage)
  })
})

describe('runTests', () => {
  let command

  beforeEach(() => {
    command = new TheCommand()
    command.config = {
      runCommand: jest.fn()
    }
    execa.mockImplementationOnce(() => {
      return Promise.resolve({ stdout: '' })
    })
  })

  test('success', async () => {
    command.config.runCommand.mockResolvedValue(0)
    await expect(command.runTests()).resolves.toEqual(undefined)
  })

  test('failure', async () => {
    command.config.runCommand.mockResolvedValue(1)
    await expect(command.runTests())
      .rejects.toThrow('App tests failed')
  })
})

describe('run', () => {
  test('no flags', async () => {
    const command = new TheCommand()
    command.argv = ['my-app.zip']

    // since we already unit test the methods above, we mock it here
    command.validateZipDirectoryStructure = jest.fn()
    command.unzipFile = jest.fn()
    command.validateConfig = jest.fn()
    command.runTests = jest.fn()
    command.npmInstall = jest.fn()
    command.error = jest.fn()
    await command.run()

    expect(command.validateZipDirectoryStructure).toHaveBeenCalledTimes(1)
    expect(command.unzipFile).toHaveBeenCalledTimes(1)
    expect(command.validateConfig).toHaveBeenCalledTimes(2)
    expect(command.runTests).toHaveBeenCalledTimes(1)
    expect(command.npmInstall).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(0)
  })

  test('subcommand throws error (--verbose)', async () => {
    const command = new TheCommand()
    command.argv = ['my-app.zip', '--verbose']

    const errorObject = new Error('this is a subcommand error message')

    // since we already unit test the methods above, we mock it here
    // we only reject one call, to simulate a subcommand failure
    command.validateZipDirectoryStructure = jest.fn()
    command.unzipFile = jest.fn()
    command.validateConfig = jest.fn()
    command.npmInstall = jest.fn()
    command.error = jest.fn()
    command.runTests = jest.fn(() => { throw errorObject })

    await command.run()

    expect(command.validateZipDirectoryStructure).toHaveBeenCalledTimes(1)
    expect(command.unzipFile).toHaveBeenCalledTimes(1)
    expect(command.validateConfig).toHaveBeenCalledTimes(2)
    expect(command.runTests).toHaveBeenCalledTimes(1)
    expect(command.npmInstall).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(1)

    expect(command.error).toHaveBeenCalledWith(errorObject)
  })

  test('subcommand throws error (not verbose)', async () => {
    const command = new TheCommand()
    command.argv = ['my-app.zip']

    const errorMessage = 'this is a subcommand error message'

    // since we already unit test the methods above, we mock it here
    // we only reject one call, to simulate a subcommand failure
    command.validateZipDirectoryStructure = jest.fn()
    command.unzipFile = jest.fn()
    command.validateConfig = jest.fn()
    command.npmInstall = jest.fn()
    command.error = jest.fn()
    command.runTests = jest.fn(() => { throw new Error(errorMessage) })

    await command.run()

    expect(command.validateZipDirectoryStructure).toHaveBeenCalledTimes(1)
    expect(command.unzipFile).toHaveBeenCalledTimes(1)
    expect(command.validateConfig).toHaveBeenCalledTimes(2)
    expect(command.runTests).toHaveBeenCalledTimes(1)
    expect(command.npmInstall).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(1)

    expect(command.error).toHaveBeenCalledWith(errorMessage)
  })

  test('flag --output', async () => {
    const command = new TheCommand()
    command.argv = ['my-app.zip', '--output', 'my-dest-folder']

    // since we already unit test the methods above, we mock it here
    command.validateZipDirectoryStructure = jest.fn()
    command.unzipFile = jest.fn()
    command.validateConfig = jest.fn()
    command.runTests = jest.fn()
    command.npmInstall = jest.fn()
    command.error = jest.fn()

    await command.run()

    expect(command.validateZipDirectoryStructure).toHaveBeenCalledTimes(1)
    expect(command.unzipFile).toHaveBeenCalledTimes(1)
    expect(command.validateConfig).toHaveBeenCalledTimes(2)
    expect(command.runTests).toHaveBeenCalledTimes(1)
    expect(command.npmInstall).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(fakeCwd).toEqual(path.resolve('my-dest-folder'))
  })
})
