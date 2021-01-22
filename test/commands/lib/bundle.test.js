/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const bundle = require('../../../src/lib/bundle')
const path = require('path')

const Bundler = require('parcel-bundler')
jest.mock('parcel-bundler')

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
  Bundler.mockReset()
})

test('exports', () => {
  expect(typeof bundle).toEqual('function')
})

test('bundle', async () => {
  const { bundler } = await bundle(LOCAL_CONFIG)

  expect(typeof bundler).toEqual('object')
  expect(Bundler.mockBundle).toHaveBeenCalled()
})

test('bundle cleanup', async () => {
  const { cleanup } = await bundle(LOCAL_CONFIG)

  expect(typeof cleanup).toEqual('function')
  await cleanup()
  expect(Bundler.mockStop).toHaveBeenCalled()
})
