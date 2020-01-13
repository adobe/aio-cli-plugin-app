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
    await expect(TheCommand.run(['.', '--wtf'])).rejects.toThrow('Unexpected argument')
  })
})

describe('template module cannot be registered', () => {
  test('unknown error', async () => {
    mockRegister.mockImplementation(() => { throw new Error('some error') })
    await expect(TheCommand.run(['.'])).rejects.toThrow('some error')
  })
})

describe('run', () => {
  const spyChdir = jest.spyOn(process, 'chdir')
  const spyCwd = jest.spyOn(process, 'cwd')
  let fakeCwd
  beforeEach(() => {
    fakeCwd = 'yolo'
    spyChdir.mockClear()
    spyCwd.mockClear()
    spyChdir.mockImplementation(dir => { fakeCwd = dir })
    spyCwd.mockImplementation(() => fakeCwd)
  })
  afterAll(() => {
    spyChdir.mockRestore()
    spyCwd.mockRestore()
  })

  test('some-path, --yes', async () => {
    await TheCommand.run(['some-path', '--yes'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': true,
      'skip-install': false,
      'project-name': 'some-path',
      'adobe-services': 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK'
    })
    expect(fs.ensureDirSync).toHaveBeenCalled()
    expect(spyChdir).toHaveBeenCalled()
  })

  test('some-path, --yes --skip-install', async () => {
    await TheCommand.run(['some-path', '--yes', '--skip-install'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': true,
      'skip-install': true,
      'project-name': 'some-path',
      'adobe-services': 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK'
    })
    expect(fs.ensureDirSync).toHaveBeenCalled()
    expect(spyChdir).toHaveBeenCalled()
  })

  test('no-path, --yes', async () => {
    await TheCommand.run(['--yes'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': true,
      'skip-install': false,
      'project-name': 'yolo',
      'adobe-services': 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK'
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(spyChdir).not.toHaveBeenCalled()
  })

  test('no-path, --yes --skip-install', async () => {
    await TheCommand.run(['--yes', '--skip-install'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': true,
      'skip-install': true,
      'project-name': 'yolo',
      'adobe-services': 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK'
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(spyChdir).not.toHaveBeenCalled()
  })

  test('no-path, --skip-install', async () => {
    await TheCommand.run(['--skip-install'])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': false,
      'skip-install': true,
      'project-name': 'yolo',
      'adobe-services': 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK'
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(spyChdir).not.toHaveBeenCalled()
  })

  test('no-path', async () => {
    await TheCommand.run([])

    expect(yeoman.createEnv).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledTimes(1)
    const genName = mockRegister.mock.calls[0][1]
    expect(mockRun).toHaveBeenCalledWith(genName, {
      'skip-prompt': false,
      'skip-install': false,
      'project-name': 'yolo',
      'adobe-services': 'AdobeTargetSDK,AdobeAnalyticsSDK,CampaignSDK'
    })
    expect(fs.ensureDirSync).not.toHaveBeenCalled()
    expect(spyChdir).not.toHaveBeenCalled()
  })
})
