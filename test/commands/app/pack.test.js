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
        "expect"
    ]
  }
]
*/

const TheCommand = require('../../../src/commands/app/pack')
const BaseCommand = require('../../../src/BaseCommand')
const execa = require('execa')
const fs = require('fs-extra')
const path = require('node:path')
const importHelper = require('../../../src/lib/import-helper')
const yaml = require('js-yaml')
const archiver = require('archiver')

// mocks
jest.mock('execa')
jest.mock('fs-extra')
jest.mock('../../../src/lib/import-helper')
jest.mock('archiver')

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

  importHelper.loadConfigFile.mockReset()
  importHelper.writeFile.mockReset()

  fakeCwd = 'cwd'
  process.chdir = jest.fn().mockImplementation(dir => { fakeCwd = dir })
  process.cwd = jest.fn().mockImplementation(() => fakeCwd)
  process.chdir.mockClear()
  process.cwd.mockClear()

  mockGetFullConfig.mockClear()

  fs.pathExists.mockClear()
  fs.copy.mockClear()
  fs.createWriteStream.mockClear()
  fs.lstatSync.mockClear()

  archiver.mockClear()
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
  const message = 'Nonexistent flag: --wtf\nSee more help with --help'
  const command = new TheCommand()
  command.argv = ['.', '--wtf'] // have to specify the default arg because an oclif quirk
  await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(message) }))
})

test('copyPackageFiles', async () => {
  fs.pathExists.mockReturnValue(true)

  const dest = 'my-dest-folder'
  const listOfFiles = ['fileA', 'fileB', 'fileC']

  const command = new TheCommand()
  command.argv = []
  await command.copyPackageFiles(dest, listOfFiles)

  listOfFiles.forEach(file => {
    expect(fs.copy).toHaveBeenCalledWith(file, path.join(dest, file))
  })

  // none of the files exist
  fs.copy.mockClear()
  fs.pathExists.mockReturnValue(false)
  await command.copyPackageFiles(dest, listOfFiles)
  expect(fs.copy).not.toHaveBeenCalled()
})

test('createDeployYamlFile (1 extension)', async () => {
  const extConfig = fixtureJson('pack/2.all.config.json')
  const meshOutput = fixtureFile('pack/3.api-mesh.get.txt')

  const command = new TheCommand()
  command.argv = []
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn()
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get'])
    return { stdout: meshOutput }
  })

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/2.deploy.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })

  // no api-mesh command
  command.config = {
    findCommand: jest.fn().mockReturnValue(null),
    runCommand: jest.fn(),
    runHook: jest.fn()
  }
  importHelper.writeFile.mockClear()

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/2.deploy.no-mesh.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })
})

test('createDeployYamlFile (1 extension), no api-mesh', async () => {
  const extConfig = fixtureJson('pack/2.all.config.json')

  const command = new TheCommand()
  command.argv = []
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn()
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get'])
    // eslint-disable-next-line no-throw-literal
    throw {
      stderr: 'Error: Unable to get mesh config. No mesh found for Org'
    }
  })

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/2.deploy.no-mesh.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })
})

test('createDeployYamlFile (1 extension), api-mesh get call throws non 404 error', async () => {
  const extConfig = fixtureJson('pack/2.all.config.json')

  const command = new TheCommand()
  command.argv = []
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn()
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get'])
    // eslint-disable-next-line no-throw-literal
    throw {
      stderr: 'Error: api-mesh service is unavailable'
    }
  })

  await expect(command.createDeployYamlFile(extConfig)).rejects.toEqual(expect.objectContaining({
    stderr: expect.stringContaining('Error: api-mesh service is unavailable')
  }))
})

test('createDeployYamlFile (coverage: standalone app, no services)', async () => {
  const extConfig = fixtureJson('pack/4.all.config.json')

  const command = new TheCommand()
  command.argv = []
  command.config = {
    findCommand: jest.fn().mockReturnValue(null),
    runCommand: jest.fn(),
    runHook: jest.fn()
  }

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/4.deploy.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })
})

test('zipHelper', async () => {
  let endStream, onError
  fs.createWriteStream.mockImplementation(() => {
    return {
      on: (evt, trigger) => {
        if (evt === 'close') {
          endStream = trigger
        }
      }
    }
  })

  fs.lstatSync
    .mockImplementationOnce(() => ({ isDirectory: () => false }))
    .mockImplementationOnce(() => ({ isDirectory: () => true }))
    .mockImplementationOnce(() => { throw new Error('folder not found') })
    .mockImplementationOnce(() => ({ isDirectory: () => false }))

  const archiverMock = {
    on: jest.fn((evt, trigger) => {
      if (evt === 'error') {
        onError = trigger
      }
    }),
    pipe: jest.fn(),
    destroy: jest.fn(),
    directory: jest.fn(),
    file: jest.fn(),
    finalize: jest.fn()
  }

  archiver.mockImplementation(() => archiverMock)

  const command = new TheCommand()
  command.argv = []

  // not a directory, just a file (see lstatSync mock 1)
  command.zipHelper('my-file', 'app.zip')
  endStream()
  expect(archiverMock.directory).not.toHaveBeenCalled()
  expect(archiverMock.file).toHaveBeenCalledWith('my-file', { name: 'my-file' })
  archiverMock.file.mockClear()

  // a directory (see lstatSync mock 2)
  command.zipHelper('my-folder', 'app.zip')
  endStream()
  expect(archiverMock.file).not.toHaveBeenCalled()
  expect(archiverMock.directory).toHaveBeenCalledWith('my-folder', false)
  archiverMock.directory.mockClear()

  // lstatsync error (see lstatsync mock 3)
  await expect(command.zipHelper('my-folder', 'app.zip')).rejects.toThrow('folder not found')
  expect(archiverMock.destroy).toHaveBeenCalled()
  archiverMock.destroy.mockClear()

  // archiving error, for coverage (see lstatSync mock 4)
  command.zipHelper('my-file', 'app.zip').catch(console.error)
  onError()
})

