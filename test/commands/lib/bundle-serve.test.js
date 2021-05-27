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

let createBundler = () => {
  return {
    watch: jest.fn((cb) => { cb(); return { unsubscribe: jest.fn() } })
  }
}

beforeEach(() => {
})

test('exports', () => {
  expect(typeof bundleServe).toEqual('function')
})

test('bundle-serve', async () => {
  const PORT = 8888
  const options = {
    serveOptions: {
      https: false,
      port: PORT
    }
  }
  const { url, cleanup } = await bundleServe(createBundler(), options)
  await cleanup()
  expect(typeof url).toEqual('string')
  expect(url).toBe(`http://localhost:${PORT}`) // specificPort not available
})

test('bundle-serve https', async () => {
  const PORT = 8888
  const options = {
    serveOptions: {
      https: true,
      port: PORT
    }
  }
  const { url, cleanup } = await bundleServe(createBundler(), options)
  await cleanup()
  expect(typeof url).toEqual('string')
  expect(url).toBe(`https://localhost:${PORT}`) // specificPort not available
})

test('watch error', async () => {
  createBundler = () => {
    return {
      watch: jest.fn((cb) => cb(new Error()))
    }
  }
  await expect(bundleServe(createBundler(), {})).rejects.toThrowError()
})
