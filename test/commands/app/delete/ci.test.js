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

const TheCommand = require('../../../../src/commands/app/delete/ci')
const BaseCommand = require('../../../../src/BaseCommand')

jest.mock('fs-extra')

let command

beforeEach(() => {
  fs.ensureDirSync.mockClear()
  fs.removeSync.mockClear()
  fs.existsSync.mockClear()
  command = new TheCommand([])
  command.prompt = jest.fn()
})

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
  expect(typeof TheCommand.flags).toBe('object')
})

test('unknown flag', async () => {
  command.argv = ['--wtf']
  await expect(command.run()).rejects.toThrow('Nonexistent flag')
})

test('no ci dir', async () => {
  fs.existsSync.mockReturnValue(false)
  command.argv = []
  await expect(command.run()).rejects.toThrow('you have no CI in your project')
})

test('--yes flag', async () => {
  command.prompt.mockResolvedValue({})
  command.argv = ['--yes']
  fs.existsSync.mockReturnValue(true)
  await command.run([])

  // everything will be deleted
  expect(fs.removeSync).toHaveBeenCalledTimes(3)
})

describe('no flags', () => {
  test('confirm delete true', async () => {
    command.prompt.mockResolvedValue({ deleteCI: true })
    fs.existsSync.mockReturnValue(true)
    await command.run([])

    // everything will be deleted
    expect(fs.removeSync).toHaveBeenCalledTimes(3)
  })

  test('confirm delete false', async () => {
    command.prompt.mockResolvedValue({ deleteCI: false })
    fs.existsSync.mockReturnValue(true)
    await command.run([])

    // nothing will be deleted
    expect(fs.removeSync).not.toHaveBeenCalled()
  })
})
