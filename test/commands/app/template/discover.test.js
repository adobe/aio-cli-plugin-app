/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../../src/commands/app/template/discover')
const { TEMPLATE_PACKAGE_JSON_KEY, readPackageJson } = require('../../../../src/lib/npm-helper')
const fetch = require('node-fetch')
const inquirer = require('inquirer')
const { stdout } = require('stdout-stderr')

jest.mock('inquirer')
jest.mock('node-fetch')

jest.mock('../../../../src/lib/npm-helper', () => {
  const orig = jest.requireActual('../../../../src/lib/npm-helper')
  return {
    ...orig,
    readPackageJson: jest.fn()
  }
})

const createMockResponse = _json => {
  return {
    json: async () => _json
  }
}

let command
let packageJson

beforeEach(() => {
  packageJson = {}
  console.error = jest.fn()
  readPackageJson.mockReset()
  fetch.mockReset()
  command = new TheCommand([])
  command.error = jest.fn()
  command.config = {
    runCommand: jest.fn()
  }

  readPackageJson.mockImplementation(() => {
    return packageJson
  })
})

test('exports a run function', async () => {
  expect(typeof TheCommand.run).toEqual('function')
})

describe('sorting', () => {
  const genesis = new Date()
  const later = new Date(genesis.valueOf())
  later.setDate(later.getDate() + 10)

  const expectedResult = {
    objects: [
      { package: { scope: 'adobe', name: 'foo', description: 'some foo', version: '1.0.0', date: genesis } },
      { package: { scope: 'adobe', name: 'bar', description: 'some bar', version: '1.0.1', date: later } }
    ]
  }
  beforeEach(() => {
    fetch.mockResolvedValueOnce(createMockResponse(expectedResult))
  })

  test('unknown sort-field', async () => {
    fetch.mockResolvedValueOnce(createMockResponse({
      objects: []
    }))
    command.argv = ['--sort-field', 'unknown']
    return new Promise((resolve, reject) => {
      return command.run()
        .then(() => {
          reject(new Error('it should not succeed'))
        })
        .catch(error => {
          expect(error.message).toMatch('Expected --sort-field=')
          resolve()
        })
    })
  })

  test('sort-field=name, ascending', async () => {
    command.argv = ['--sort-field', 'name', '--sort-order', 'asc']
    return new Promise(resolve => {
      return command.run()
        .then(() => {
          const splitOutput = stdout.output.split('\n')
          expect(splitOutput[2]).toMatch('bar') // bar is first
          expect(splitOutput[3]).toMatch('foo') // foo is second
          resolve()
        })
    })
  })

  test('sort-field=name, descending', async () => {
    command.argv = ['--sort-field', 'name', '--sort-order', 'desc']
    return new Promise(resolve => {
      return command.run()
        .then(() => {
          const splitOutput = stdout.output.split('\n')
          expect(splitOutput[2]).toMatch('foo') // foo is first
          expect(splitOutput[3]).toMatch('bar') // bar is second
          resolve()
        })
    })
  })

  test('sort-field=date, ascending', async () => {
    command.argv = ['--sort-field', 'date', '--sort-order', 'asc']
    return new Promise(resolve => {
      return command.run()
        .then(() => {
          const splitOutput = stdout.output.split('\n')
          expect(splitOutput[2]).toMatch('foo') // foo is first
          expect(splitOutput[3]).toMatch('bar') // bar is second
          resolve()
        })
    })
  })

  test('sort-field=date, descending', async () => {
    command.argv = ['--sort-field', 'date', '--sort-order', 'desc']
    return new Promise(resolve => {
      return command.run()
        .then(() => {
          const splitOutput = stdout.output.split('\n')
          expect(splitOutput[2]).toMatch('bar') // bar is first
          expect(splitOutput[3]).toMatch('foo') // foo is second
          resolve()
        })
    })
  })
})

describe('interactive install', () => {
  const now = new Date()
  const tomorrow = new Date(now.valueOf() + 86400000)
  const dayAfter = new Date(tomorrow.valueOf() + 86400000)

  test('normal choices', async () => {
    const expectedResult = {
      objects: [
        { package: { scope: 'adobe', name: 'foo', description: 'some foo', version: '1.0.0', date: now } },
        { package: { scope: 'adobe', name: 'bar', description: 'some bar', version: '1.0.1', date: tomorrow } },
        { package: { scope: 'adobe', name: 'baz', description: 'some baz', version: '1.0.2', date: dayAfter } }
      ]
    }
    fetch.mockResolvedValueOnce(createMockResponse(expectedResult))

    command.argv = ['-i']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: ['bar', 'foo']
    })

    packageJson = {
      [TEMPLATE_PACKAGE_JSON_KEY]: ['baz'] // existing template installed
    }

    return new Promise(resolve => {
      return command.run()
        .then((result) => {
          expect(result).toEqual(['bar', 'foo'])
          const arg = inquirer.prompt.mock.calls[0][0] // first arg of first call
          expect(arg[0].choices.map(elem => elem.value)).toEqual(['bar', 'foo']) // baz was an existing plugin, filtered out
          resolve()
        })
    })
  })

  test('all templates are already installed', async () => {
    const expectedResult = {
      objects: [
        { package: { scope: 'adobe', name: 'foo', description: 'some foo', version: '1.0.0', date: now } },
        { package: { scope: 'adobe', name: 'bar', description: 'some bar', version: '1.0.1', date: tomorrow } },
        { package: { scope: 'adobe', name: 'baz', description: 'some baz', version: '1.0.2', date: dayAfter } }
      ]
    }
    fetch.mockResolvedValueOnce(createMockResponse(expectedResult))

    command.argv = ['-i']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: ['bar', 'foo', 'baz']
    })

    packageJson = {
      [TEMPLATE_PACKAGE_JSON_KEY]: ['bar', 'foo', 'baz'] // all the installed templates
    }

    return new Promise(resolve => {
      return command.run()
        .then((result) => {
          expect(result).toEqual([])
          expect(inquirer.prompt).not.toHaveBeenCalled() // should not prompt since there are no templates to install
          resolve()
        })
    })
  })

  test('no choices', async () => {
    const expectedResult = {
      objects: [
        { package: { scope: 'adobe', name: 'baz', description: 'some baz', version: '1.0.2', date: now } }
      ]
    }
    fetch.mockResolvedValueOnce(createMockResponse(expectedResult))

    command.argv = ['-i']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: []
    })

    return new Promise(resolve => {
      return command.run()
        .then((result) => {
          expect(result).toEqual([])
          resolve()
        })
    })
  })

  test('json result error', async () => {
    fetch.mockRejectedValueOnce({})

    command.argv = ['-i']

    return new Promise((resolve, reject) => {
      return command.run()
        .then(() => {
          expect(command.error).toHaveBeenCalled()
          resolve()
        })
        .catch(() => {
          reject(new Error('no error should have been thrown'))
        })
    })
  })
})

