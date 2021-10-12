/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// mock install app helper
const mockInstallPackages = jest.fn()
jest.mock('../src/lib/app-helper.js', () => ({
  installPackages: mockInstallPackages
}))

const TheCommand = require('../src/AddCommand')
const BaseCommand = require('../src/BaseCommand')

beforeEach(() => {
  mockInstallPackages.mockClear()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
  test('flags', async () => {
    expect(TheCommand.flags).toEqual(expect.objectContaining(BaseCommand.flags))

    expect(typeof TheCommand.flags['skip-install']).toBe('object')
    expect(TheCommand.flags['skip-install'].char).toBe('s')
    expect(TheCommand.flags['skip-install'].default).toBe(false)

    expect(typeof TheCommand.flags.install).toBe('object')
    expect(TheCommand.flags.install.default).toBe(true)
    expect(TheCommand.flags.install.allowNo).toBe(true)
  })
})

describe('installPackages', () => {
  test('--install', async () => {
    const command = new TheCommand()
    await command.runInstallPackages({ install: true }, () => {})
    expect(mockInstallPackages).toHaveBeenCalled()
  })

  test('--no-install', async () => {
    const command = new TheCommand()
    command.log = jest.fn()
    await command.runInstallPackages({ install: false }, () => {})
    expect(mockInstallPackages).not.toHaveBeenCalled()
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('skipped installation'))
  })

  test('--skip-install', async () => {
    const command = new TheCommand()
    command.log = jest.fn()
    await command.runInstallPackages({ 'skip-install': true }, () => {})
    expect(mockInstallPackages).not.toHaveBeenCalled()
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('skipped installation'))
  })
})