test('filesToPack', async () => {
  const jsonOutput = [{
    files: [
      { path: 'fileA' },
      { path: 'fileB' }
    ]
  }]

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('npm')
    expect(args).toEqual(['pack', '--dry-run', '--json'])
    return { stdout: JSON.stringify(jsonOutput, null, 2) }
  })

  const command = new TheCommand()
  command.argv = []
  const filesToPack = await command.filesToPack()
  expect(filesToPack).toEqual(['fileA', 'fileB'])
})

test('addCodeDownloadAnnotation: default', async () => {
  const extConfig = fixtureJson('pack/1.all.config.json')

  importHelper.loadConfigFile.mockImplementation(() => {
    return fixtureJson('pack/1.ext.config-loaded.json')
  })

  const command = new TheCommand()
  command.argv = []
  await command.addCodeDownloadAnnotation(extConfig)

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('app-package', 'src', 'dx-excshell-1', 'ext.config.yaml'),
    yaml.dump(fixtureJson('pack/1.annotation-added.config.json')),
    { overwrite: true }
  )
})

test('addCodeDownloadAnnotation: no annotations defined', async () => {
  const extConfig = fixtureJson('pack/1.all.config.json')
  // should not have any annotations set
  delete extConfig.all['dx/excshell/1'].manifest.full.packages['dx-excshell-1'].actions.generic.annotations

  const fixtureLoaded = fixtureJson('pack/1.ext.config-loaded.json')
  delete fixtureLoaded.values.runtimeManifest.packages['dx-excshell-1'].actions.generic.annotations
  const fixtureExpected = fixtureJson('pack/1.annotation-added.config.json')
  fixtureExpected.runtimeManifest.packages['dx-excshell-1'].actions.generic.annotations = {
    'code-download': false
  }

  importHelper.loadConfigFile.mockReturnValue(fixtureLoaded)

  const command = new TheCommand()
  command.argv = []
  await command.addCodeDownloadAnnotation(extConfig)

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('app-package', 'src', 'dx-excshell-1', 'ext.config.yaml'),
    yaml.dump(fixtureExpected),
    { overwrite: true }
  )
})

test('addCodeDownloadAnnotation: complex includes, multiple actions and extensions', async () => {
  const extConfig = fixtureJson('pack/5.all.config.json')

  importHelper.loadConfigFile.mockImplementation(file => {
    const retValues = {
      [path.join('app-package', 'app.config.yaml')]: fixtureJson('pack/5.app.config-loaded.json'),
      [path.join('app-package', 'sub1.config.yaml')]: fixtureJson('pack/5.sub1.config-loaded.json'),
      [path.join('app-package', 'src', 'sub2.config.yaml')]: fixtureJson('pack/5.sub2.config-loaded.json')
    }
    return retValues[file]
  })

  const command = new TheCommand()
  command.argv = []
  await command.addCodeDownloadAnnotation(extConfig)

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('app-package', 'app.config.yaml'),
    yaml.dump(fixtureJson('pack/5.app.annotation-added.config.json')),
    { overwrite: true }
  )

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('app-package', 'sub1.config.yaml'),
    yaml.dump(fixtureJson('pack/5.sub1.annotation-added.config.json')),
    { overwrite: true }
  )

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('app-package', 'src', 'sub2.config.yaml'),
    yaml.dump(fixtureJson('pack/5.sub2.annotation-added.config.json')),
    { overwrite: true }
  )
})

describe('run', () => {
  test('defaults', async () => {
    mockGetFullConfig.mockImplementation(() => fixtureJson('pack/1.all.config.json'))

    const command = new TheCommand()
    command.argv = []

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn()
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn()
    command.config = { runHook }
    await command.run()

    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    const expectedObj = {
      artifactsFolder: 'app-package',
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
  })

  test('subcommand throws error (--verbose)', async () => {
    mockGetFullConfig.mockImplementation(() => fixtureJson('pack/1.all.config.json'))

    const command = new TheCommand()
    command.argv = ['--verbose']

    const errorObject = new Error('zip error')

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn()
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn(() => { throw errorObject })
    command.error = jest.fn()
    const runHook = jest.fn()
    command.config = { runHook }

    await command.run()

    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(1)

    const expectedObj = {
      artifactsFolder: 'app-package',
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
    expect(command.error).toHaveBeenCalledWith(errorObject)
  })

  test('subcommand throws error (not verbose)', async () => {
    mockGetFullConfig.mockImplementation(() => fixtureJson('pack/1.all.config.json'))

    const command = new TheCommand()
    command.argv = []

    const errorMessage = 'zip error'

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn()
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn(() => { throw new Error(errorMessage) })
    command.error = jest.fn()
    const runHook = jest.fn()
    command.config = { runHook }

    await command.run()

    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(1)

    const expectedObj = {
      artifactsFolder: 'app-package',
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
    expect(command.error).toHaveBeenCalledWith(errorMessage)
  })

  test('output flag, path arg', async () => {
    mockGetFullConfig.mockImplementation(() => fixtureJson('pack/1.all.config.json'))

    const command = new TheCommand()
    command.argv = ['new_folder', '--output', 'app-2.zip']

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn()
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn()
    command.config = { runHook }

    await command.run()

    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)

    const expectedObj = {
      artifactsFolder: 'app-package',
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
  })
})
