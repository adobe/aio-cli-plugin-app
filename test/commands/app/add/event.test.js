/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../../src/commands/app/add/event')
const BaseCommand = require('../../../../src/BaseCommand')
const dataMocks = require('../../../data-mocks/config-loader')

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}
let command
beforeEach(() => {
  command = new TheCommand([])
  command.getAppExtConfigs = jest.fn()
  command.getAppExtConfigs.mockResolvedValue(createAppConfig(command.appConfig))
  command.getFullConfig = jest.fn()
  command.installTemplates = jest.fn()
  command.getFullConfig.mockResolvedValue({
    packagejson: {
      version: '1.0.0',
      name: 'legacy-app',
      scripts: {
        'post-app-run': 'echo hello'
      }
    }
  })
  command.getConfigFileForKey = jest.fn(async () => ({}))
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

describe('bad flags', () => {
  test('unknown', async () => {
    await expect(TheCommand.run(['--wtf'])).rejects.toThrow('Nonexistent flag')
  })
})

describe('good flags', () => {
  test('no templates selected', async () => {
    command.selectTemplates = jest.fn()
    command.selectTemplates.mockResolvedValue([])
    await expect(command.run()).rejects.toThrow('No events templates were chosen to be installed.')
  })

  test('one events template selected', async () => {
    const templateOptions = {
      'skip-prompt': false,
      'action-folder': 'myactions',
      'config-path': undefined,
      'full-key-to-manifest': 'undefined.runtimeManifest',
      'full-key-to-events-manifest': 'undefined.events'
    }
    const installOptions = {
      useDefaultValues: false,
      installNpm: true,
      templates: ['@adobe/generator-add-events-generic'],
      templateOptions
    }
    command.selectTemplates = jest.fn()
    command.selectTemplates.mockResolvedValue(['@adobe/generator-add-events-generic'])
    await command.run()
    expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
  })

  test('--extension', async () => {
    command.argv = ['--extension', 'application']
    const templateOptions = {
      'skip-prompt': false,
      'action-folder': 'myactions',
      'config-path': undefined,
      'full-key-to-manifest': 'undefined.runtimeManifest',
      'full-key-to-events-manifest': 'undefined.events'
    }
    const installOptions = {
      useDefaultValues: false,
      installNpm: true,
      templates: ['@adobe/generator-add-events-generic'],
      templateOptions
    }
    command.selectTemplates = jest.fn()
    command.selectTemplates.mockResolvedValue(['@adobe/generator-add-events-generic'])
    await command.run()
    expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
    expect(await command.getConfigFileForKey).toHaveBeenCalledWith('application.events', { 'config-validation': true, extension: ['application'], install: true, yes: false })
  })

  test('multiple ext configs', async () => {
    command.getAppExtConfigs.mockResolvedValue({ application: 'value', excshell: 'value' })
    await expect(command.run()).rejects.toThrow('Please use the \'-e\' flag to specify to which implementation you want to add events to.')
  })
})
