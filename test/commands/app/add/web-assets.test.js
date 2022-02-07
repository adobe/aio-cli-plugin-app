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
const fs = require('fs-extra')

const TheCommand = require('../../../../src/commands/app/add/web-assets')
const BaseCommand = require('../../../../src/BaseCommand')
const generators = require('@adobe/generator-aio-app')
const dataMocks = require('../../../data-mocks/config-loader')
const path = require('path')

const config = require('@adobe/aio-lib-core-config')
jest.mock('@adobe/aio-lib-core-config')

jest.mock('fs-extra')

jest.mock('../../../../src/lib/app-helper.js')
const helpers = require('../../../../src/lib/app-helper.js')

jest.mock('yeoman-environment')
const yeoman = require('yeoman-environment')

const mockInstantiate = jest.fn()
const mockRunGenerator = jest.fn()
yeoman.createEnv.mockReturnValue({
  instantiate: mockInstantiate,
  runGenerator: mockRunGenerator
})

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
  mockInstantiate.mockReset()
  mockRunGenerator.mockReset()
  yeoman.createEnv.mockClear()
  helpers.installPackages.mockClear()
  fs.ensureDirSync.mockClear()
  config.get.mockReset()
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
    await expect(TheCommand.run(['--wtf'])).rejects.toThrow('Unexpected argument')
  })
})

describe('template module cannot be registered', () => {
  test('unknown error', async () => {
    mockInstantiate.mockImplementation(() => { throw new Error('some error') })
    command.argv = []
    console.log(command.getAppExtConfigs)
    await expect(command.run()).rejects.toThrow('some error')
  })
})

describe('good flags', () => {
  test('--yes', async () => {
    mockInstantiate.mockReturnValueOnce('gen')
    command.argv = ['--yes']
    await command.run()
    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators['add-web-assets'], {
      options: {
        'skip-prompt': true,
        'project-name': 'legacy-app',
        'web-src-folder': path.resolve('/web-src'),
        'adobe-services': undefined,
        'skip-install': true
      }
    })
    expect(mockRunGenerator).toHaveBeenCalledWith('gen')
    expect(helpers.installPackages).toHaveBeenCalledTimes(1)
  })

  test('--yes --skip-install', async () => {
    command.argv = ['--yes', '--skip-install']
    await command.run()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators['add-web-assets'], {
      options: {
        'skip-prompt': true,
        'project-name': 'legacy-app',
        'web-src-folder': path.resolve('/web-src'),
        'adobe-services': undefined,
        'skip-install': true
      }
    })
    expect(helpers.installPackages).toHaveBeenCalledTimes(0)
  })

  test('--skip-install', async () => {
    command.argv = ['--skip-install']
    await command.run()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators['add-web-assets'], {
      options: {
        'skip-prompt': false,
        'project-name': 'legacy-app',
        'web-src-folder': path.resolve('/web-src'),
        'adobe-services': undefined,
        'skip-install': true
      }
    })
    expect(helpers.installPackages).toHaveBeenCalledTimes(0)
  })

  test('--extension', async () => {
    command.argv = ['--extension', 'application']
    await command.run([])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators['add-web-assets'], {
      options: {
        'skip-prompt': false,
        'project-name': 'legacy-app',
        'web-src-folder': path.resolve('/web-src'),
        'adobe-services': undefined,
        'skip-install': true
      }
    })
  })

  test('no flags', async () => {
    await command.run([])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators['add-web-assets'], {
      options: {
        'skip-prompt': false,
        'project-name': 'legacy-app',
        'web-src-folder': path.resolve('/web-src'),
        'adobe-services': undefined,
        'skip-install': true
      }
    })
  })

  test('no flags, service code defined in config', async () => {
    helpers.servicesToGeneratorInput.mockReturnValueOnce('CampaignSDK,AdobeAnalyticsSDK')
    await command.run([])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators['add-web-assets'], {
      options: {
        'skip-prompt': false,
        'project-name': 'legacy-app',
        'web-src-folder': path.resolve('/web-src'),
        'adobe-services': 'CampaignSDK,AdobeAnalyticsSDK',
        'skip-install': true
      }
    })
  })

  test('multiple ext configs', async () => {
    command.getAppExtConfigs.mockReturnValue({ application: 'value', excshell: 'value' })
    await expect(command.run()).rejects.toThrow('Please use the \'-e\' flag to specify to which implementation you want to add web-assets to.')
  })
})
