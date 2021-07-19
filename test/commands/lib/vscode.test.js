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
        // launch.json does not exist
        expect(mainFile in global.fakeFileSystem.files()).toEqual(false)
        // backup does not exist
        expect(backupFile in global.fakeFileSystem.files()).toEqual(false)
        
        await vsCodeConfig.update(props)
        
        // now launch.json exists
        expect(mainFile in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()[mainFile].toString()).toEqual('generated-content')
        // backup should not exist
        expect(backupFile in global.fakeFileSystem.files()).toEqual(false)
    })
    
    test('launch.json exists, backup does not exist (copy to backup)', async () => {
        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content'
        })

        // launch.json already exists
        expect(mainFile in global.fakeFileSystem.files()).toEqual(true)
        // backup does not exist
        expect(backupFile in global.fakeFileSystem.files()).toEqual(false)

        await vsCodeConfig.update(props)
        
        // still exists, but is generated
        expect(mainFile in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()[mainFile].toString()).toEqual('generated-content')
        // check backup is copied
        expect(backupFile in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()[backupFile].toString()).toEqual('main-content')
    })
    
    test('launch.json exists, backup exists (do not overwrite backup)', async () => {
        global.fakeFileSystem.addJson({
            [mainFile]: 'main-content',
            [backupFile]: 'backup-content'
        })

        // launch.json already exists
        expect(mainFile in global.fakeFileSystem.files()).toEqual(true)
        // backup already exists
        expect(backupFile in global.fakeFileSystem.files()).toEqual(true)

        await vsCodeConfig.update(props)
        
        // still exists, but is generated
        expect(mainFile in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()[mainFile].toString()).toEqual('generated-content')
        // check backup is *not* copied over
        expect(backupFile in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()[backupFile].toString()).toEqual('backup-content')
    })
})

describe('cleanup()', () => {
    const props = { frontEndUrl: 'https://foo.bar' }
    const config = { root: '/my-root'}
    const vsCodeConfig = vscode(config)
    const { backupFile, mainFile } = vsCodeConfig.files()

    test('launch.json does not exist, backup does not exist', () => {

    })
})

