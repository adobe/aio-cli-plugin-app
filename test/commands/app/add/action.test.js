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

import TheCommand from '../../../../src/commands/app/add/action.js'
import TemplatesCommand from '../../../../src/TemplatesCommand.js'
import dataMocks from '../../../data-mocks/config-loader.js'
import inquirer from 'inquirer'
import config from '@adobe/aio-lib-core-config'

vi.mock('@adobe/aio-lib-core-config')
vi.mock('fs-extra')
vi.mock('inquirer', () => ({
  default: {
    registerPrompt: vi.fn(),
    prompt: vi.fn()
  }
}))

const createAppConfig = (aioConfig = {}, appFixtureName = 'legacy-app') => {
  const appConfig = dataMocks(appFixtureName, aioConfig).all
  appConfig.application = { ...appConfig.application, ...aioConfig }
  return appConfig
}

const mockGetEnabledServicesForOrg = vi.fn()

let command

beforeEach(() => {
  config.get = vi.fn((key) => {
    if (key === 'project.org.id') {
      return 'some-id'
    }
  })

  command = new TheCommand([])
  command.getAppExtConfigs = vi.fn()
  command.getAppExtConfigs.mockResolvedValue(createAppConfig(command.appConfig))
  command.getFullConfig = vi.fn()
  command.getFullConfig.mockResolvedValue({
    packagejson: {
      version: '1.0.0',
      name: 'legacy-app',
      scripts: {
        'post-app-run': 'echo hello'
      }
    }
  })
  command.getConfigFileForKey = vi.fn()
  command.getConfigFileForKey.mockResolvedValue({})
  command.getLibConsoleCLI = vi.fn()
  command.getLibConsoleCLI.mockResolvedValue({
    getEnabledServicesForOrg: mockGetEnabledServicesForOrg
  })
  command.config = global.createOclifMockConfig({ bin: 'aio' })

  command.selectTemplates = vi.fn()
  command.selectTemplates.mockResolvedValue([])
  command.installTemplates = vi.fn()

  mockGetEnabledServicesForOrg.mockClear()
  inquirer.prompt.mockClear()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof TemplatesCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

test('bad flags', async () => {
  command.argv = ['--wtf']
  await expect(() => command.run()).rejects.toThrow('Nonexistent flag: --wtf\nSee more help with --help')
})

test('.aio config missing', async () => {
  config.get = vi.fn() // return nothing from the config
  command.argv = []
  await expect(command.run()).rejects.toThrow('Incomplete .aio configuration')
})

test('--yes', async () => {
  const installOptions = {
    useDefaultValues: true,
    installNpm: true,
    templates: ['@adobe/my-extension'],
    templateOptions: expect.any(Object)
  }

  command.argv = ['--yes']
  inquirer.prompt.mockResolvedValue({
    components: 'allActionTemplates'
  })

  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
})

test('--yes --no-install', async () => {
  const installOptions = {
    useDefaultValues: true,
    installNpm: false,
    templates: ['@adobe/my-extension'],
    templateOptions: expect.any(Object)
  }

  command.argv = ['--yes', '--no-install']
  inquirer.prompt.mockResolvedValue({
    components: 'allActionTemplates'
  })
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
})

test('--no-install', async () => {
  const installOptions = {
    useDefaultValues: false,
    installNpm: false,
    templates: ['@adobe/my-extension'],
    templateOptions: expect.any(Object)
  }

  command.argv = ['--no-install']
  inquirer.prompt.mockResolvedValue({
    components: 'allActionTemplates'
  })
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
})

test('--extension', async () => {
  const installOptions = {
    useDefaultValues: false,
    installNpm: true,
    templates: ['@adobe/my-extension'],
    templateOptions: expect.any(Object)
  }

  command.argv = ['--extension', 'application']
  inquirer.prompt.mockResolvedValue({
    components: 'allActionTemplates'
  })
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
})

test('no flags (all action templates)', async () => {
  const installOptions = {
    useDefaultValues: false,
    installNpm: true,
    templates: ['@adobe/my-extension'],
    templateOptions: expect.any(Object)
  }

  command.argv = []
  inquirer.prompt.mockResolvedValue({
    components: 'allActionTemplates'
  })
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])

  await command.run()
  expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
})

test('no flags (org action templates)', async () => {
  const installOptions = {
    useDefaultValues: false,
    installNpm: true,
    templates: ['@adobe/my-extension'],
    templateOptions: expect.any(Object)
  }

  command.argv = []
  inquirer.prompt.mockResolvedValue({
    components: 'orgActionTemplates'
  })
  command.selectTemplates.mockResolvedValue(['@adobe/my-extension'])
  mockGetEnabledServicesForOrg.mockResolvedValue([{ code: 'MyServiceCode' }])
  await command.run()
  expect(command.installTemplates).toHaveBeenCalledWith(installOptions)
})

test('no templates selected', async () => {
  command.argv = []
  inquirer.prompt.mockResolvedValue({
    components: 'allActionTemplates'
  })
  command.selectTemplates.mockResolvedValue([])

  await expect(command.run()).rejects.toThrow('No action templates were chosen to be installed.')
})

test('multiple ext configs', async () => {
  command.getAppExtConfigs.mockResolvedValue({ application: 'value', excshell: 'value' })
  await expect(command.run()).rejects.toThrow('Please use the \'-e\' flag to specify to which implementation you want to add actions to.')
})
