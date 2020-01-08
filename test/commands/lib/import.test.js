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

const { importConfigJson, writeAio, writeEnv, flattenObjectWithSeparator } = require('../../../src/lib/import')
const fs = require('fs-extra')
const path = require('path')

beforeEach(() => {
  jest.clearAllMocks()
})

test('exports', () => {
  expect(importConfigJson).toBeDefined()
  expect(importConfigJson).toBeInstanceOf(Function)

  expect(writeAio).toBeDefined()
  expect(writeAio).toBeInstanceOf(Function)

  expect(writeEnv).toBeDefined()
  expect(writeEnv).toBeInstanceOf(Function)

  expect(flattenObjectWithSeparator).toBeDefined()
  expect(flattenObjectWithSeparator).toBeInstanceOf(Function)
})

test('flattenObjectWithSeparator', () => {
  const json = {
    foo: 'a',
    bar: {
      baz: {
        faz: 'b',
        jumping_jacks: 'c' // underscore in name
      },
      raz: {
      }
    }
  }

  const result = flattenObjectWithSeparator(json, {})
  expect(result).toEqual({
    AIO_bar_baz_faz: 'b',
    AIO_bar_baz_jumping__jacks: 'c', // the
    AIO_foo: 'a'
  })
})

test('writeAio', async () => {
  const json = {
    a: 'b',
    c: {
      d: 'e'
    }
  }

  const parentFolder = 'my-parent-folder'
  const aioPath = path.join(parentFolder, '.aio')

  writeAio(json, parentFolder, true)
  await expect(fs.writeJson).toHaveBeenCalledWith(aioPath, json, expect.any(Object))

  writeAio(json, parentFolder, false)
  await expect(fs.writeJson).toHaveBeenCalledWith(aioPath, json, expect.any(Object))

  writeAio(json, parentFolder) // for coverage
  await expect(fs.writeJson).toHaveBeenCalledWith(aioPath, json, expect.any(Object))

  return expect(fs.writeJson).toHaveBeenCalledTimes(3)
})

test('writeEnv', async () => {
  const json = {
    a: 'b',
    c: {
      d: 'e'
    }
  }

  const parentFolder = 'my-parent-folder'
  const envPath = path.join(parentFolder, '.env')
  const envData = 'AIO_a=b\nAIO_c_d=e'

  writeEnv(json, parentFolder, true)
  await expect(fs.writeFile).toHaveBeenCalledWith(envPath, envData, expect.any(Object))

  writeEnv(json, parentFolder, false)
  await expect(fs.writeFile).toHaveBeenCalledWith(envPath, envData, expect.any(Object))

  writeEnv(json, parentFolder) // for coverage
  await expect(fs.writeFile).toHaveBeenCalledWith(envPath, envData, expect.any(Object))

  return expect(fs.writeFile).toHaveBeenCalledTimes(3)
})

test('importConfigJson', async () => {
  const configJson = fixtureJson('config.1.json')

  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')

  fs.readJson.mockReturnValueOnce(configJson)
  await importConfigJson('/some/config/path', workingFolder, true) // first call. overwrite

  await expect(fs.writeJson.mock.calls[0][0]).toMatch(aioPath)
  await expect(fs.writeJson.mock.calls[0][1]).toMatchFixtureJson('config.1.aio')
  await expect(fs.writeJson.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('config.1.env')
  await expect(fs.writeJson.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  fs.readJson.mockReturnValueOnce(configJson)
  await importConfigJson('/some/config/path') // for coverage (defaults), second call. no overwrite
  await expect(fs.writeJson.mock.calls[1][2]).toMatchObject({ flag: 'wx' })
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'wx' })

  // empty config
  fs.readJson.mockReturnValueOnce({})
  await importConfigJson('/some/config/path') // third call

  await expect(fs.writeJson).toHaveBeenCalledTimes(3)
  await expect(fs.writeFile).toHaveBeenCalledTimes(3)
})
