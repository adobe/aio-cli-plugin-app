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

const { PackHelper } = require('../../../src/lib/pack-helper')
const execa = require('execa')
const fs = require('fs-extra')
const path = require('node:path')
const importHelper = require('../../../src/lib/import-helper')
const yaml = require('js-yaml')
const ora = require('ora')
const { Writable } = require('node:stream')

const libConfig = require('@adobe/aio-cli-lib-app-config')

// mocks
jest.mock('execa')
jest.mock('fs-extra')
jest.mock('../../../src/lib/import-helper')
jest.mock('ora', () => jest.fn(jest.requireActual('../../__mocks__/ora')))
// archiver 8 is ESM-only with a class API; the current mock instance is set per-test.
let currentArchiverMock
jest.unstable_mockModule('archiver', () => ({
  ZipArchive: jest.fn().mockImplementation(() => currentArchiverMock)
}))

const mockGetFullConfig = jest.fn()

const createPackHelper = (options) => new PackHelper({
  config: createOclifMockConfig(),
  log: jest.fn(),
  error: (error) => { throw error instanceof Error ? error : new Error(error) }
}, options)

beforeAll(() => {
  jest.spyOn(libConfig, 'load').mockImplementation(mockGetFullConfig)
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

  mockGetFullConfig.mockReset()

  fs.pathExists.mockClear()
  fs.copy.mockClear()
  fs.createWriteStream.mockClear()
  fs.lstatSync.mockClear()
})

test.each([
  [undefined, true],
  [{ silentLogs: true }, false]
])('controls packaging spinner output with options %j', (options, visible) => {
  let output = ''
  const stream = new Writable({
    write (chunk, encoding, callback) {
      output += chunk.toString()
      callback()
    }
  })
  ora.mockImplementationOnce(options => jest.requireActual('ora')({ ...options, stream, isEnabled: false }))
  const helper = createPackHelper(options)
  helper.spinner.start('Packaging...')
  helper.spinner.succeed('Packaging done.')
  helper.spinner.fail('Packaging failed.')
  expect(output.length > 0).toBe(visible)
  expect(output.includes('Packaging done.')).toBe(visible)
  expect(output.includes('Packaging failed.')).toBe(visible)
})

test.each([
  [undefined, false],
  [{ silentLogs: true }, true]
])('controls packaging file-list output with options %j', async (options, silent) => {
  mockGetFullConfig.mockResolvedValue(fixtureJson('pack/1.all.config.json'))
  fs.pathExists.mockResolvedValue(false)
  const helper = createPackHelper(options)
  const log = jest.spyOn(helper, 'log')
  helper.filesToPack = jest.fn().mockResolvedValue(['some-file'])
  helper.createDeployYamlFile = jest.fn()
  helper.addCodeDownloadAnnotation = jest.fn()
  helper.zipHelper = jest.fn()
  await helper.pack()
  expect(log.mock.calls).toEqual(silent
    ? []
    : [
        ['=== Files to pack ==='],
        ['  some-file'],
        ['=====================']
      ])
})

test('copyPackageFiles', async () => {
  fs.pathExists.mockReturnValue(true)

  const dest = 'my-dest-folder'
  const listOfFiles = ['fileA', 'fileB', 'fileC']

  const command = createPackHelper()
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
  const meshOutput = fixtureFile('pack/3.api-mesh.get.json')

  const command = createPackHelper()
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get', '--json'])
    return { stdout: meshOutput }
  })

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('dist', 'app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/2.deploy.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })

  // no api-mesh command
  command.config = {
    findCommand: jest.fn().mockReturnValue(null),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }
  importHelper.writeFile.mockClear()

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('dist', 'app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/2.deploy.no-mesh.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })
})

test('createDeployYamlFile (1 extension), no api-mesh', async () => {
  const extConfig = fixtureJson('pack/2.all.config.json')

  const command = createPackHelper()
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get', '--json'])
    return {
      stderr: 'Error: Unable to get mesh config. No mesh found for Org'
    }
  })

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('dist', 'app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/2.deploy.no-mesh.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })
})

