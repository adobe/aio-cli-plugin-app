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

const serve = require('../../../src/lib/serve')
const { defaultHttpServerPort: SERVER_DEFAULT_PORT } = require('../../../src/lib/defaults')
const https = require('https')
const httpTerminator = require('http-terminator')
const fs = require('fs-extra')

let SERVER_AVAILABLE_PORT

jest.mock('fs-extra')
jest.mock('serve-static')
jest.mock('https')
jest.mock('http-terminator')
jest.mock('pure-http', () => () => mockUIServerInstance)

const mockUIServerInstance = {
  use: jest.fn(),
  listen: jest.fn(),
  close: jest.fn()
}

const mockHttpsServerInstance = {
  address: jest.fn(() => ({
    port: SERVER_AVAILABLE_PORT
  }))
}
const mockHttpsCreateServer = jest.fn(() => mockHttpsServerInstance)

https.createServer = mockHttpsCreateServer

const mockTerminatorInstance = {
  terminate: jest.fn()
}

const WEB_ROOT = 'web-src-dev'

beforeEach(() => {
  SERVER_AVAILABLE_PORT = SERVER_DEFAULT_PORT
  mockUIServerInstance.listen.mockReset()
  mockTerminatorInstance.terminate.mockReset()
  httpTerminator.createHttpTerminator.mockImplementation(() => mockTerminatorInstance)
  fs.readFile.mockReset()
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

  const httpsCerts = {
    cert: 'cert-contents',
    key: 'key-contents'
  }

  fs.readFile.mockImplementation((filename) => {
    if (filename === options.https.cert) {
      return httpsCerts.cert
    } else if (filename === options.https.key) {
      return httpsCerts.key
    }
  })

  const requestedPort = 8888
  SERVER_AVAILABLE_PORT = 9099
  const { url } = await serve(WEB_ROOT, requestedPort, options)

  expect(typeof url).toEqual('string')
  expect(https.createServer).toHaveBeenCalledWith(httpsCerts)

  expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(requestedPort)) // requested this port
  expect(url).toBe(`https://localhost:${SERVER_AVAILABLE_PORT}`) // specificPort not available
})

test('serve https (set port available and used', async () => {
  const options = {
    https: {
      cert: 'cert.cert',
      key: 'key.key'
    }
  }

  const httpsCerts = {
    cert: 'cert-contents',
    key: 'key-contents'
  }

  fs.readFile.mockImplementation((filename) => {
    if (filename === options.https.cert) {
      return httpsCerts.cert
    } else if (filename === options.https.key) {
      return httpsCerts.key
    }
  })

  const requestedPort = 8888
  SERVER_AVAILABLE_PORT = requestedPort
  const { url } = await serve(WEB_ROOT, requestedPort, options)

  expect(typeof url).toEqual('string')
  expect(https.createServer).toHaveBeenCalledWith(httpsCerts)

  expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(requestedPort)) // requested this port
  expect(url).toBe(`https://localhost:${requestedPort}`) // requestedPort available
})

test('serve http (and use default port)', async () => {
  const options = {}
  const { url } = await serve(WEB_ROOT, undefined, options)

  expect(typeof url).toEqual('string')
  expect(https.createServer).toHaveBeenCalled()

  expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(SERVER_DEFAULT_PORT)) // requested this port
  expect(url).toBe(`http://localhost:${SERVER_DEFAULT_PORT}`)
})

test('serve cleanup', async () => {
  const { cleanup } = await serve(WEB_ROOT)

  expect(typeof cleanup).toEqual('function')
  await cleanup()

  expect(mockTerminatorInstance.terminate).toHaveBeenCalledTimes(1)
  expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
    server: mockHttpsServerInstance
  })
})
