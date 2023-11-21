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

const TheCommand = require('../../../../src/commands/app/list/extension-points')
const BaseCommand = require('../../../../src/BaseCommand')
const yaml = require('js-yaml')
const dataMocks = require('../../../data-mocks/config-loader')

jest.mock('@adobe/aio-cli-lib-console')
const LibConsoleCLI = require('@adobe/aio-cli-lib-console')
const mockConsoleCLIInstance = {}
LibConsoleCLI.init.mockResolvedValue(mockConsoleCLIInstance)

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual(['app:list:ext-points', 'app:list:extension-points'])
})

test('flags', async () => {
  expect(typeof TheCommand.flags.json).toBe('object')
  expect(typeof TheCommand.flags.json.description).toBe('string')

  expect(typeof TheCommand.flags.yml).toBe('object')
  expect(typeof TheCommand.flags.yml.description).toBe('string')
})

describe('run', () => {
  let command
  const extOutPut = {
    'dx/excshell/1': {
      operations: ['view']
    },
    'dx/asset-compute/worker/1': {
      operations: ['workerProcess']
    }
  }

  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getAppExtConfigs = jest.fn()
  })

  test('get all extension points', async () => {
    command.getAppExtConfigs.mockResolvedValue(createAppConfig(command.appConfig, 'app-exc-nui'))

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Extensions Points'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('dx/excshell/1'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('operations'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('view'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('dx/asset-compute/worker/1'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('operations'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('workerProcess'))
  })

  test('get all extension points --json', async () => {
    command.getAppExtConfigs.mockResolvedValue(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.argv = ['--json']

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(JSON.stringify(extOutPut))
  })

  test('get all extension points --yml', async () => {
    command.getAppExtConfigs.mockResolvedValue(createAppConfig(command.appConfig, 'app-exc-nui'))
    command.argv = ['--yml']
    command.error = jest.fn()
    command.log = jest.fn()

    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(yaml.dump(extOutPut))
  })
})
