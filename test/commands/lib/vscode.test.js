/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const vscode = require('../../../src/lib/vscode')
const yeoman = require('yeoman-environment')
const fs = require('fs-extra')
const path = require('path')
const dataMocks = require('../../data-mocks/config-loader')

jest.mock('fs-extra')
jest.mock('yeoman-environment')

const mockYeomanInstantiate = jest.fn()
const mockYeomanRunGenerator = jest.fn()
yeoman.createEnv.mockReturnValue({
  instantiate: mockYeomanInstantiate,
  runGenerator: mockYeomanRunGenerator
})

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

const createFileSystem = (initialFiles = {}) => {
  const myFileSystem = { ...initialFiles }

  fs.existsSync.mockImplementation((filePath) => {
    return (!!myFileSystem[filePath])
  })

  fs.moveSync.mockImplementation((src, dest) => {
    myFileSystem[dest] = myFileSystem[src]
    delete myFileSystem[src]
  })

  const removeFile = (filePath) => {
    delete myFileSystem[filePath]
  }

  fs.unlinkSync.mockImplementation(removeFile)
  fs.rmdirSync.mockImplementation(removeFile)

  fs.readdirSync.mockImplementation((filePath) => {
    const item = myFileSystem[filePath]
    if (!Array.isArray(item)) {
      throw new Error(`Fake filesystem ${filePath} value does not contain an array.`)
    }
    return item
  })

  return myFileSystem
}

beforeEach(() => {
  mockYeomanInstantiate.mockClear()
})

test('exports', () => {
  const vsCodeConfig = vscode({})

  expect(typeof vscode).toEqual('function')
  expect(typeof vsCodeConfig.update).toEqual('function')
  expect(typeof vsCodeConfig.update).toEqual('function')
  expect(typeof vsCodeConfig.cleanup).toEqual('function')
})

test('files()', () => {
  const config = { root: '/my-root' }
  const vsCodeConfig = vscode(config)

  const { backupFile, mainFile } = vsCodeConfig.files()
  expect(backupFile).toEqual(path.join(config.root, '.vscode/launch.json.save'))
  expect(mainFile).toEqual(path.join(config.root, '.vscode/launch.json'))
})

describe('update()', () => {
  const props = { frontEndUrl: 'https://foo.bar' }
  const config = { ...createAppConfig().application, envFile: 'my.env' }
  const vsCodeConfig = vscode(config)
  const { backupFile, mainFile } = vsCodeConfig.files()

  const mockYeomanOutput = (fileSystem) => {
    mockYeomanRunGenerator.mockImplementation(() => {
      fileSystem[mainFile] = 'generated-content'
    })
  }

  test('launch.json does not exist, backup does not exist (no backup copy)', async () => {
    const myFileSystem = createFileSystem()
    mockYeomanOutput(myFileSystem)

    // launch.json does not exist
    expect(mainFile in myFileSystem).toEqual(false)
    // backup does not exist
    expect(backupFile in myFileSystem).toEqual(false)

    await vsCodeConfig.update(props)

    // now launch.json exists
    expect(mainFile in myFileSystem).toEqual(true)
    expect(myFileSystem[mainFile].toString()).toEqual('generated-content')
    // backup should not exist
    expect(backupFile in myFileSystem).toEqual(false)
  })

  test('launch.json exists, backup does not exist (copy to backup)', async () => {
    const myFileSystem = createFileSystem({
      [mainFile]: 'main-content'
    })
    mockYeomanOutput(myFileSystem)

    // launch.json already exists
    expect(mainFile in myFileSystem).toEqual(true)
    // backup does not exist
    expect(backupFile in myFileSystem).toEqual(false)

    await vsCodeConfig.update(props)

    expect(fs.existsSync).toHaveBeenCalled()
    expect(fs.moveSync).toHaveBeenCalled()

    // still exists, but is generated
    expect(mainFile in myFileSystem).toEqual(true)
    expect(myFileSystem[mainFile].toString()).toEqual('generated-content')
    // check backup is copied
    expect(backupFile in myFileSystem).toEqual(true)
    expect(myFileSystem[backupFile].toString()).toEqual('main-content')
  })

  test('launch.json exists, backup exists (do not overwrite backup)', async () => {
    const myFileSystem = createFileSystem({
      [mainFile]: 'main-content',
      [backupFile]: 'backup-content'
    })
    mockYeomanOutput(myFileSystem)

    // launch.json already exists
    expect(mainFile in myFileSystem).toEqual(true)
    // backup already exists
    expect(backupFile in myFileSystem).toEqual(true)

    await vsCodeConfig.update(props)

    // still exists, but is generated
    expect(mainFile in myFileSystem).toEqual(true)
    expect(myFileSystem[mainFile].toString()).toEqual('generated-content')
    // check backup is *not* copied over
    expect(backupFile in myFileSystem).toEqual(true)
    expect(myFileSystem[backupFile].toString()).toEqual('backup-content')
  })
})

