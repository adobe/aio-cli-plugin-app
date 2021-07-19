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

jest.mock('@adobe/generator-aio-console/lib/console-cli.js')
const LibConsoleCLI = require('@adobe/generator-aio-console/lib/console-cli.js')
const mockConsoleCLIInstance = {}
LibConsoleCLI.init.mockResolvedValue(mockConsoleCLIInstance)

jest.mock('../../../../src/lib/app-helper.js')
const helpers = require('../../../../src/lib/app-helper.js')

const createFullConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig)
  return appConfig
}

const extPointList = [
  {
    serviceCode: 'dx',
    name: 'excshell',
    version: '1.0.0',
    idVer: 1,
    operations: ['view']
  },
  {
    serviceCode: 'dx',
    name: 'asset-compute',
    version: '1.0.0',
    idVer: 1,
    operations: ['apply']
  }
]
const fakeAioConfig = {
  console: {
    project: {
      org_id: 'fakeOrg'
    }
  }
}

beforeEach(() => {
  helpers.getAllExtensionPoints.mockReset()
  helpers.getFullExtensionName.mockReset()
})

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
  const extOutPut = [
    {
      name: 'dx/excshell/1',
      operations: ['view']
    },
    {
      name: 'dx/asset-compute/1',
      operations: ['apply']
    }
  ]
  beforeEach(() => {
    helpers.getAllExtensionPoints.mockResolvedValueOnce(extPointList)
    helpers.getCliInfo.mockResolvedValue({ accessToken: 'fake', env: 'prod' })
    command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getFullConfig = jest.fn()
    const appConfig = createFullConfig({})
    appConfig.aio = fakeAioConfig
    command.getFullConfig.mockReturnValue(appConfig)
    jest.spyOn(helpers, 'getFullExtensionName').mockImplementation((xp) => {
      return xp.serviceCode + '/' + xp.name + '/' + xp.idVer
    })
  })

  test('get all extension points', async () => {
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('Extensions Points'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('dx/excshell/1'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('operations'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('view'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('dx/asset-compute/1'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('operations'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('apply'))
  })

  test('get all extension points --json', async () => {
    command = new TheCommand(['--json'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getFullConfig = jest.fn()
    const appConfig = createFullConfig({})
    appConfig.aio = fakeAioConfig
    command.getFullConfig.mockReturnValue(appConfig)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(JSON.stringify(extOutPut))
  })

  test('get all extension points --yml', async () => {
    command = new TheCommand(['--yml'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.getFullConfig = jest.fn()
    const appConfig = createFullConfig({})
    appConfig.aio = fakeAioConfig
    command.getFullConfig.mockReturnValue(appConfig)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(yaml.safeDump(extOutPut))
  })

  test('get all extension points empty list', async () => {
    helpers.getAllExtensionPoints.mockReset()
    helpers.getAllExtensionPoints.mockResolvedValueOnce([])
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('No extension points found'))
  })

  test('get all extension points undefined', async () => {
    helpers.getAllExtensionPoints.mockReset()
    helpers.getAllExtensionPoints.mockResolvedValueOnce(undefined)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('No extension points found'))
  })
})