test('createDeployYamlFile (1 extension), no api-mesh, plugin throws error', async () => {
  const extConfig = fixtureJson('pack/2.all.config.json')

  const command = createPackHelper()
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get', '--json'])
    // eslint-disable-next-line no-throw-literal
    throw {
      stderr: 'Error: Unable to get mesh config. No mesh found for Org'
    }
  })

  await expect(command.createDeployYamlFile(extConfig)).rejects.toEqual(TypeError('Cannot read properties of undefined (reading \'includes\')'))
})

test('createDeployYamlFile (1 extension), api-mesh get call throws non 404 error', async () => {
  const extConfig = fixtureJson('pack/2.all.config.json')

  const command = createPackHelper()
  command.config = {
    findCommand: jest.fn().mockReturnValue({}),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }

  execa.mockImplementationOnce((cmd, args) => {
    expect(cmd).toEqual('aio')
    expect(args).toEqual(['api-mesh', 'get', '--json'])

    return {
      stderr: 'Error: api-mesh service is unavailable'
    }
  })

  await expect(command.createDeployYamlFile(extConfig)).rejects.toEqual(Error('Error: api-mesh service is unavailable'))
})

test('createDeployYamlFile (coverage: standalone app, no services)', async () => {
  const extConfig = fixtureJson('pack/4.all.config.json')

  const command = createPackHelper()
  command.config = {
    findCommand: jest.fn().mockReturnValue(null),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }

  await command.createDeployYamlFile(extConfig)

  await expect(importHelper.writeFile.mock.calls[0][0]).toMatch(path.join('dist', 'app-package', 'deploy.yaml'))
  await expect(importHelper.writeFile.mock.calls[0][1]).toMatchFixture('pack/4.deploy.yaml')
  await expect(importHelper.writeFile.mock.calls[0][2]).toMatchObject({ overwrite: true })
})

test('createDeployYamlFile error on invalid version string', async () => {
  const extConfig = fixtureJson('pack/6.all.config.json')

  const command = createPackHelper()
  command.config = {
    findCommand: jest.fn().mockReturnValue(null),
    runCommand: jest.fn(),
    runHook: jest.fn().mockResolvedValue({ successes: [] })
  }

  await expect(command.createDeployYamlFile(extConfig)).rejects.toThrow('Application version format must be "X.Y.Z", where X, Y, and Z are non-negative integers.')
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

  currentArchiverMock = archiverMock

  // zipHelper is async (loads ESM archiver via dynamic import); flush microtasks so the
  // archive is set up before triggering the stream 'close'/'error' handlers.
  const flush = () => new Promise(resolve => setImmediate(resolve))

  const command = createPackHelper()

  // not a directory, just a file (see lstatSync mock 1)
  const p1 = command.zipHelper('my-file', 'app.zip')
  await flush()
  endStream()
  await p1
  expect(archiverMock.directory).not.toHaveBeenCalled()
  expect(archiverMock.file).toHaveBeenCalledWith('my-file', { name: 'my-file' })
  archiverMock.file.mockClear()

  // a directory (see lstatSync mock 2)
  const p2 = command.zipHelper('my-folder', 'app.zip')
  await flush()
  endStream()
  await p2
  expect(archiverMock.file).not.toHaveBeenCalled()
  expect(archiverMock.directory).toHaveBeenCalledWith('my-folder', false)
  archiverMock.directory.mockClear()

  // lstatsync error (see lstatsync mock 3)
  await expect(command.zipHelper('my-folder', 'app.zip')).rejects.toThrow('folder not found')
  expect(archiverMock.destroy).toHaveBeenCalled()
  archiverMock.destroy.mockClear()

  // archiving error, for coverage (see lstatSync mock 4)
  const p4 = command.zipHelper('my-file', 'app.zip').catch(() => {})
  await flush()
  onError(new Error('archive error'))
  await p4
})

