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

const { importConfigJson, writeAio, writeEnv, flattenObjectWithSeparator, loadConfigFile } = require('../../../src/lib/import')
const fs = require('fs-extra')
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
  const hjson = fixtureHjson('writeaio.hjson')
  const parentFolder = 'my-parent-folder'
  const aioPath = path.join(parentFolder, '.aio')
  const destination = 'writeaio.aio'

  writeAio(hjson, parentFolder, { overwrite: true })
  await expect(fs.writeFile.mock.calls[0][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture(destination)

  writeAio(hjson, parentFolder, { overwrite: false })
  await expect(fs.writeFile.mock.calls[1][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture(destination)

  writeAio(hjson, parentFolder) // default flags, coverage
  await expect(fs.writeFile.mock.calls[2][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[2][1]).toMatchFixture(destination)

  return expect(fs.writeFile).toHaveBeenCalledTimes(3)
})

test('writeEnv', async () => {
  const hjson = fixtureHjson('writeenv.hjson')
  const parentFolder = 'my-parent-folder'
  const envPath = path.join(parentFolder, '.env')
  const destination = 'writeenv.env'

  writeEnv(hjson, parentFolder, { overwrite: true })
  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture(destination)

  writeEnv(hjson, parentFolder, { overwrite: false })
  await expect(fs.writeFile.mock.calls[1][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture(destination)

  return expect(fs.writeFile).toHaveBeenCalledTimes(2)
})

test('importConfigJson', async () => {
  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')
  const configPath = '/some/config/path'

  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.1.hjson'))
  await importConfigJson(configPath, workingFolder, { overwrite: true })

  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('config.1.env')
  await expect(fs.writeFile.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  await expect(fs.writeFile.mock.calls[1][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture('config.1.aio')
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'w' })

  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.1.hjson'))
  await importConfigJson(configPath) // for coverage (defaults), no overwrite
  await expect(fs.writeFile.mock.calls[2][2]).toMatchObject({ flag: 'wx' })
  await expect(fs.writeFile.mock.calls[3][2]).toMatchObject({ flag: 'wx' })

  await expect(fs.writeFile).toHaveBeenCalledTimes(4)
})

test('loadConfigFile (coverage)', async () => {
  const emptyConfigPath = '/empty/path'

  fs.readFileSync.mockImplementation((source) => {
    switch (source) {
      case emptyConfigPath:
        return fixtureFile('config.empty.hjson')
    }

    throw new Error('File not found.')
  })

  let result

  result = loadConfigFile(emptyConfigPath)
  expect(result.values).toEqual({})

  result = loadConfigFile({}) // bad input
  expect(result.values).toEqual({})

  const malformedJson = fixtureFile('config.malformed.hjson')
  expect(() => loadConfigFile(Buffer.from(malformedJson))).toThrow(new Error('Cannot parse json'))

  const malformedYaml = fixtureFile('config.malformed.yaml')
  expect(() => loadConfigFile(Buffer.from(malformedYaml))).toThrow(new Error('Cannot parse yaml'))
})

test('importConfigJson - interactive (merge)', async () => {
  const workingFolder = 'my-working-folder'
  const envPath = path.join(workingFolder, '.env')
  const aioPath = path.join(workingFolder, '.aio')
  const configPath = '/some/config/path'

  fs.readFileSync.mockImplementation((source) => {
    switch (source) {
      case configPath:
        return fixtureFile('config.1.hjson')
      case envPath:
        return fixtureFile('existing.env')
      case aioPath:
        return fixtureFile('existing.aio')
    }

    throw new Error('File not found.')
  })

  fs.existsSync.mockReturnValue(true) // there is a write conflict
  await importConfigJson(configPath, workingFolder, { merge: true })

  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('existing.merged.env')
  await expect(fs.writeFile.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  await expect(fs.writeFile.mock.calls[1][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture('existing.merged.aio')
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'w' })

  fs.existsSync.mockReturnValue(false) // there is NO write conflict
  await importConfigJson(configPath, workingFolder, { merge: true })

  await expect(fs.writeFile).toHaveBeenCalledTimes(4)
})

test('importConfigJson - interactive', async () => {
  const workingFolder = 'my-working-folder'
  const configPath = '/some/config/path'
  const configJson = fixtureFile('config.1.hjson')

  fs.existsSync.mockReturnValue(true) // there is a write conflict

  fs.readFileSync.mockReturnValueOnce(configJson)
  inquirer.prompt.mockResolvedValue({ conflict: 'abort' }) // no writes
  await importConfigJson(configPath, workingFolder, { interactive: true })

  fs.readFileSync.mockReturnValueOnce(configJson)
  inquirer.prompt.mockResolvedValue({ conflict: 'merge' }) // two writes
  await importConfigJson(configPath, workingFolder, { interactive: true })

  fs.readFileSync.mockReturnValueOnce(configJson)
  inquirer.prompt.mockResolvedValue({ conflict: 'overwrite' }) // two writes
  await importConfigJson(configPath, workingFolder, { interactive: true })

  fs.readFileSync.mockReturnValueOnce(configJson)
  inquirer.prompt.mockResolvedValue({ overwrite: true }) // two writes, one to .env, one to .aio
  await importConfigJson(configPath, workingFolder, { interactive: true })

  fs.readFileSync.mockReturnValueOnce(configJson)
  fs.existsSync.mockReturnValue(false) // there is NO write conflict. there should be two writes
  await importConfigJson(configPath, workingFolder, { interactive: true })

  await expect(fs.writeFile).toHaveBeenCalledTimes(8)
})

test('enforce alphanumeric content rule - name, project.name, project.org.name invalid', async () => {
  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.2.hjson'))
  const invalid = fixtureHjson('config.2.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})

test('enforce alphanumeric content rule - missing all keys (undefined)', async () => {
  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.3.hjson')) // for coverage (missing keys)
  const invalid = fixtureHjson('config.3.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})

test('enforce alphanumeric content rule - app_url, action_url are both invalid', async () => {
  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.4.hjson')) // invalid urls
  const invalid = fixtureHjson('config.4.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})

test('enforce alphanumeric content rule - credentials.oauth2.redirect_uri set and invalid', async () => {
  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.5.hjson')) // invalid url (credentials.oauth2.redirect_uri)
  const invalid = fixtureHjson('config.5.error.hjson')
  await expect(importConfigJson('/some/config/path')).rejects.toThrow(`Missing or invalid keys in config: ${JSON.stringify(invalid)}`)

  await expect(fs.writeFile).toHaveBeenCalledTimes(0)
})
