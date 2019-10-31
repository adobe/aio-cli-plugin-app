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
const inquirer = require('inquirer')

const TheCommand = require('../../../src/commands/app/init')
const BaseCommand = require('../../../src/BaseCommand')
const execa = require('execa')

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
        expect(res).toEqual(new Error('Unexpected argument: --wtf\nSee more help with --help'))
        done()
      })
  })
})

describe('good flags', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('--yes', async () => {
    // skip action install, then for web-src install
    fs.existsSync.mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
    fs.readJSON.mockResolvedValue({ name: 'bonita' })
    fs.statSync.mockReturnValueOnce({ isDirectory: () => true })
    fs.readdirSync.mockReturnValueOnce({ includes: () => true })

    await TheCommand.run(['new-folder', '--yes'])
    expect(fs.existsSync).toHaveBeenCalled()
    expect(execa).toHaveBeenCalled()
  })

  test('--yes with missing package.json', async () => {
    // skip action install, then for web-src install
    fs.existsSync.mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
    fs.readJSON.mockResolvedValue({ name: 'bonita' })
    fs.statSync.mockReturnValueOnce({ isDirectory: () => true })
    fs.readdirSync.mockReturnValueOnce({ includes: () => false })
    await TheCommand.run(['new-folder', '--yes'])
    expect(execa).not.toHaveBeenCalled()
  })

  test('--no-yes user says no to npmInstall', async () => {
    fs.existsSync.mockReturnValueOnce(true)
    fs.readJSON.mockResolvedValue({ name: 'Bonita' })
    fs.statSync.mockReturnValueOnce({ isDirectory: () => true })
    fs.readdirSync.mockReturnValueOnce({ includes: () => true })
    inquirer.prompt.mockResolvedValueOnce({ components: [] })
      .mockResolvedValueOnce({ name: 'Juanita' })
      .mockResolvedValueOnce({ npmInstall: false })
    await TheCommand.run(['new-folder'])
    expect(fs.existsSync).toHaveBeenCalled()
    expect(execa).not.toHaveBeenCalled()
  })

  test('--no-yes', async () => {
    fs.existsSync.mockReturnValueOnce(true)
    fs.readJSON.mockResolvedValue({ name: 'Bonita' })
    fs.statSync.mockReturnValueOnce({ isDirectory: () => true })
    fs.readdirSync.mockReturnValueOnce({ includes: () => true })
    inquirer.prompt.mockResolvedValueOnce({ components: [] })
      .mockResolvedValueOnce({ name: 'Juanita' })
      .mockResolvedValueOnce({ npmInstall: true })
    await TheCommand.run(['new-folder'])
    expect(fs.existsSync).toHaveBeenCalled()
    expect(execa).toHaveBeenCalled()
  })
})

