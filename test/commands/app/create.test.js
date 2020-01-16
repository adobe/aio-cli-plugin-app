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

const TheCommand = require('../../../src/commands/app/create')
const BaseCommand = require('../../../src/BaseCommand')
const InitCommand = require('../../../src/commands/app/init')

beforeEach(() => {
  jest.restoreAllMocks()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.description).toBe('string')
  })

  test('flags', async () => {
    expect(TheCommand.flags).toEqual(expect.objectContaining(BaseCommand.flags))

    expect(typeof TheCommand.flags.import).toBe('object')
    expect(TheCommand.flags.import.char).toBe('i')
  })

  test('args', async () => {
    expect(TheCommand.args).toEqual(expect.arrayContaining([{
      name: 'path',
      description: 'Path to the app directory',
      default: '.'
    }]))
  })
})

describe('bad flags', () => {
  test('unknown', async () => {
    const result = TheCommand.run(['.', '--wtf'])
    expect(result instanceof Promise).toBeTruthy()
    return new Promise((resolve, reject) => {
      return result
        .then(() => reject(new Error()))
        .catch(res => {
          expect(res).toEqual(new Error('Unexpected argument: --wtf\nSee more help with --help'))
          resolve()
        })
    })
  })
})

describe('runs', () => {
  test('Calls to InitCommand with -y', async () => {
    const mySpy = jest.spyOn(InitCommand, 'run').mockImplementation(jest.fn())
    await TheCommand.run(['new-project'])
    expect(mySpy).toHaveBeenCalledWith(['new-project', '-y'])
  })

  test('import', async () => {
    const mySpy = jest.spyOn(InitCommand, 'run').mockImplementation(jest.fn())
    await TheCommand.run(['new-project', '--import', 'config-file'])
    expect(mySpy).toHaveBeenCalledWith(['new-project', '-y', '--import', 'config-file'])
  })
})