describe('filesToPack', () => {
  test('always include specific files', async () => {
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

    const command = createPackHelper()
    const includeFiles = ['foo.json', 'bar.json']
    const filesToPack = await command.filesToPack({ filesToInclude: includeFiles })
    expect(filesToPack).toEqual(['fileA', 'fileB', ...includeFiles])
  })

  test('nothing filtered', async () => {
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

    const command = createPackHelper()
    const filesToPack = await command.filesToPack()
    expect(filesToPack).toEqual(['fileA', 'fileB'])
  })

  test('exclude specific file', async () => {
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

    const command = createPackHelper()
    const filesToPack = await command.filesToPack({ filesToExclude: ['fileA'] })
    expect(filesToPack).toEqual(['fileB'])
  })

  test('filter for hidden files', async () => {
    const jsonOutput = [{
      files: [
        { path: '.env' },
        { path: '.aio' },
        { path: '.foo' },
        { path: 'fileA' },
        { path: 'fileB' }
      ]
    }]

    execa.mockImplementationOnce((cmd, args) => {
      expect(cmd).toEqual('npm')
      expect(args).toEqual(['pack', '--dry-run', '--json'])
      return { stdout: JSON.stringify(jsonOutput, null, 2) }
    })

    const command = createPackHelper()
    const filesToPack = await command.filesToPack()
    expect(filesToPack).toEqual(['fileA', 'fileB'])
  })

  test('filter for junk files', async () => {
    const jsonOutput = [{
      files: [
        { path: '.DS_Store' },
        { path: 'Thumbs.db' },
        { path: 'fileA' },
        { path: 'fileB' }
      ]
    }]

    execa.mockImplementationOnce((cmd, args) => {
      expect(cmd).toEqual('npm')
      expect(args).toEqual(['pack', '--dry-run', '--json'])
      return { stdout: JSON.stringify(jsonOutput, null, 2) }
    })

    const command = createPackHelper()
    const filesToPack = await command.filesToPack()
    expect(filesToPack).toEqual(['fileA', 'fileB'])
  })
})

test('addCodeDownloadAnnotation: default', async () => {
  const extConfig = fixtureJson('pack/1.all.config.json')

  importHelper.loadConfigFile.mockImplementation(() => {
    return fixtureJson('pack/1.ext.config-loaded.json')
  })

  const command = createPackHelper()
  await command.addCodeDownloadAnnotation(extConfig)

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('dist', 'app-package', 'src', 'dx-excshell-1', 'ext.config.yaml'),
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

  const command = createPackHelper()
  await command.addCodeDownloadAnnotation(extConfig)

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('dist', 'app-package', 'src', 'dx-excshell-1', 'ext.config.yaml'),
    yaml.dump(fixtureExpected),
    { overwrite: true }
  )
})

test('addCodeDownloadAnnotation: complex includes, multiple actions and extensions', async () => {
  const extConfig = fixtureJson('pack/5.all.config.json')

  importHelper.loadConfigFile.mockImplementation(file => {
    const retValues = {
      [path.join('dist', 'app-package', 'app.config.yaml')]: fixtureJson('pack/5.app.config-loaded.json'),
      [path.join('dist', 'app-package', 'sub1.config.yaml')]: fixtureJson('pack/5.sub1.config-loaded.json'),
      [path.join('dist', 'app-package', 'src', 'sub2.config.yaml')]: fixtureJson('pack/5.sub2.config-loaded.json')
    }
    return retValues[file]
  })

  const command = createPackHelper()
  await command.addCodeDownloadAnnotation(extConfig)

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('dist', 'app-package', 'app.config.yaml'),
    yaml.dump(fixtureJson('pack/5.app.annotation-added.config.json')),
    { overwrite: true }
  )

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('dist', 'app-package', 'sub1.config.yaml'),
    yaml.dump(fixtureJson('pack/5.sub1.annotation-added.config.json')),
    { overwrite: true }
  )

  expect(importHelper.writeFile).toHaveBeenCalledWith(
    path.join('dist', 'app-package', 'src', 'sub2.config.yaml'),
    yaml.dump(fixtureJson('pack/5.sub2.annotation-added.config.json')),
    { overwrite: true }
  )
})