describe('cleanup()', () => {
  const config = { ...createAppConfig().application, envFile: 'my.env' }
  const vsCodeConfig = vscode(config)
  const { backupFile, mainFile } = vsCodeConfig.files()

  test('launch.json does not exist, backup does not exist (do nothing)', () => {
    const myFileSystem = createFileSystem()

    // launch.json does not exist
    expect(mainFile in myFileSystem).toEqual(false)
    // backup already exists
    expect(backupFile in myFileSystem).toEqual(false)

    vsCodeConfig.cleanup()

    // nothing should exist still
    expect(mainFile in myFileSystem).toEqual(false)
    expect(backupFile in myFileSystem).toEqual(false)
  })

  test('launch.json exists, backup does not exist (remove launch.json, .vscode folder empty and is deleted)', () => {
    const vscodeFolder = path.dirname(mainFile)
    const myFileSystem = createFileSystem({
      [mainFile]: 'main-content',
      [vscodeFolder]: [] // nothing in it
    })

    // launch.json exists
    expect(mainFile in myFileSystem).toEqual(true)
    // backup does not exist
    expect(backupFile in myFileSystem).toEqual(false)

    vsCodeConfig.cleanup()

    // launch.json and the backup file should not exist
    expect(mainFile in myFileSystem).toEqual(false)
    expect(backupFile in myFileSystem).toEqual(false)
    // the .vscode folder should be deleted as well (since there are no other contents)
    expect(fs.existsSync(vscodeFolder)).toBe(false)
  })

  test('launch.json exists, backup does not exist (remove launch.json, .vscode folder not empty and is not deleted)', () => {
    const vscodeFolder = path.dirname(mainFile)
    const someOtherFileInVsCodeFolder = path.join(vscodeFolder, 'some-file')

    const myFileSystem = createFileSystem({
      [mainFile]: 'main-content',
      [vscodeFolder]: [someOtherFileInVsCodeFolder],
      [someOtherFileInVsCodeFolder]: 'some-content'
    })

    // launch.json exists
    expect(mainFile in myFileSystem).toEqual(true)
    // backup does not exist
    expect(backupFile in myFileSystem).toEqual(false)

    vsCodeConfig.cleanup()

    // launch.json and the backup file should not exist
    expect(mainFile in myFileSystem).toEqual(false)
    expect(backupFile in myFileSystem).toEqual(false)
    // if there are any other content in .vscode, it is not deleted
    expect(fs.existsSync(vscodeFolder)).toBe(true)
    expect(someOtherFileInVsCodeFolder in myFileSystem).toEqual(true)
  })

  test('launch.json exists, backup exists (restore backup)', () => {
    const myFileSystem = createFileSystem({
      [mainFile]: 'main-content',
      [backupFile]: 'backup-content'
    })

    // launch.json exists
    expect(mainFile in myFileSystem).toEqual(true)
    // backup exists
    expect(backupFile in myFileSystem).toEqual(true)

    vsCodeConfig.cleanup()

    // launch.json restored from backup
    expect(mainFile in myFileSystem).toEqual(true)
    expect(myFileSystem[mainFile].toString()).toEqual('backup-content')
    // backup should not exist
    expect(backupFile in myFileSystem).toEqual(false)
  })
})
