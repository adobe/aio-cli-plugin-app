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

/* eslint jest/expect-expect: [
  "error",
  {
    "assertFunctionNames": [
        "expect", "testCleanupNoErrors", "testCleanupOnError", "expectUIServer", "failMissingRuntimeConfig"
    ]
  }
]
*/

const { bundle, serve } = require('../../../src/lib/run-web')
const utils = require('../../../src/lib/app-helper')
const mockLogger = require('@adobe/aio-lib-core-logging')
const path = require('path')
const fs = require('fs-extra')

const Bundler = require('parcel-bundler')
jest.mock('parcel-bundler')

jest.mock('../../../src/lib/app-helper')
jest.mock('fs-extra')

jest.mock('serve-static')

const mockHttpsServerAddressInstance = {
  port: 9090
}
const mockHttpsServerInstance = {
  address: jest.fn(() => mockHttpsServerAddressInstance)
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
  mockLogger.mockReset()

  utils.downloadOWJar.mockReset()
  utils.runOpenWhiskJar.mockReset()
  fs.existsSync.mockReset()
})

test('exports', () => {
  expect(typeof bundle).toEqual('function')
  expect(typeof serve).toEqual('function')
})

test('bundle', async () => {
  const { cleanup, bundler } = await bundle(LOCAL_CONFIG)
  expect(typeof cleanup).toEqual('function')
  expect(typeof bundler).toEqual('object')
})

test('serve', async () => {
  const { cleanup, url } = await serve(LOCAL_CONFIG)
  expect(typeof cleanup).toEqual('function')
  expect(typeof url).toEqual('string')

  const fakeMiddleware = Symbol('fake middleware')
  Bundler.mockMiddleware.mockReturnValue(fakeMiddleware)
  await serve(LOCAL_CONFIG)
  expectUIServer(fakeMiddleware, 9080)
})

/** @private */
function expectUIServer (fakeMiddleware, port) {
  expect(Bundler.mockConstructor).toHaveBeenCalledTimes(1)
  expect(Bundler.mockConstructor).toHaveBeenCalledWith('web-src/index.html',
    expect.objectContaining({
      watch: true,
      outDir: 'web-src-dev'
    }))
}
