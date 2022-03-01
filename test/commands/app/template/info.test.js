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

const TheCommand = require('../../../../src/commands/app/template/info')
const BaseCommand = require('../../../../src/BaseCommand')
const { TEMPLATE_PACKAGE_JSON_KEY, getNpmLocalVersion, readPackageJson } = require('../../../../src/lib/npm-helper')
const { stdout } = require('stdout-stderr')

jest.mock('../../../../src/lib/npm-helper', () => {
  const orig = jest.requireActual('../../../../src/lib/npm-helper')
  return {
    ...orig,
    readPackageJson: jest.fn(),
    getNpmLocalVersion: jest.fn()
  }
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description.length).toBeGreaterThan(0)
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual([])
})

test('flags', async () => {
  expect(TheCommand.flags.json).toBeDefined()
  expect(TheCommand.flags.json.type).toEqual('boolean')

  expect(TheCommand.flags.yml).toBeDefined()
  expect(TheCommand.flags.yml.type).toEqual('boolean')
})

test('args', async () => {
  expect(TheCommand.args).toEqual([])
})

describe('instance methods', () => {
  let command

  beforeEach(() => {
    readPackageJson.mockReset()
    getNpmLocalVersion.mockReset()

    command = new TheCommand([])
  })

  test('indentString', () => {
    const string = 'mystring'
    const result = command.indentString(string)
    expect(result).toEqual('  ' + string)
  })

  test('printTemplate', () => {
    command.printTemplate({ name: 'name', spec: '^1.0.0', version: '1.0.1' })
    expect(stdout.output).toEqual('name@^1.0.0 (1.0.1)\n')
  })

  test('exists', async () => {
    expect(command.run).toBeInstanceOf(Function)
  })

  describe('run', () => {
    test('packages are installed', () => {
      readPackageJson.mockResolvedValue({
        dependencies: {
          foo: '^1.0.0',
          bar: '^2.0.0'
        },
        [TEMPLATE_PACKAGE_JSON_KEY]: [
          'foo',
          'bar'
        ]
      })

      getNpmLocalVersion
        .mockResolvedValueOnce('1.0.1')
        .mockResolvedValueOnce('2.0.1')

      command.argv = []
      return command.run()
        .then(() => {
          expect(stdout.output).toMatch('foo@^1.0.0 (1.0.1)')
          expect(stdout.output).toMatch('bar@^2.0.0 (2.0.1)')
        })
    })

    test('no packages are installed', () => {
      readPackageJson.mockResolvedValue({
        dependencies: {
          foo: '^1.0.0',
          bar: '^2.0.0'
        },
        [TEMPLATE_PACKAGE_JSON_KEY]: [
          'foo',
          'bar'
        ]
      })

      getNpmLocalVersion.mockRejectedValue(new Error('not found'))

      command.argv = []
      return command.run()
        .then(() => {
          expect(stdout.output).toMatch('foo@^1.0.0 (unknown)')
          expect(stdout.output).toMatch('bar@^2.0.0 (unknown)')
        })
    })

    test('no dependencies', () => {
      readPackageJson.mockResolvedValue({
        dependencies: {},
        [TEMPLATE_PACKAGE_JSON_KEY]: [
          'foo',
          'bar'
        ]
      })

      getNpmLocalVersion.mockRejectedValue(new Error('not found'))

      command.argv = []
      return command.run()
        .then(() => {
          expect(stdout.output).toMatch('foo@unknown (unknown)')
          expect(stdout.output).toMatch('bar@unknown (unknown)')
        })
    })

    test('no templates installed', () => {
      readPackageJson.mockResolvedValue({
        dependencies: {
          foo: '^1.0.0',
          bar: '^2.0.0'
        }
      })

      command.argv = []
      return command.run()
        .then(() => {
          expect(stdout.output).toMatch('no app templates are installed')
        })
    })

    test('--yml', () => {
      readPackageJson.mockResolvedValue({
        dependencies: {
          foo: '^1.0.0',
          bar: '^2.0.0'
        },
        [TEMPLATE_PACKAGE_JSON_KEY]: [
          'foo',
          'bar'
        ]
      })

      getNpmLocalVersion
        .mockResolvedValueOnce('1.0.1')
        .mockResolvedValueOnce('2.0.1')

      command.argv = ['--yml']
      return command.run()
        .then(() => {
          expect(stdout.output).toMatchFixture('templates/info.yml')
        })
    })

    test('--json', () => {
      readPackageJson.mockResolvedValue({
        dependencies: {
          foo: '^1.0.0',
          bar: '^2.0.0'
        },
        [TEMPLATE_PACKAGE_JSON_KEY]: [
          'foo',
          'bar'
        ]
      })

      getNpmLocalVersion
        .mockResolvedValueOnce('1.0.1')
        .mockResolvedValueOnce('2.0.1')

      command.argv = ['--json']
      return command.run()
        .then(() => {
          const json = global.fixtureJson('templates/info.json')
          expect(stdout.output).toMatch(JSON.stringify(json, null, 2))
        })
    })
  })
})
