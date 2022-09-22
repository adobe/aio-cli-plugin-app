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
const TheCommand = require('../../../../src/commands/app/add/web-assets')
const TemplatesCommand = require('../../../../src/TemplatesCommand')
const dataMocks = require('../../../data-mocks/config-loader')

jest.mock('@adobe/aio-lib-core-config')
jest.mock('inquirer', () => ({
  registerPrompt: jest.fn(),
  prompt: jest.fn()
}))

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
  command.getFullConfig.mockReturnValue({
    packagejson: {
      version: '1.0.0',
      name: 'legacy-app',
      scripts: {
        'post-app-run': 'echo hello'
      }
    }
  })

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

describe('good flags', () => {
  test('--yes', async () => {
    command.argv = ['--yes']
    await command.run()
  })

  test('--yes --no-install', async () => {
    command.argv = ['--yes', '--no-install']
    await command.run()
  })

  test('--no-install', async () => {
    command.argv = ['--no-install']
    await command.run()
  })

  test('--extension', async () => {
    command.argv = ['--extension', 'application']
    await command.run([])
  })

  test('no flags', async () => {
    await command.run([])
  })

  test('no flags, service code defined in config', async () => {
    await command.run([])
  })

  test('multiple ext configs', async () => {
    command.getAppExtConfigs.mockReturnValue({ application: 'value', excshell: 'value' })
    await expect(command.run()).rejects.toThrow('Please use the \'-e\' flag to specify to which implementation you want to add web-assets to.')
  })
})
