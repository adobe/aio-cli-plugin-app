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

const bundleServe = require('../../../src/lib/bundle-serve')
const { defaultHttpServerPort: SERVER_DEFAULT_PORT } = require('../../../src/lib/defaults')
const httpTerminator = require('http-terminator')

let SERVER_AVAILABLE_PORT

jest.mock('http-terminator')

const mockHttpsServerInstance = {
  address: jest.fn(() => ({
    port: SERVER_AVAILABLE_PORT
  }))
}

const mockTerminatorInstance = {
  terminate: jest.fn()
}

const createBundler = () => {
  return {
    serve: async () => mockHttpsServerInstance
  }
}

beforeEach(() => {
  SERVER_AVAILABLE_PORT = SERVER_DEFAULT_PORT
  mockTerminatorInstance.terminate.mockReset()
  httpTerminator.createHttpTerminator.mockImplementation(() => mockTerminatorInstance)
})

test('exports', () => {
  expect(typeof bundleServe).toEqual('function')
})

test('bundle-serve https (set port not available, use default', async () => {
  const options = {
    https: {
      cert: 'cert.cert',
      key: 'key.key'
    }
  }

  const requestedPort = 8888
  SERVER_AVAILABLE_PORT = 9099
  const { url } = await bundleServe(createBundler(), requestedPort, options)

  expect(typeof url).toEqual('string')
  expect(url).toBe(`https://localhost:${SERVER_AVAILABLE_PORT}`) // specificPort not available
})

test('bundle-serve https (set port available and used', async () => {
  const options = {
    https: {
      cert: 'cert.cert',
      key: 'key.key'
    }
  }

  const requestedPort = 8888
  SERVER_AVAILABLE_PORT = requestedPort
  const { url } = await bundleServe(createBundler(), requestedPort, options)

  expect(typeof url).toEqual('string')
  expect(url).toBe(`https://localhost:${requestedPort}`) // requestedPort available
})

test('bundle-serve http (and use default port)', async () => {
  const options = {}
  const { url } = await bundleServe(createBundler(), undefined, options)

  expect(typeof url).toEqual('string')
  expect(url).toBe(`http://localhost:${SERVER_DEFAULT_PORT}`)
  delete process.env.PORT
})

test('bundle-serve cleanup', async () => {
  const { cleanup } = await bundleServe(createBundler())

  expect(typeof cleanup).toEqual('function')
  await cleanup()

  expect(mockTerminatorInstance.terminate).toBeCalledTimes(1)
  expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
    server: mockHttpsServerInstance
  })
})
