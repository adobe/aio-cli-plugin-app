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
const fs = require('fs-extra')
const TheCommand = require('../../../../src/commands/app/delete/extension')
const BaseCommand = require('../../../../src/BaseCommand')
const cloneDeep = require('lodash.clonedeep')

const dataMocks = require('../../../data-mocks/config-loader')

jest.mock('../../../../src/lib/app-helper.js')
const { deleteUserConfig } = require('../../../../src/lib/app-helper.js')
const { createPromptModule } = require('inquirer')

jest.mock('fs-extra')
jest.mock('inquirer', () => {
  return {
    Separator: class {}
  }
})

const createFullConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig)
  return appConfig
}
const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

let command

beforeEach(() => {
  command = new TheCommand([])

  command.getAppExtConfigs = jest.fn()
  command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig))
  command.getFullConfig = jest.fn()
  command.getFullConfig.mockReturnValue(createFullConfig({}))
  command.getConfigFileForKey = jest.fn()
  command.getConfigFileForKey.mockReturnValue({})
  command.prompt = jest.fn()
  command.prompt.mockReturnValue({ res: [{ name: 'dx/excshell/1' }] })

  fs.ensureDirSync.mockClear()
  fs.removeSync.mockClear()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

describe('bad flags args', () => {
  test('unknown arg', async () => {
    command.argv = ['fakeActionName']
    await expect(command.run()).rejects.toThrow('Unexpected argument')
  })

  test('unknown flag --wtf', async () => {
    command.argv = ['--wtf']
    await expect(command.run()).rejects.toThrow('Unexpected argument')
  })

  test('unknown flag --yes without extension', async () => {
    command.argv = ['--yes']
    await expect(command.run()).rejects.toThrow('--extension= must also be provided')
  })
})

/*
  - no -e should prompt with choices
*/

describe('implements', () => {
  test('empty - none to delete', async () => {
    const mockConfig = createFullConfig({})
    mockConfig.implements = []
    command.getFullConfig.mockReturnValue(mockConfig)
    command.argv = ['-e', 'zoom-zoom']
    await expect(command.run()).rejects.toThrow('There are no implementations')
    expect(deleteUserConfig).not.toHaveBeenCalled()
  })

  // requesting to delete an extension that is not in the implements list is covered by BaseCommand

  test('prompts for extension, prompt returns false, does not delete anything and rejects', async () => {
    const mockConfig = createFullConfig({})
    mockConfig.implements = ['dx/excshell/1']
    command.prompt.mockReturnValueOnce({ res: [{ name: 'dx/excshell/1' }] })
      .mockReturnValueOnce({ deleteExtensions: false })
    command.getFullConfig.mockReturnValue(mockConfig)
    command.argv = []
    await expect(command.run()).rejects.toThrow('aborting..')
    expect(command.prompt).toHaveBeenCalledTimes(2)
    expect(fs.removeSync).not.toHaveBeenCalled()
  })

  test('prompts for extension, prompt returns true', async () => {
    const mockConfig = createFullConfig({})
    mockConfig.implements = ['dx/excshell/1']
    command.prompt.mockReturnValueOnce({ res: [{ name: 'dx/excshell/1' }] })
      .mockReturnValueOnce({ deleteExtensions: true })
    command.getFullConfig.mockReturnValue(mockConfig)
    command.argv = []
    await command.run()
    expect(command.prompt).toHaveBeenCalledTimes(2)
    // wanna go down the rabbithole?
    // .arrayContaining([{"choices": expect.arrayContaining([expect.toMatchObject({name:'DX Experience Cloud SPA v1'})])}])
  })
})

describe('good args', () => {
  test('should succeed, delete web/action source and userConfig', async () => {
    command.argv = ['--yes', '-e', 'application']
    command.getConfigFileForKey.mockReturnValueOnce({ file: 'file-to-delete' })
      .mockReturnValueOnce({ data: 'configData' })

    command.getAppExtConfigs.mockReturnValueOnce({
      a: {
        app: {
          hasBackend: true,
          hasFrontend: true
        },
        actions: {
          src: 'fake-action-source-path'
        },
        web: {
          src: 'fake-web-source-path'
        }
      }
    })

    await command.run()
    expect(fs.removeSync).toHaveBeenCalledWith('file-to-delete')
    expect(fs.removeSync).toHaveBeenCalledWith('fake-action-source-path')
    expect(fs.removeSync).toHaveBeenCalledWith('fake-web-source-path')
    expect(deleteUserConfig).toHaveBeenCalledWith({ data: 'configData' })
  })

  test('should succeed, delete file+userConfig - hasFrontend:false', async () => {
    command.argv = ['--yes', '-e', 'application']
    command.getConfigFileForKey.mockReturnValueOnce({ file: 'file-to-delete' })
      .mockReturnValueOnce({ data: 'configData' })

    command.getAppExtConfigs.mockReturnValueOnce({
      a: {
        app: {
          hasBackend: true,
          hasFrontend: false
        },
        actions: {
          src: 'fake-action-source-path'
        }
      }
    })

    await command.run()
    expect(fs.removeSync).toHaveBeenCalledWith('file-to-delete')
    expect(fs.removeSync).toHaveBeenCalledWith('fake-action-source-path')
    expect(fs.removeSync).not.toHaveBeenCalledWith('fake-web-source-path')
    expect(deleteUserConfig).toHaveBeenCalledWith({ data: 'configData' })
  })

  test('should succeed, delete file+userConfig - hasBackend:false', async () => {
    command.argv = ['--yes', '-e', 'application']
    command.getConfigFileForKey.mockReturnValueOnce({ file: 'file-to-delete' })
      .mockReturnValueOnce({ data: 'configData' })

    command.getAppExtConfigs.mockReturnValueOnce({
      a: {
        app: {
          hasBackend: false,
          hasFrontend: true
        },
        web: {
          src: 'fake-web-source-path'
        }
      }
    })

    await command.run()
    expect(fs.removeSync).toHaveBeenCalledWith('file-to-delete')
    expect(fs.removeSync).not.toHaveBeenCalledWith('fake-action-source-path')
    expect(fs.removeSync).toHaveBeenCalledWith('fake-web-source-path')
    expect(deleteUserConfig).toHaveBeenCalledWith({ data: 'configData' })
  })
})
