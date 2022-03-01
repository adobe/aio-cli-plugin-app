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

const TheCommand = require('../../../../src/commands/app/template/rollback')
const BaseCommand = require('../../../../src/BaseCommand')
const { TEMPLATE_PACKAGE_JSON_KEY, getNpmLocalVersion, hideNPMWarnings, readPackageJson, writeObjectToPackageJson } = require('../../../../src/lib/npm-helper')
const { prompt } = require('../../../../src/lib/app-helper')

// const fetch = require('node-fetch')
const inquirer = require('inquirer')
const { stdout } = require('stdout-stderr')

jest.mock('../../../../src/lib/app-helper')
jest.mock('../../../../src/lib/npm-helper', () => {
  const orig = jest.requireActual('../../../../src/lib/npm-helper')
  return {
    ...orig,
    readPackageJson: jest.fn(),
    writeObjectToPackageJson: jest.fn(),
    hideNPMWarnings: jest.fn(),
    getNpmLocalVersion: jest.fn()
  }
})

jest.mock('inquirer')

let command

beforeEach(() => {
  readPackageJson.mockReset()
  writeObjectToPackageJson.mockReset()
  prompt.mockReset()
  inquirer.prompt.mockReset()
  hideNPMWarnings.mockReset()
  getNpmLocalVersion.mockReset()

  command = new TheCommand([])
  command.config = {
    runCommand: jest.fn()
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
  expect(TheCommand.aliases).toEqual(['app:template:rollb'])
})

test('flags', async () => {
  // from BaseComand
  expect(TheCommand.flags.verbose).toBeDefined()
  expect(TheCommand.flags.version).toBeDefined()

  expect(TheCommand.flags.interactive).toBeDefined()
  expect(TheCommand.flags.interactive.type).toEqual('boolean')

  expect(TheCommand.flags.list).toBeDefined()
  expect(TheCommand.flags.list.type).toEqual('boolean')

  expect(TheCommand.flags.confirm).toBeDefined()
  expect(TheCommand.flags.confirm.type).toEqual('boolean')
})

test('args', async () => {
  expect(TheCommand.args).toEqual([])
})

/** @private */
function doRunCommand (argv, onSuccess, onFailure) {
  return new Promise((resolve, reject) => {
    command.argv = argv
    return command.run()
      .then(async () => {
        if (typeof onSuccess === 'function') {
          await onSuccess()
        }
        resolve()
      })
      .catch(async e => {
        if (typeof onFailure === 'function') {
          await onFailure()
        }
        reject(e)
      })
  })
}

test('exports a run function', async () => {
  expect(typeof TheCommand.run).toEqual('function')
})

test('no installed templates', () => {
  readPackageJson.mockResolvedValue({})

  return doRunCommand([], async () => {
    expect(stdout.output).toMatch('no installed templates to clear')
  })
})

test('clear (--no-confirm)', () => {
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: [
      'my-template-1',
      'my-template-2',
      'my-template-3'
    ]
  })

  const spy = jest.spyOn(command, '__clear')

  return doRunCommand(['--no-confirm'], async () => {
    const results = await spy.mock.calls[0][0]
    expect(results.length).toEqual(3) // the total number of templates above
    expect(prompt).not.toHaveBeenCalled()
    expect(hideNPMWarnings).toHaveBeenCalled()
  })
})

test('clear (--confirm) - true', async () => {
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: [
      'my-template-1',
      'my-template-2'
    ]
  })

  const spy = jest.spyOn(command, '__clear')
  prompt.mockResolvedValue(true) // confirm: true

  return doRunCommand(['--confirm'], async () => {
    const results = await spy.mock.calls[0][0]
    expect(results.length).toEqual(2) // the total number of templates above
    expect(prompt).toHaveBeenCalled()
    expect(hideNPMWarnings).toHaveBeenCalled()
  })
})

test('clear (--confirm) - false', async () => {
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: [
      'my-template-1',
      'my-template-2'
    ]
  })

  const spy = jest.spyOn(command, '__clear')
  prompt.mockResolvedValue(false) // confirm: false

  return doRunCommand(['--confirm'], async () => {
    const results = await spy.mock.calls[0][0]
    expect(results.length).toEqual(2) // the total number of templates above
    expect(prompt).toHaveBeenCalled()
    expect(hideNPMWarnings).not.toHaveBeenCalled()
  })
})

test('clear (--interactive)', () => {
  const installedTemplates = [
    'my-template-1',
    'my-template-2'
  ]
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: installedTemplates
  })

  inquirer.prompt = jest.fn().mockResolvedValue({
    templates: installedTemplates
  })

  const spy = jest.spyOn(command, '__interactiveClear')

  return doRunCommand(['--interactive'], async () => {
    const results = await spy.mock.calls[0][0]
    expect(results.length).toEqual(2) // the total number of templates above
    expect(inquirer.prompt).toHaveBeenCalled()
    expect(hideNPMWarnings).toHaveBeenCalled()
  })
})

test('clear (--verbose)', () => {
  const installedTemplates = [
    'my-template-1',
    'my-template-2'
  ]
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: installedTemplates
  })

  inquirer.prompt = jest.fn().mockResolvedValue({
    templates: installedTemplates
  })

  return doRunCommand(['--no-confirm', '--verbose'], async () => {
    expect(hideNPMWarnings).not.toHaveBeenCalled()
  })
})

test('clear (--interactive. --verbose)', () => {
  const installedTemplates = [
    'my-template-1',
    'my-template-2'
  ]
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: installedTemplates
  })

  inquirer.prompt = jest.fn().mockResolvedValue({
    templates: installedTemplates
  })
  getNpmLocalVersion
    .mockRejectedValue(new Error('not found'))

  return doRunCommand(['--interactive', '--verbose'], async () => {
    expect(hideNPMWarnings).not.toHaveBeenCalled()
  })
})

test('clear (--list)', () => {
  const installedTemplates = [
    'my-template-1',
    'my-template-2'
  ]
  readPackageJson.mockResolvedValue({
    [TEMPLATE_PACKAGE_JSON_KEY]: installedTemplates
  })

  const spy = jest.spyOn(command, '__list')
  getNpmLocalVersion
    .mockResolvedValueOnce('1.0.0')
    .mockResolvedValueOnce('2.0.0')

  return doRunCommand(['--list'], async () => {
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
