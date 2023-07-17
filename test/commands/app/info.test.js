/*
Copyright 2021 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../src/commands/app/info.js')
const BaseCommand = require('../../../src/BaseCommand.js')
const yaml = require('js-yaml')

const mockConfigLoader = require('@adobe/aio-cli-lib-app-config')
jest.mock('@adobe/aio-cli-lib-app-config')
const getMockConfig = require('../../data-mocks/config-loader')

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('flags', async () => {
  expect(TheCommand.flags).toMatchObject({
    json: expect.any(Object),
    hson: expect.any(Object),
    yml: expect.any(Object),
    mask: expect.any(Object)
  })
})

test('args', async () => {
  expect(TheCommand.args).toBeDefined()
  expect(TheCommand.args).toBeInstanceOf(Object)
})

describe('instance methods', () => {
  let command

  beforeEach(() => {
    command = new TheCommand([])
  })

  describe('run', () => {
    test('exists', async () => {
      expect(command.run).toBeInstanceOf(Function)
    })
  })
})

describe('run', () => {
  const checkHiddenSecrets = (logMock) => {
    expect(logMock).not.toHaveBeenCalledWith(expect.stringContaining(global.fakeConfig.creds.runtime.auth))
    expect(logMock).not.toHaveBeenCalledWith(expect.stringContaining(global.fakeS3Creds.accessKeyId))
    expect(logMock).not.toHaveBeenCalledWith(expect.stringContaining(global.fakeS3Creds.secretAccessKey))
  }

  const checkJunkConfig = (logMock, json) => {
    expect(logMock).not.toHaveBeenCalledWith(expect.stringContaining('includeIndex'))
    expect(json.aio).toBe(undefined)
  }

  test('for exc extension no flags', async () => {
    // mock config
    mockConfigLoader.load.mockResolvedValue(getMockConfig('exc', global.fakeConfig.tvm))

    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    await command.run()
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ allowNoImpl: true })
    expect(command.error).toHaveBeenCalledTimes(0)
    checkHiddenSecrets(command.log)
    const json = JSON.parse(command.log.mock.calls[0][0])
    checkJunkConfig(command.log, json)
  })

  test('json flag', async () => {
    // add s3 credentials to mocked config - to be hidden
    mockConfigLoader.load.mockResolvedValue(
      getMockConfig('exc', global.fakeConfig.tvm, global.extraConfig.s3Creds('dx/excshell/1'))
    )

    const command = new TheCommand(['--json'])
    command.error = jest.fn()
    command.log = jest.fn()
    await command.run()
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ allowNoImpl: true })
    expect(command.error).toHaveBeenCalledTimes(0)
    checkHiddenSecrets(command.log)
    const json = JSON.parse(command.log.mock.calls[0][0])
    checkJunkConfig(command.log, json)
  })

  test('yml flag', async () => {
    // add s3 credentials to mocked config - to be hidden
    mockConfigLoader.load.mockResolvedValue(
      getMockConfig('exc', global.fakeConfig.tvm, global.extraConfig.s3Creds('dx/excshell/1'))
    )
    const command = new TheCommand(['--yml'])
    command.error = jest.fn()
    command.log = jest.fn()
    await command.run()
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ allowNoImpl: true })
    expect(command.error).toHaveBeenCalledTimes(0)
    checkHiddenSecrets(command.log)
    const json = yaml.load(command.log.mock.calls[0][0])
    checkJunkConfig(command.log, json)
  })

  test('for coverage, undefined key to hide', async () => {
    // add s3 credentials to mocked config - to be hidden
    mockConfigLoader.load.mockResolvedValue(
      getMockConfig('exc', global.fakeConfig.tvm, { 'all.dx/excshell/1.ow.auth': undefined })
    )
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    await command.run()
    expect(mockConfigLoader.load).toHaveBeenCalledWith({ allowNoImpl: true })
    expect(command.error).toHaveBeenCalledTimes(0)
    checkHiddenSecrets(command.log)
    const json = JSON.parse(command.log.mock.calls[0][0])
    checkJunkConfig(command.log, json)
  })
})