describe('api', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  // copyBaseFiles

  test('copyBaseFiles exists and is function', async () => {
    let command = new TheCommand()
    expect(command).toBeDefined()
    expect(command.copyBaseFiles).toBeDefined()
    expect(typeof command.copyBaseFiles).toBe('function')
  })

  test('copyBaseFiles fails when src dne', async () => {
    let command = new TheCommand()
    fs.existsSync.mockReturnValue(false)
    await command.copyBaseFiles('some-dest1', true)
    expect(fs.copySync).not.toHaveBeenCalled()
  })

  test('copyBaseFiles calls through to copySync files', async () => {
    let command = new TheCommand()
    fs.readJson.mockResolvedValue({ name: 'Bonita' })
    fs.existsSync.mockReturnValueOnce(true)
    await command.copyBaseFiles('some-dest1', true)
    expect(fs.copySync).toHaveBeenCalled()
    expect(fs.outputJson).toHaveBeenCalledWith(expect.any(String), { name: 'some-dest1' }, expect.objectContaining({ spaces: 2 }))
  })

  test('copyBaseFiles does NOT call through to copySync files if dest exists', async () => {
    let command = new TheCommand()
    fs.existsSync.mockReturnValueOnce(false)
    await command.copyBaseFiles('some-dest2', 'name-me', true)
    expect(fs.copySync).not.toHaveBeenCalled()
  })

  test('copyBaseFiles throws on invalid name contains space', async () => {
    let command = new TheCommand()
    fs.existsSync.mockReturnValueOnce(true)
    let result = command.copyBaseFiles('name this', true)
    return expect(result).rejects.toThrow('contains invalid characters and is not a valid package name')
  })

  // createAssetsFromTemplate

  test('createAssetsFromTemplate exists and is function', () => {
    let command = new TheCommand()
    expect(command).toBeDefined()
    expect(command.createAssetsFromTemplate).toBeDefined()
    expect(typeof command.createAssetsFromTemplate).toBe('function')
  })

  test('createAssetsFromTemplate calls through to copySync files', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    await command.createAssetsFromTemplate('some-dest1', true)
    expect(fs.copySync).toHaveBeenCalled()
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  test('createAssetsFromTemplate does NOT call through to copySync files if dest exists', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn().mockReturnValueOnce(true)
    await command.createAssetsFromTemplate('some-dest2', true)
    expect(fs.copySync).not.toHaveBeenCalled()
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  test('createAssetsFromTemplate does NOT call through to copySync files if template src is missing', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn().mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
    await command.createAssetsFromTemplate('some-dest2', true)
    expect(fs.copySync).not.toHaveBeenCalled()
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  test('createAssetsFromTemplate calls through to copySync files w/prompt', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    inquirer.prompt.mockResolvedValueOnce({ assetDest: 'web-src' })
    await command.createAssetsFromTemplate('some-dest1', false)
    expect(fs.copySync).toHaveBeenCalled()
    expect(inquirer.prompt).toHaveBeenCalled()
  })

  test('createAssetsFromTemplate does NOT call through to copySync files if dest exists w/prompt', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn().mockReturnValueOnce(true)
    inquirer.prompt.mockResolvedValueOnce({ assetDest: 'web-src' })
    await command.createAssetsFromTemplate('some-dest2', false)
    expect(fs.copySync).not.toHaveBeenCalled()
    expect(inquirer.prompt).toHaveBeenCalled()
  })

  // createActionsFromTemplate

  test('createActionsFromTemplate exists and is function', () => {
    let command = new TheCommand()
    expect(command).toBeDefined()
    expect(command.createActionsFromTemplate).toBeDefined()
    expect(typeof command.createActionsFromTemplate).toBe('function')
  })

  test('createActionsFromTemplate calls through to copySync files', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    await command.createActionsFromTemplate('some-dest1', true)
    expect(fs.copySync).toHaveBeenCalled()
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  test('createActionsFromTemplate does NOT call through to copySync files if dest exists', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn().mockReturnValueOnce(true)
    await command.createActionsFromTemplate('some-dest2', true)
    expect(fs.copySync).not.toHaveBeenCalled()
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  test('createActionsFromTemplate does NOT call through to copySync files if template src is missing', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn().mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
    await command.createActionsFromTemplate('some-dest2', true)
    expect(fs.copySync).not.toHaveBeenCalled()
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  test('createActionsFromTemplate calls through to copySync files w/prompt', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    inquirer.prompt.mockResolvedValueOnce({ actionDest: 'actions' })
    await command.createActionsFromTemplate('some-dest1', false)
    expect(fs.copySync).toHaveBeenCalled()
    expect(inquirer.prompt).toHaveBeenCalled()
  })

  test('createActionsFromTemplate does NOT call through to copySync files if dest exists w/prompt', async () => {
    let command = new TheCommand()
    fs.existsSync = jest.fn().mockReturnValueOnce(true)
    inquirer.prompt.mockResolvedValueOnce({ actionDest: 'actions' })
    await command.createActionsFromTemplate('some-dest2', false)
    expect(fs.copySync).not.toHaveBeenCalled()
    expect(inquirer.prompt).toHaveBeenCalled()
  })
})
