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
const fs0 = require('fs')
const path = require('path')
const inquirer = require('inquirer')

jest.mock('fs')

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
    AIO_bar_baz_jumping__jacks: 'c', // the key when flattened converts any underscore to double underscores
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
  const hjson = fixtureHjson('writeenv.hjson')
  const parentFolder = 'my-parent-folder'
  const envPath = path.join(parentFolder, '.env')

  writeEnv(hjson, parentFolder, true)
  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('writeenv.env')

  writeEnv(hjson, parentFolder, false)
  await expect(fs.writeFile.mock.calls[1][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture('writeenv.env')

  writeEnv(hjson, parentFolder) // for coverage
  await expect(fs.writeFile.mock.calls[2][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[2][1]).toMatchFixture('writeenv.env')

  return expect(fs.writeFile).toHaveBeenCalledTimes(3)
})

test('importConfigJson', async () => {
  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')

  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.1.hjson'))
  await importConfigJson('/some/config/path', workingFolder, { overwrite: true }) // first call. overwrite

  await expect(fs.writeJson.mock.calls[0][0]).toMatch(aioPath)
  await expect(fs.writeJson.mock.calls[0][1]).toMatchFixtureHjson('config.1.aio')
  await expect(fs.writeJson.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('config.1.env')
  await expect(fs.writeJson.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.1.hjson'))
  await importConfigJson('/some/config/path') // for coverage (defaults), second call. no overwrite
  await expect(fs.writeJson.mock.calls[1][2]).toMatchObject({ flag: 'wx' })
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'wx' })

  await expect(fs.writeJson).toHaveBeenCalledTimes(2)
  await expect(fs.writeFile).toHaveBeenCalledTimes(2)
})

test('importConfigJson - interactive', async () => {
  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')

  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.1.hjson'))
  await importConfigJson('/some/config/path', workingFolder, { interactive: true }) // first call. overwrite

  await expect(fs.writeJson.mock.calls[0][0]).toMatch(aioPath)
  await expect(fs.writeJson.mock.calls[0][1]).toMatchFixtureHjson('config.1.aio')
  await expect(fs.writeJson.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('config.1.env')
  await expect(fs.writeJson.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.1.hjson'))
  fs.existsSync.mockReturnValue(true)
  inquirer.prompt.mockResolvedValue({ confirm: false }) // no writes
  await importConfigJson('/some/config/path', workingFolder, { interactive: true }) // for coverage (defaults), second call. no overwrite

  await expect(fs.writeJson).toHaveBeenCalledTimes(1)
  await expect(fs.writeFile).toHaveBeenCalledTimes(1)
})

test('enforce alphanumeric content rule - name, project.name, project.org.name invalid', async () => {
  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.2.hjson'))
  const invalid = fixtureHjson('config.2.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeJson).toHaveBeenCalledTimes(0)
  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})

test('enforce alphanumeric content rule - missing all keys (undefined)', async () => {
  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.3.hjson')) // for coverage (missing keys)
  const invalid = fixtureHjson('config.3.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeJson).toHaveBeenCalledTimes(0)
  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})

test('enforce alphanumeric content rule - app_url, action_url are both invalid', async () => {
  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.4.hjson')) // invalid urls
  const invalid = fixtureHjson('config.4.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeJson).toHaveBeenCalledTimes(0)
  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})

test('enforce alphanumeric content rule - credentials.oauth2.redirect_uri set and invalid', async () => {
  fs0.readFileSync.mockReturnValueOnce(fixtureFile('config.5.hjson')) // invalid url (credentials.oauth2.redirect_uri)
  const invalid = fixtureHjson('config.5.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeJson).toHaveBeenCalledTimes(0)
  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})
