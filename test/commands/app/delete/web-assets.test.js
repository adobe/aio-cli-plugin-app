/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const fs = require('fs-extra')
const TheCommand = require('../../../../src/commands/app/delete/web-assets')
const BaseCommand = require('../../../../src/BaseCommand')
const cloneDeep = require('lodash.clonedeep')

jest.mock('fs-extra')
jest.mock('inquirer', () => {
  return {
    Separator: class {}
  }
})

beforeEach(() => {
  fs.ensureDirSync.mockClear()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

describe('bad flags', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
  })
  test('unknown', async () => {
    command.argv = ['--wtf']
    await expect(command.run()).rejects.toThrow('Nonexistent flag')
  })
})

const mockConfigData = {
  app: {
    hasFrontend: true
  },
  all: {
    woody: {
      app: {
        hasFrontend: true
      },
      web: {
        src: '/web-src',
        distDev: '/dist/web-src-dev',
        distProd: '/dist/web-src-prod',
        injectedConfig: '/web-src/src/config.json'
      },
      root: '/boom'
    }
  }
}

describe('bad user selections', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.getAppExtConfigs = jest.fn()
    command.appConfig = cloneDeep(mockConfigData)
    fs.removeSync.mockClear()
  })

  test('aborts if no frontend', async () => {
    fs.removeSync.mockClear()
    command.appConfig.all.woody.app.hasFrontend = false
    command.prompt = jest.fn(a => {
      return {
        delete: true,
        'web-assets': [{ src: 'fakeWebPath23' }]
      }
    })
    await expect(command.run()).rejects.toThrow('web-assets not found')
    expect(fs.removeSync).not.toHaveBeenCalled()
  })

  test('aborts if user says no', async () => {
    command.prompt = jest.fn(a => {
      return {
        delete: false,
        'web-assets': [{ src: 'fakeWebPath4345' }]
      }
    })
    await command.run()
    expect(fs.removeSync).not.toHaveBeenCalled()
  })

  test('deletes user\'s selection', async () => {
    command.prompt = jest.fn(a => {
      return {
        delete: true,
        'web-assets': [{ src: 'fakeWebPath' }]
      }
    })
    await command.run()
    expect(fs.removeSync).toHaveBeenCalledWith('fakeWebPath')
  })
})
