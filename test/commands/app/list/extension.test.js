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

const TheCommand = require('../../../../src/commands/app/list/extension')
const BaseCommand = require('../../../../src/BaseCommand')
const yaml = require('js-yaml')
const dataMocks = require('../../../data-mocks/config-loader')

jest.mock('@adobe/generator-aio-console/lib/console-cli.js')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli.js')
const mockConsoleCLIInstance = {}
LibConsoleCLI.init.mockResolvedValue(mockConsoleCLIInstance)

jest.mock('../../../../src/lib/app-helper.js')
const helpers = require('../../../../src/lib/app-helper.js')

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

beforeEach(() => {
  helpers.getFullExtensionName.mockReset()
  jest.restoreAllMocks()
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual(['app:list:ext', 'app:list:extensions'])
})

test('flags', async () => {
  expect(typeof TheCommand.flags.json).toBe('object')
  expect(typeof TheCommand.flags.json.description).toBe('string')

  expect(typeof TheCommand.flags.yml).toBe('object')
  expect(typeof TheCommand.flags.yml.description).toBe('string')
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    jest.spyOn(helpers, 'getFullExtensionName').mockImplementation((xp) => {
      return xp.serviceCode + '/' + xp.name + '/' + xp.idVer
    })
    command.getAppExtConfigs = jest.fn()
  })

  test('list all extensions', async () => {
    command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig, 'app-exc-nui'))
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Extensions'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('dx/asset-compute/worker/1'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('apply'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('dx/excshell/1'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('view'))
  })

  test('list all extension --json', async () => {
    command = new TheCommand(['--json'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getAppExtConfigs = jest.fn()
    command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig, 'exc'))
    const expectedResult = {
      'dx/excshell/1':
      {
        operations:
      { view: [{ impl: 'index.html', src: '/src/dx-excshell-1/web-src' }] }
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(JSON.stringify(expectedResult))
  })

  test('list all extension --yml', async () => {
    command = new TheCommand(['--yml'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getAppExtConfigs = jest.fn()
    command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig, 'exc'))
    const expectedResult = {
      'dx/excshell/1':
      {
        operations:
      { view: [{ impl: 'index.html', src: '/src/dx-excshell-1/web-src' }] }
      }
    }
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(yaml.safeDump(expectedResult))
  })

  test('list all extension points legacy app', async () => {
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getAppExtConfigs = jest.fn()
    command.getAppExtConfigs.mockReturnValue(createAppConfig(command.appConfig))
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('No extensions found'))
  })
})
