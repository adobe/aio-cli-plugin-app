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

const TheCommand = require('../../../../src/commands/app/add/web-assets')
const BaseCommand = require('../../../../src/BaseCommand')

jest.mock('fs-extra')

jest.mock('yeoman-environment')
const yeoman = require('yeoman-environment')

const mockRegister = jest.fn()
const mockRun = jest.fn()
yeoman.createEnv.mockReturnValue({
  register: mockRegister,
  run: mockRun
})

beforeEach(() => {
  mockRegister.mockReset()
  mockRun.mockReset()
  yeoman.createEnv.mockClear()
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
  test('unknown', async () => {
    await expect(TheCommand.run(['--wtf'])).rejects.toThrow('Unexpected argument')
  })
})

describe('template module cannot be registered', () => {
  test('unknown error', async () => {
    mockRegister.mockImplementation(() => { throw new Error('some error') })
    await expect(TheCommand.run([])).rejects.toThrow('some error')
  })
})

describe('good flags', () => {
  test('--yes', async () => {
    await TheCommand.run(['--yes'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': true,
      'adobe-services': 'target,analytics,campaign-standard'
    })
  })

  test('no flags', async () => {
    await TheCommand.run([])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': false,
      'adobe-services': 'target,analytics,campaign-standard'
    })
  })
})
