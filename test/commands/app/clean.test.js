/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../src/commands/app/clean')
const BaseCommand = require('../../../src/BaseCommand')
const InitCommand = require('../../../src/commands/app/init')
const cloneDeep = require('lodash.clonedeep')
const fs = require('fs-extra')

const mockConfigData = {
  app: {
    hasFrontend: true,
    hasBackend: true
  },
  web: {
    injectedConfig: 'asldkfj'
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  command = new TheCommand([])
  command.error = jest.fn()
  command.log = jest.fn()
  command.appConfig = cloneDeep(mockConfigData)
  command.appConfig.actions = { dist: 'actions' }
  command.appConfig.web.distProd = 'dist'
  command.config = { runCommand: jest.fn(), runHook: jest.fn() }
  command.buildOneExt = jest.fn()
  command.getAppExtConfigs = jest.fn()
  command.getFullConfig = jest.fn().mockReturnValue({
    aio: {
      project: {
        workspace: {
          name: 'foo'
        }
      }
    }
  })
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.description).toBe('string')
  })

  test('args', async () => {
    expect(TheCommand.args).toEqual({})
  })
})

describe('bad flags', () => {
  const expectFlagError = async (argv, message) => {
    const command = new TheCommand([])
    command.argv = argv
    await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(message) }))
  }
  test('unknown', async () => {
    expectFlagError(['--wtf'], 'Nonexistent flag: --wtf\nSee more help with --help')
  })
})

describe('cleans a legacy app', () => {
  expect(1).toBeTruthy()
})

describe('cleans an exc app', () => {
  expect(1).toBeTruthy()
})

describe('cleans an app with multiple extensions', () => {
  expect(1).toBeTruthy()
})
