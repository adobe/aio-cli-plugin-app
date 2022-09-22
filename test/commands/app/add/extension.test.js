/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const TheCommand = require('../../../../src/commands/app/add/extension')
const TemplatesCommand = require('../../../../src/TemplatesCommand')
const dataMocks = require('../../../data-mocks/config-loader')

jest.mock('@adobe/aio-lib-core-config')

jest.mock('fs-extra')
jest.mock('inquirer', () => ({
  registerPrompt: jest.fn(),
  prompt: jest.fn()
}))

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
  command.config = {
    runCommand: jest.fn()
  }

  command.selectTemplates = jest.fn()
  command.selectTemplates.mockResolvedValue([])
  command.getTemplates = jest.fn()
  command.getTemplates.mockResolvedValue([])
  command.installTemplates = jest.fn()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof TemplatesCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

test('bad flags', async () => {
  command.argv = ['--wtf']
  await expect(() => command.run()).rejects.toThrow('Unexpected argument: --wtf\nSee more help with --help')
})

test('--yes with no extension', async () => {
  command.argv = ['--yes']
  await expect(command.run()).rejects.toThrow('--extension= must also be provided when using --yes')
})

test('--yes', async () => {
  const installOptions = {
    useDefaultValues: true,
    installNpm: true,
    templates: ['@adobe/my-extension']
  }

  command.argv = ['--yes', '--extension', 'dx/excshell/1']
  command.getTemplates.mockResolvedValue([
    {
      name: '@adobe/my-extension',
      extensions: [
        { extensionPointId: 'dx/excshell/1' }
      ]
    }
  ])

  await command.run()
  expect(command.installTemplates).toBeCalledWith(installOptions)
})

test('--yes --no-install', async () => {
  const installOptions = {
    useDefaultValues: true,
    installNpm: false,
    templates: ['@adobe/my-extension']
  }

  command.argv = ['--yes', '--extension', 'dx/excshell/1', '--no-install']
  command.getTemplates.mockResolvedValue([
    {
      name: '@adobe/my-extension',
      extensions: [
        { extensionPointId: 'dx/excshell/1' }
      ]
    }
  ])

  await command.run()
  expect(command.installTemplates).toBeCalledWith(installOptions)
})

test('--no-install', async () => {
  const installOptions = {
    useDefaultValues: false,
    installNpm: false,
    templates: ['@adobe/my-extension']
  }

  command.argv = ['--no-install']
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toBeCalledWith(installOptions)
})

test('no flags', async () => {
  const installOptions = {
    useDefaultValues: false,
    installNpm: true,
    templates: ['@adobe/my-extension']
  }

  command.argv = []
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toBeCalledWith(installOptions)
})

test('no templates selected', async () => {
  command.argv = []
  command.selectTemplates.mockResolvedValue([])

  await expect(command.run()).rejects.toThrow('No extensions were chosen to be installed.')
})

test('given extension already implemented', async () => {
  command.argv = ['--no-install', '--extension', 'application']

  await expect(command.run()).rejects.toThrow('\'application\' is/are already implemented by this project')
})

test('invalid extension', async () => {
  const extName = 'invalidextension'
  command.argv = ['--no-install', '--extension', extName]
  command.getTemplates.mockResolvedValue([
    {
      name: '@adobe/my-extension',
      extensions: [
        { extensionPointId: 'dx/excshell/1' }
      ]
    }
  ])

  await expect(command.run()).rejects.toThrow(`Extension(s) '${extName}' not found in the Template Registry.`)
})
