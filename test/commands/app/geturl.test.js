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

const TheCommand = require('../../../src/commands/app/get-url')
const BaseCommand = require('../../../src/BaseCommand')

jest.mock('@adobe/aio-app-scripts')
const mockScripts = require('@adobe/aio-app-scripts')()

beforeEach(() => {
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
  expect(TheCommand.aliases).toEqual([])
})

test('flags', async () => {
  expect(typeof TheCommand.flags.cdn).toBe('object')
  expect(typeof TheCommand.flags.cdn.description).toBe('string')

  expect(typeof TheCommand.flags.json).toBe('object')
  expect(typeof TheCommand.flags.json.description).toBe('string')

  expect(typeof TheCommand.flags.hson).toBe('object')
  expect(typeof TheCommand.flags.hson.description).toBe('string')

  expect(typeof TheCommand.flags.yml).toBe('object')
  expect(typeof TheCommand.flags.yml.description).toBe('string')
})

describe('run', () => {
  beforeEach(() => {
    mockScripts.getUrls = mockScripts.logs
    mockScripts.getUrls.mockReset()
  })

  test('get all action urls', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
  })

  test('get empty action urls', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    const retVal = {}
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
  })

  test('get empty action urls -j', async () => {
    const command = new TheCommand(['--json'])
    command.error = jest.fn()
    command.log = jest.fn()
    const retVal = {}
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
  })

  test('get empty action urls -y', async () => {
    const command = new TheCommand(['--yml'])
    command.error = jest.fn()
    command.log = jest.fn()
    const retVal = {}
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
  })

  test('get empty action urls -h', async () => {
    const command = new TheCommand(['--hson'])
    command.error = jest.fn()
    command.log = jest.fn()
    const retVal = {}
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
  })

  test('get all action urls with cdn flag', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      },
      cdn: {
        action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run(['--cdn'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.cdn.action))
  })

  test('get single action url', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.args = { action: 'action' }
    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
  })

  test('get single action url with cdn flag', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.args = { action: 'action' }
    const retVal = {
      runtime: {
        action: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action'
      },
      cdn: {
        action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action'
      }
    }
    mockScripts.getUrls.mockResolvedValue(retVal)
    const urls = await command.run(['--cdn'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.getUrls).toBeCalledWith({})
    expect(urls).toBe(retVal)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.runtime.action))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining(urls.cdn.action))
  })

  test('get single action url with non existing action', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.args = { action: 'invalid' }
    mockScripts.getUrls.mockRejectedValue('error')
    await command.run()
    expect(command.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'error' }))
  })
})
