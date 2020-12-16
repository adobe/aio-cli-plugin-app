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

const serve = require('../../../src/lib/serve')
const path = require('path')

jest.mock('serve-static')

const SERVER_DEFAULT_PORT = 9080
let SERVER_AVAILABLE_PORT

const mockHttpsServerInstance = {
  address: jest.fn(() => ({
    port: SERVER_AVAILABLE_PORT
  }))
}
const mockHttpsCreateServer = jest.fn(() => mockHttpsServerInstance)

const https = require('https')
jest.mock('https')
https.createServer = mockHttpsCreateServer

const mockUIServerInstance = {
  use: jest.fn(),
  listen: jest.fn(),
  close: jest.fn()
}
jest.mock('pure-http', () => () => mockUIServerInstance)

const httpTerminator = require('http-terminator')
const mockTerminatorInstance = {
  terminate: jest.fn()
}
jest.mock('http-terminator')

const LOCAL_CONFIG = {
  root: '/my-app',
  envFile: '.my.env',
  app: {
    dist: 'dist'
  },
  cli: {
    dataDir: path.join('/', 'dataDir')
  },
  web: {
    distDev: 'web-src-dev',
    src: 'web-src'
  }
}

beforeEach(() => {
  SERVER_AVAILABLE_PORT = SERVER_DEFAULT_PORT
  mockUIServerInstance.listen.mockReset()
  mockTerminatorInstance.terminate.mockReset()
  httpTerminator.createHttpTerminator.mockImplementation(() => mockTerminatorInstance)
})

test('exports', () => {
  expect(typeof serve).toEqual('function')
})

test('serve https (set port not available, use default', async () => {
  const options = {
    https: {
      cert: 'cert.cert',
      key: 'key.key'
    }
  }

  const requestedPort = 8888
  SERVER_AVAILABLE_PORT = 9099
  process.env.PORT = requestedPort
  const { url } = await serve(LOCAL_CONFIG, options)

  expect(typeof url).toEqual('string')
  expect(https.createServer).toHaveBeenCalledWith(options.https)

  expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(requestedPort)) // requested this port
  expect(url).toBe(`https://localhost:${SERVER_AVAILABLE_PORT}`) // specificPort not available
  delete process.env.PORT
})

test('serve https (set port available and used', async () => {
  const options = {
    https: {
      cert: 'cert.cert',
      key: 'key.key'
    }
  }

  const requestedPort = 8888
  SERVER_AVAILABLE_PORT = requestedPort
  process.env.PORT = requestedPort
  const { url } = await serve(LOCAL_CONFIG, options)

  expect(typeof url).toEqual('string')
  expect(https.createServer).toHaveBeenCalledWith(options.https)

  expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(requestedPort)) // requested this port
  expect(url).toBe(`https://localhost:${requestedPort}`) // requestedPort available
  delete process.env.PORT
})

test('serve http (and use default port)', async () => {
  const options = {}
  const { url } = await serve(LOCAL_CONFIG, options)

  expect(typeof url).toEqual('string')
  expect(https.createServer).toHaveBeenCalled()

  expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(SERVER_DEFAULT_PORT)) // requested this port
  expect(url).toBe(`http://localhost:${SERVER_DEFAULT_PORT}`)
  delete process.env.PORT
})

test('serve cleanup', async () => {
  const { cleanup } = await serve(LOCAL_CONFIG)

  expect(typeof cleanup).toEqual('function')
  await cleanup()

  expect(mockTerminatorInstance.terminate).toBeCalledTimes(1)
  expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
    server: mockHttpsServerInstance
  })
})