describe('--experimental-registry', () => {
  const now = new Date()
  const tomorrow = new Date(now.valueOf() + 86400000)
  const dayAfter = new Date(tomorrow.valueOf() + 86400000)

  beforeEach(() => {
    fetch.mockReset()
  })

  test('npm (default)', async () => {
    const expectedResult = {
      objects: [
        { package: { scope: 'adobe', name: 'foo', description: 'some foo', version: '1.0.0', date: now } },
        { package: { scope: 'adobe', name: 'bar', description: 'some bar', version: '1.0.1', date: tomorrow } },
        { package: { scope: 'adobe', name: 'baz', description: 'some baz', version: '1.0.2', date: dayAfter } }
      ]
    }
    fetch.mockResolvedValueOnce(createMockResponse(expectedResult))

    command.argv = ['-i', '--experimental-registry', 'npm']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: ['bar', 'foo']
    })

    packageJson = {
      [TEMPLATE_PACKAGE_JSON_KEY]: ['baz'] // existing template installed
    }

    return new Promise(resolve => {
      return command.run()
        .then((result) => {
          expect(result).toEqual(['bar', 'foo'])
          const arg = inquirer.prompt.mock.calls[0][0] // first arg of first call
          expect(arg[0].choices.map(elem => elem.value)).toEqual(['bar', 'foo']) // baz was an existing plugin, filtered out
          resolve()
        })
    })
  })

  test('npm (default) scope: adobe', async () => {
    const expectedResult = {
      objects: [
        { package: { scope: 'adobe', name: 'foo', description: 'some foo', version: '1.0.0', date: now } },
        { package: { scope: 'some-other-company', name: 'bar', description: 'some bar', version: '1.0.1', date: tomorrow } },
        { package: { scope: 'adobe', name: 'baz', description: 'some baz', version: '1.0.2', date: dayAfter } }
      ]
    }
    fetch.mockResolvedValueOnce(createMockResponse(expectedResult))

    command.argv = ['-i', '--scope', 'adobe', '--experimental-registry', 'npm']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: ['baz', 'foo']
    })

    packageJson = {}

    return new Promise(resolve => {
      return command.run()
        .then((result) => {
          expect(result).toEqual(['baz', 'foo'])
          const arg = inquirer.prompt.mock.calls[0][0] // first arg of first call
          expect(arg[0].choices.map(elem => elem.value)).toEqual(['baz', 'foo']) // baz was an existing plugin, filtered out
          resolve()
        })
    })
  })

  test('external registry (metadata missing registry)', async () => {
    const firstResult = {
      name: 'My External Registry'
    }
    fetch.mockResolvedValueOnce(createMockResponse(firstResult))

    command.argv = ['--experimental-registry', 'https://my-registry.reg/metadata.json']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: ['bar', 'foo']
    })

    packageJson = {
      [TEMPLATE_PACKAGE_JSON_KEY]: ['baz'] // existing template installed
    }

    await command.run()
    expect(command.error).toHaveBeenCalledWith('App template registry file not found (missing registry key in metadata)')
  })

  test('external registry', async () => {
    const firstResult = {
      name: 'My External Registry',
      registry: 'https://my-registry.reg/registry.json'
    }
    const secondResult = {
      data: [
        { scope: 'adobe', name: 'foo', description: 'some foo', version: '1.0.0', date: now },
        { scope: 'adobe', name: 'bar', description: 'some bar', version: '1.0.1', date: tomorrow },
        { scope: 'adobe', name: 'baz', description: 'some baz', version: '1.0.2', date: dayAfter }
      ]
    }
    fetch
      .mockResolvedValueOnce(createMockResponse(firstResult))
      .mockResolvedValueOnce(createMockResponse(secondResult))

    command.argv = ['-i', '--experimental-registry', 'https://my-registry.reg/metadata.json']
    inquirer.prompt = jest.fn().mockResolvedValue({
      templates: ['baz', 'bar', 'foo']
    })

    return new Promise(resolve => {
      return command.run()
        .then((result) => {
          expect(result).toEqual(['baz', 'bar', 'foo'])
          const arg = inquirer.prompt.mock.calls[0][0] // first arg of first call
          expect(arg[0].choices.map(elem => elem.value)).toStrictEqual(['baz', 'bar', 'foo']) // baz was an existing plugin, filtered out
          resolve()
        })
    })
  })
})
