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

const TheCommand = require('../../../src/commands/app/init')
const BaseCommand = require('../../../src/BaseCommand')

const yeoman = require('yeoman-environment')
const inquirer = require('inquirer')

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

describe('bad flags', () => {
  test('unknown', async (done) => {
    let result = TheCommand.run(['.', '--wtf'])
    expect(result instanceof Promise).toBeTruthy()
    return result
      .then(() => done.fail())
      .catch(res => {
        expect(res.message).toMatch('Unexpected argument')
        done()
      })
  })
  test('bad template', async (done) => {
    let result = TheCommand.run(['.', '-t=chimeric'])
    expect(result instanceof Promise).toBeTruthy()
    return result
      .then(() => done.fail())
      .catch(res => {
        expect(res.message).toMatch('Expected --template=chimeric to be one of: hello, target, campaign, analytics')
        done()
      })
  })

  test('prompt returns bad template', async (done) => {
    jest.spyOn(inquirer, 'prompt').mockImplementation(() => {
      return { template: 'doesnotexist' }
    })
    let result = TheCommand.run(['.'])
    expect(result instanceof Promise).toBeTruthy()
    return result
      .then(() => done.fail())
      .catch(res => {
        expect(res.message).toMatch('Expected --template=doesnotexist to be one of: hello, target, campaign, analytics')
        done()
      })
  })
})

describe('template not found', () => {
  test('unknown', async (done) => {
    jest.spyOn(yeoman, 'createEnv').mockImplementation(() => {
      return {
        register: jest.fn(() => {
          throw new Error('some error')
        })
      }
    })
    let result = TheCommand.run(['.', '-t=hello'])
    expect(result instanceof Promise).toBeTruthy()
    return result
      .then(() => done.fail())
      .catch(res => {
        expect(res.message).toMatch('the \'hello\' template is not available.')
        done()
      })
  })
})

describe('good flags', () => {
  test('some-path, --yes', async () => {
    const mockChdir = jest.spyOn(process, 'chdir').mockImplementation(() => {})
    let registerCalled = false
    let runCalled = false
    const mockYoCreate = jest.spyOn(yeoman, 'createEnv').mockImplementation(() => {
      return {
        register: jest.fn(() => {
          registerCalled = true
        }),
        run: jest.fn(() => {
          runCalled = true
        })
      }
    })
    await TheCommand.run(['some-path', '--yes'])
    expect(mockYoCreate).toHaveBeenCalled()
    expect(registerCalled).toBe(true)
    expect(runCalled).toBe(true)
    expect(fs.ensureDirSync).toHaveBeenCalled()
    expect(mockChdir).toHaveBeenCalled()
  })

  test('no-path, --yes', async () => {
    const mockChdir = jest.spyOn(process, 'chdir').mockImplementation(() => {})
    let registerCalled = false
    let runCalled = false
    const mockYoCreate = jest.spyOn(yeoman, 'createEnv').mockImplementation(() => {
      return {
        register: jest.fn(() => {
          registerCalled = true
        }),
        run: jest.fn(() => {
          runCalled = true
        })
      }
    })
    await TheCommand.run(['--yes'])
    expect(mockYoCreate).toHaveBeenCalled()
    expect(registerCalled).toBe(true)
    expect(runCalled).toBe(true)
    expect(fs.ensureDirSync).toHaveBeenCalled()
    expect(mockChdir).toHaveBeenCalled()
  })
})
