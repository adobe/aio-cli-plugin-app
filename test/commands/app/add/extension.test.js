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

const TheCommand = require('../../../../src/commands/app/add/extension')
const BaseCommand = require('../../../../src/BaseCommand')
const generators = require('@adobe/generator-aio-app')
const { implPromptChoices: availableImplementations } = require('../../../../src/lib/defaults')
const dataMocks = require('../../../data-mocks/config-loader')

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
// console.log(createAppConfig())
beforeEach(() => {
  command = new TheCommand([])
  command.getAppExtConfigs = jest.fn()
  command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig))
  command.getFullConfig = jest.fn()
  command.getFullConfig.mockReturnValue(createFullConfig({}))
  command.getConfigFileForKey = jest.fn()
  command.getConfigFileForKey.mockReturnValue({})
  command.prompt = jest.fn()
  command.prompt.mockReturnValue({res: [{"name":"dx/excshell/1","requiredServices":[], "generator": generators.extensions['dx/excshell/1']}]})
  mockInstantiate.mockReset()
  mockRunGenerator.mockReset()
  yeoman.createEnv.mockClear()
  helpers.installPackages.mockClear()
  helpers.servicesToGeneratorInput.mockClear()
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
    await expect(command.run()).rejects.toThrow('some error')
  })
})

describe('good flags', () => {
  test('--yes with no extension', async () => {
    command.argv = ['--yes']
    await expect(command.run()).rejects.toThrow('--extension= must also be provided when using --yes')
  })

  test('--yes', async () => {
    command.argv = ['--yes', '--extension', 'dx/excshell/1']
    mockInstantiate.mockReturnValueOnce('extGen')
    await command.run()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators.extensions['dx/excshell/1'], {options: {
      'skip-prompt': true,
      'force': true
    }})
    expect(mockRunGenerator).toHaveBeenCalledWith('extGen')
    expect(helpers.installPackages).toHaveBeenCalledTimes(1)
  })

  test('--yes --skip-install', async () => {
    command.argv = ['--yes', '--extension', 'dx/excshell/1', '--skip-install']
    await command.run()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators.extensions['dx/excshell/1'], {options: {
      'skip-prompt': true,
      'force': true
    }})
    expect(helpers.installPackages).toHaveBeenCalledTimes(0)
  })

  test('--skip-install', async () => {
    command.argv = ['--skip-install']
    await command.run()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators.extensions['dx/excshell/1'], {options: {
      'skip-prompt': false,
      'force': true
    }})
  })

  test('no flags', async () => {
    await command.run()

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators.extensions['dx/excshell/1'], {options: {
      'skip-prompt': false,
      'force': true
    }})
  })

  test('required services not added', async () => {
    command.argv = ['--skip-install', '--extension', 'dx/asset-compute/worker/1']
    command.warn = jest.fn()
    config.get.mockImplementation(c => {
      if (c === 'project.org.details.services') {
        // supported services
        return [{ code: 'CampaignSDK' }, { code: 'AdobeAnalyticsSDK' }, { code: 'AnotherOneSDK' }]
      } else if (c === 'services') {
        // added to workspace
        return [{ code: 'CampaignSDK' }, { code: 'AdobeAnalyticsSDK' }]
      }
      return undefined
    })
    await command.run()
    expect(command.warn).toHaveBeenCalledWith('Please add missing services \'AssetComputeSDK\' required by \'dx/asset-compute/worker/1\'')

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockInstantiate).toHaveBeenCalledWith(generators.extensions['dx/asset-compute/worker/1'], {options: {
      'skip-prompt': false,
      'force': true
    }})
  })

  test('all extensions already implemented', async () => {
    command.argv = ['--skip-install']
    command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.getFullConfig.mockReturnValue(createFullConfig({}, 'app-exc-nui'))
    
    await expect(command.run()).rejects.toThrow('All available extensions are already implemented in this project.')
  })

  test('given extension already implemented', async () => {
    command.argv = ['--skip-install', '--extension', 'application']
    
    await expect(command.run()).rejects.toThrow('\'application\' is/are already implemented by this project')
  })

  test('invalid extension', async () => {
    command.argv = ['--skip-install', '--extension', 'invalidextension']
    const availableImplementationNames = availableImplementations.map(i => i.value.name)
    await expect(command.run()).rejects.toThrow(`Invalid extension(s) 'invalidextension', available implementations are '${availableImplementationNames}'`)
  })
})
