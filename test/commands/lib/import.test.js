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

const { importConfigJson, writeAio, writeEnv, mergeEnv, splitEnvLine, flattenObjectWithSeparator, loadConfigFile } = require('../../../src/lib/import')
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

test('splitEnvLine', () => {
  expect(splitEnvLine('#comment')).toEqual(['#comment', undefined])
  expect(splitEnvLine('# comment')).toEqual(['# comment', undefined])
  expect(splitEnvLine('     # comment')).toEqual(['# comment', undefined])
  expect(splitEnvLine('no equal separator')).toEqual(null)

  expect(splitEnvLine('foo = bar')).toEqual(['foo', 'bar'])
  expect(splitEnvLine('     foo = bar')).toEqual(['foo', 'bar'])
  expect(splitEnvLine('foo=bar')).toEqual(['foo', 'bar'])
  expect(splitEnvLine('     foo=bar')).toEqual(['foo', 'bar'])

  // multiple equal separators
  expect(splitEnvLine('foo=bar=baz')).toEqual(['foo', 'bar=baz'])
  expect(splitEnvLine('foo=bar=baz=faz')).toEqual(['foo', 'bar=baz=faz'])
  expect(splitEnvLine('foo   =   bar  =  baz')).toEqual(['foo', 'bar  =  baz'])
  expect(splitEnvLine('foo=bar=   baz=faz')).toEqual(['foo', 'bar=   baz=faz'])
})

test('mergeEnv', async () => {
  let oldEnv, newEnv

  oldEnv = fixtureFile('merge.1.old.env')
  newEnv = fixtureFile('merge.1.new.env')
  expect(mergeEnv(oldEnv, newEnv)).toMatchFixture('merge.1.final.env')

  oldEnv = fixtureFile('merge.2.old.env')
  newEnv = fixtureFile('merge.2.new.env')
  expect(mergeEnv(oldEnv, newEnv)).toMatchFixture('merge.2.final.env')
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

test('invalid config', async () => {
  const workingFolder = 'my-working-folder'
  const configPath = '/some/config/path'

  fs.readFileSync.mockReturnValueOnce(fixtureFile('invalid.config.json'))
  return expect(importConfigJson(configPath, workingFolder, { overwrite: true })).rejects.toThrow('Missing or invalid keys in config:')
})

test('importConfigJson', async () => {
  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')
  const configPath = '/some/config/path'

  fs.readFileSync.mockReturnValueOnce(fixtureFile('valid.config.json'))
  await importConfigJson(configPath, workingFolder, { overwrite: true })

  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('valid.config.env')
  await expect(fs.writeFile.mock.calls[0][2]).toMatchObject({ flag: 'w' })

  await expect(fs.writeFile.mock.calls[1][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture('valid.config.aio')
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'w' })

  fs.readFileSync.mockReturnValueOnce(fixtureFile('valid.config.json'))
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
        return fixtureFile('valid.config.json')
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
  const configJson = fixtureFile('valid.config.json')

  fs.existsSync.mockReturnValue(true) // there is a write conflict

  fs.readFileSync.mockImplementation((source) => {
    switch (source) {
      case configPath:
        return configJson
    }

    throw new Error(`File ${source} not found.`)
  })

  fs.readFileSync.mockReturnValue(configJson)

  inquirer.prompt.mockResolvedValue({ conflict: 'abort' }) // no writes
  await importConfigJson(configPath, workingFolder, { interactive: true })

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

test('enrich $ims jwt credential with project.org.ims_org_id', async () => {
  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')
  const configPath = '/some/config/path'

  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.orgid.hjson'))
  await importConfigJson(configPath, workingFolder, { overwrite: true })
  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('config.orgid.env')
  await expect(fs.writeFile.mock.calls[0][2]).toMatchObject({ flag: 'w' })
  await expect(fs.writeFile.mock.calls[1][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture('config.orgid.aio')
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'w' })

  expect(fs.writeFile).toHaveBeenCalledTimes(2)
})

test('do not enrich $ims.jwt with ims_org_id if no jwt credentials defined ', async () => {
  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')
  const configPath = '/some/config/path'

  fs.readFileSync.mockReturnValueOnce(fixtureFile('config.orgid.no.jwt.hjson'))
  await importConfigJson(configPath, workingFolder, { overwrite: true })
  await expect(fs.writeFile.mock.calls[0][0]).toMatch(envPath)
  await expect(fs.writeFile.mock.calls[0][1]).toMatchFixture('config.orgid.no.jwt.env')
  await expect(fs.writeFile.mock.calls[0][2]).toMatchObject({ flag: 'w' })
  await expect(fs.writeFile.mock.calls[1][0]).toMatch(aioPath)
  await expect(fs.writeFile.mock.calls[1][1]).toMatchFixture('config.orgid.no.jwt.aio')
  await expect(fs.writeFile.mock.calls[1][2]).toMatchObject({ flag: 'w' })
  expect(fs.writeFile).toHaveBeenCalledTimes(2)
})