describe('pack', () => {
  test('defaults', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    // mock package-lock.json exists and npm ci --dry-run succeeds
    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })
    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        return Promise.resolve({ stdout: '', stderr: '' })
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => (['some-file']))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }
    await command.pack()

    expect(execa).toHaveBeenCalledWith('npm', ['ci', '--dry-run'], { cwd: expect.any(String) })
    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledWith({
      filesToExclude: expect.any(Array),
      filesToInclude: ['package-lock.json']
    })
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    const expectedObj = {
      artifactsFolder: path.join('dist', 'app-package'),
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
  })

  test('excludes the lock file when disabled', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => (['some-file']))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }
    await command.pack({ includeLockFile: false })

    const npmCiCalls = execa.mock.calls.filter(call => call[0] === 'npm' && call[1] && call[1][0] === 'ci')
    expect(npmCiCalls.length).toBe(0)
    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledWith({
      filesToExclude: expect.any(Array),
      filesToInclude: []
    })
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    const expectedObj = {
      artifactsFolder: path.join('dist', 'app-package'),
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
  })

  test('packaging fails (verbose)', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })
    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        return Promise.resolve({ stdout: '', stderr: '' })
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    const errorObject = new Error('zip error')

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => ([]))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn(() => { throw errorObject })
    command.error = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await command.pack({ verbose: true })

    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(1)

    const expectedObj = {
      artifactsFolder: path.join('dist', 'app-package'),
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
    expect(command.error).toHaveBeenCalledWith(errorObject)
  })

  test('packaging fails (not verbose)', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })
    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        return Promise.resolve({ stdout: '', stderr: '' })
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    const errorMessage = 'zip error'

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => ([]))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn(() => { throw new Error(errorMessage) })
    command.error = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await command.pack()

    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)
    expect(command.error).toHaveBeenCalledTimes(1)

    const expectedObj = {
      artifactsFolder: path.join('dist', 'app-package'),
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
    expect(command.error).toHaveBeenCalledWith(errorMessage)
  })

  test('output and app paths', async () => {
    const command = createPackHelper()
    const appPath = path.resolve('new_folder')
    const outputPath = path.resolve('app-2.zip')
    mockGetFullConfig.mockImplementation(async () => {
      expect(process.cwd()).toBe(appPath)
      return fixtureJson('pack/1.all.config.json')
    })

    // mock package-lock.json exists and npm ci --dry-run succeeds
    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })
    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        return Promise.resolve({ stdout: '', stderr: '' })
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => ([]))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await command.pack({ appPath: 'new_folder', output: 'app-2.zip' })

    expect(process.chdir).toHaveBeenCalledWith(appPath)
    expect(command.zipHelper).toHaveBeenCalledWith(path.join('dist', 'app-package'), outputPath)
    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
    expect(command.filesToPack).toHaveBeenCalledTimes(1)
    expect(command.createDeployYamlFile).toHaveBeenCalledTimes(1)
    expect(command.addCodeDownloadAnnotation).toHaveBeenCalledTimes(1)
    expect(command.zipHelper).toHaveBeenCalledTimes(1)

    const expectedObj = {
      artifactsFolder: path.join('dist', 'app-package'),
      appConfig: expect.any(Object)
    }
    expect(runHook).toHaveBeenCalledWith('pre-pack', expectedObj)
    expect(runHook).toHaveBeenCalledWith('post-pack', expectedObj)
  })

  test('outputs error if events hook throws', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))
    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })
    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        return Promise.resolve({ stdout: '', stderr: '' })
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })
    const runHook = jest.fn()
      .mockResolvedValue({
        successes: [],
        failures: [{ plugin: { name: 'ifailedu' }, error: { message: 'some error' } }]
      })
    const command = createPackHelper()
    command.config = { runHook }
    command.error = jest.fn()
    await command.pack({ appPath: 'new_folder', output: 'app-2.zip' })
    expect(runHook).toHaveBeenCalledWith('pre-pack', expect.any(Object))
    expect(command.error).toHaveBeenCalled()
    expect(command.error).toHaveBeenCalledWith('ifailedu : some error', { exit: 1 })
  })

  test('load config throws (on validation)', async () => {
    mockGetFullConfig.mockImplementation(async () => { throw new Error('invalid fake config error') })

    const command = createPackHelper()

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => ([]))
    command.createDeployYamlFile = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await expect(command.pack({ appPath: 'new_folder', output: 'app-2.zip' })).rejects.toThrow('invalid fake config error')
    expect(mockGetFullConfig).toHaveBeenCalledWith({ validateAppConfig: true })
  })

  test('skips npm ci check when package-lock.json does not exist', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return false
      }
      return false
    })

    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => (['some-file']))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }
    await command.pack()

    const npmCiCalls = execa.mock.calls.filter(call => call[0] === 'npm' && call[1] && call[1][0] === 'ci')
    expect(npmCiCalls.length).toBe(0)
    expect(command.copyPackageFiles).toHaveBeenCalledTimes(1)
  })

  test('errors when npm ci --dry-run fails', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })

    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        const error = new Error('npm ci failed')
        error.stderr = 'npm ERR! code ERESOLVE\nnpm ERR! ERESOLVE unable to resolve dependency tree'
        return Promise.reject(error)
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => (['some-file']))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    command.error = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await command.pack()

    expect(execa).toHaveBeenCalledWith('npm', ['ci', '--dry-run'], { cwd: expect.any(String) })
    expect(command.error).toHaveBeenCalledTimes(1)
    const errorMessage = command.error.mock.calls[0][0]
    expect(errorMessage).toContain('package.json and package-lock.json are incompatible')
    expect(errorMessage).toContain('Run \'npm install\' to update your package-lock.json')
    expect(command.copyPackageFiles).not.toHaveBeenCalled()
  })

  test('errors when npm ci --dry-run fails without stderr', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })

    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        const error = new Error('npm ci failed')
        return Promise.reject(error)
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => (['some-file']))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    command.error = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await command.pack()

    expect(execa).toHaveBeenCalledWith('npm', ['ci', '--dry-run'], { cwd: expect.any(String) })
    expect(command.error).toHaveBeenCalledTimes(1)
    const errorMessage = command.error.mock.calls[0][0]
    expect(errorMessage).toContain('package.json and package-lock.json are incompatible')
    expect(errorMessage).toContain('Run \'npm install\' to update your package-lock.json')
    expect(command.copyPackageFiles).not.toHaveBeenCalled()
  })

  test('errors when npm ci --dry-run fails without stderr or message', async () => {
    mockGetFullConfig.mockImplementation(async () => fixtureJson('pack/1.all.config.json'))

    const command = createPackHelper()

    fs.pathExists.mockImplementation(async (filePath) => {
      if (filePath.includes('package-lock.json')) {
        return true
      }
      return false
    })

    execa.mockImplementationOnce((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'ci' && args[1] === '--dry-run') {
        const error = {}
        return Promise.reject(error)
      }
      return Promise.resolve({ stdout: JSON.stringify([{ files: [] }]) })
    })

    // since we already unit test the methods above, we mock it here
    command.copyPackageFiles = jest.fn()
    command.filesToPack = jest.fn(() => (['some-file']))
    command.createDeployYamlFile = jest.fn()
    command.addCodeDownloadAnnotation = jest.fn()
    command.zipHelper = jest.fn()
    command.error = jest.fn()
    const runHook = jest.fn().mockResolvedValue({ successes: [] })
    command.config = { runHook }

    await command.pack()

    expect(execa).toHaveBeenCalledWith('npm', ['ci', '--dry-run'], { cwd: expect.any(String) })
    expect(command.error).toHaveBeenCalledTimes(1)
    const errorMessage = command.error.mock.calls[0][0]
    expect(errorMessage).toContain('package.json and package-lock.json are incompatible')
    expect(errorMessage).toContain('Run \'npm install\' to update your package-lock.json')
    expect(errorMessage).toContain('Error: npm ci --dry-run failed')
    expect(command.copyPackageFiles).not.toHaveBeenCalled()
  })
})
