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

// enable the fake filesystem mocks
global.mockFs()

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

beforeEach(() => {
    global.fakeFileSystem.reset()
    mockYeomanInstantiate.mockClear()
    mockYeomanRunGenerator.mockImplementation(() => {
        global.fakeFileSystem.addJson({
            '.vscode/launch.json': 'generated-content'
        })
    })
})

test('exports', () => {
    const vsCodeConfig = vscode({})

    expect(typeof vscode).toEqual('function')
    expect(typeof vsCodeConfig.update).toEqual('function')
    expect(typeof vsCodeConfig.update).toEqual('function')
    expect(typeof vsCodeConfig.cleanup).toEqual('function')
})

test('files()', () => {
    const config = { root: '/my-root'}
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

    test('launch.json does not exist, backup does not exist (no backup copy)', async () => {
        let globalFs = global.fakeFileSystem.files()

        // launch.json does not exist
        expect(mainFile in globalFs).toEqual(false)
        // backup does not exist
        expect(backupFile in globalFs).toEqual(false)
        
        await vsCodeConfig.update(props)
        
        globalFs = global.fakeFileSystem.files()

        // now launch.json exists
        expect(mainFile in globalFs).toEqual(true)
        expect(globalFs[mainFile].toString()).toEqual('generated-content')
        // backup should not exist
        expect(backupFile in globalFs).toEqual(false)
    })
    
    test('launch.json exists, backup does not exist (copy to backup)', async () => {
        let globalFs

        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content'
        })

        globalFs = global.fakeFileSystem.files()

        // launch.json already exists
        expect(mainFile in globalFs).toEqual(true)
        // backup does not exist
        expect(backupFile in globalFs).toEqual(false)

        await vsCodeConfig.update(props)
        
        globalFs = global.fakeFileSystem.files()

        // still exists, but is generated
        expect(mainFile in globalFs).toEqual(true)
        expect(globalFs[mainFile].toString()).toEqual('generated-content')
        // check backup is copied
        expect(backupFile in globalFs).toEqual(true)
        expect(globalFs[backupFile].toString()).toEqual('main-content')
    })
    
    test('launch.json exists, backup exists (do not overwrite backup)', async () => {
        let globalFs

        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content',
            [backupFile]: 'backup-content'
        })

        globalFs = global.fakeFileSystem.files()

        // launch.json already exists
        expect(mainFile in globalFs).toEqual(true)
        // backup already exists
        expect(backupFile in globalFs).toEqual(true)

        await vsCodeConfig.update(props)
        
        globalFs = global.fakeFileSystem.files()

        // still exists, but is generated
        expect(mainFile in globalFs).toEqual(true)
        expect(globalFs[mainFile].toString()).toEqual('generated-content')
        // check backup is *not* copied over
        expect(backupFile in globalFs).toEqual(true)
        expect(globalFs[backupFile].toString()).toEqual('backup-content')
    })
})

describe('cleanup()', () => {
    const config = { ...createAppConfig().application, envFile: 'my.env' }
    const vsCodeConfig = vscode(config)
    const { backupFile, mainFile } = vsCodeConfig.files()

    test('launch.json does not exist, backup does not exist (do nothing)', () => {
        let globalFs = global.fakeFileSystem.files()

        // launch.json does not exist
        expect(mainFile in globalFs).toEqual(false)
        // backup already exists
        expect(backupFile in globalFs).toEqual(false)

        vsCodeConfig.cleanup()

        globalFs = global.fakeFileSystem.files()

        // nothing should exist still
        expect(mainFile in globalFs).toEqual(false)
        expect(backupFile in globalFs).toEqual(false)
    })

    test('launch.json exists, backup does not exist (remove launch.json, .vscode folder empty and is deleted)', () => {
        let globalFs
        const vscodeFolder = path.dirname(mainFile)

        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content'
        })

        globalFs = global.fakeFileSystem.files()

        // launch.json exists
        expect(mainFile in globalFs).toEqual(true)
        // backup does not exist
        expect(backupFile in globalFs).toEqual(false)

        vsCodeConfig.cleanup()

        globalFs = global.fakeFileSystem.files()

        // launch.json and the backup file should not exist
        expect(mainFile in globalFs).toEqual(false)
        expect(backupFile in globalFs).toEqual(false)
        // the .vscode folder should be deleted as well (since there are no other contents)
        expect(fs.existsSync(vscodeFolder)).toBe(false)
    })

    test('launch.json exists, backup does not exist (remove launch.json, .vscode folder not empty and is not deleted)', () => {
        let globalFs
        const vscodeFolder = path.dirname(mainFile)
        const someOtherFileInVsCodeFolder = path.join(vscodeFolder, 'some-file')

        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content',
            [someOtherFileInVsCodeFolder]: 'some-content'
        })

        globalFs = global.fakeFileSystem.files()

        // launch.json exists
        expect(mainFile in globalFs).toEqual(true)
        // backup does not exist
        expect(backupFile in globalFs).toEqual(false)

        vsCodeConfig.cleanup()

        globalFs = global.fakeFileSystem.files()

        // launch.json and the backup file should not exist
        expect(mainFile in globalFs).toEqual(false)
        expect(backupFile in globalFs).toEqual(false)
        // if there are any other content in .vscode, it is not deleted
        expect(fs.existsSync(vscodeFolder)).toBe(true)
        expect(someOtherFileInVsCodeFolder in globalFs).toEqual(true)
    })

    test('launch.json exists, backup exists (restore backup)', () => {
        let globalFs
    
        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content',
            [backupFile]: 'backup-content'
        })

        globalFs = global.fakeFileSystem.files()

        // launch.json exists
        expect(mainFile in globalFs).toEqual(true)
        // backup exists
        expect(backupFile in globalFs).toEqual(true)

        vsCodeConfig.cleanup()

        globalFs = global.fakeFileSystem.files()

        // launch.json restored from backup
        expect(mainFile in globalFs).toEqual(true)
        expect(globalFs[mainFile].toString()).toEqual('backup-content')
        // backup should not exist
        expect(backupFile in globalFs).toEqual(false)
    })

})

