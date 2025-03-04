/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const deployActions = require('../../../src/lib/deploy-actions')
const { deployActions: rtDeployActions } = require('@adobe/aio-lib-runtime')
const utils = require('../../../src/lib/app-helper')
const appHelperActual = jest.requireActual('../../../src/lib/app-helper')

jest.mock('../../../src/lib/app-helper')

const createWebExportAnnotation = (value) => ({
  annotations: { 'web-export': value }
})

beforeEach(() => {
  utils.runInProcess.mockReset()
  utils.createWebExportFilter.mockReset()

  rtDeployActions.mockReset()
  rtDeployActions.mockImplementation(() => ({}))

  utils.createWebExportFilter.mockImplementation(filterValue => appHelperActual.createWebExportFilter(filterValue))
})

test('exports', () => {
  expect(typeof deployActions).toEqual('function')
})

test('deploy-actions app hook available', async () => {
  utils.runInProcess.mockImplementation(script => {
    if (script === 'deploy-actions') {
      return script
    }
  })

  const config = {
    hooks: {
      'deploy-actions': 'deploy-actions'
    }
  }
  await deployActions({ config })

  expect(rtDeployActions).not.toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenNthCalledWith(1, undefined, expect.any(Object)) // pre-app-deploy
  expect(utils.runInProcess).toHaveBeenNthCalledWith(2, 'deploy-actions', expect.any(Object))
  expect(utils.runInProcess).toHaveBeenNthCalledWith(3, undefined, expect.any(Object)) // post-app-deploy
})

test('it should deploy actions with filter param, (coverage)', async () => {
  utils.runInProcess.mockImplementation(() => false)

  const config = {
    hooks: {
      'deploy-actions': 'deploy-actions'
    }
  }
  const deployConfig = {
    filterEntities: {
      byBuiltActions: true
    }
  }
  await deployActions({ config, deployConfig })

  expect(rtDeployActions).toHaveBeenCalled()
  expect(rtDeployActions).toHaveBeenCalledWith(
    expect.objectContaining({
      hooks: { 'deploy-actions': 'deploy-actions' }
    }),
    expect.objectContaining({
      filterEntities: {
        byBuiltActions: true
      }
    }),
    expect.any(Function)
  )
})

test('no deploy-actions app hook available (use inbuilt)', async () => {
  const config = { hooks: {} }
  await deployActions({ config })
  expect(rtDeployActions).toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenNthCalledWith(1, undefined, expect.any(Object)) // pre-app-deploy
  expect(utils.runInProcess).toHaveBeenNthCalledWith(2, undefined, expect.any(Object)) // deploy-actions
  expect(utils.runInProcess).toHaveBeenNthCalledWith(3, undefined, expect.any(Object)) // post-app-deploy
})

test('call inprocHook no filter', async () => {
  const mockHook = jest.fn()
  const config = { hooks: {} }
  const deployConfig = {
    isLocalDev: false,
    filterEntities: {}
  }
  await deployActions({ config, deployConfig, log: null, inprocHook: mockHook })
  expect(mockHook).toHaveBeenCalledWith('deploy-actions', expect.objectContaining({
    appConfig: { hooks: {} },
    filterEntities: [],
    isLocalDev: false
  }))
  expect(rtDeployActions).toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenNthCalledWith(1, undefined, expect.any(Object)) // pre-app-deploy
  expect(utils.runInProcess).toHaveBeenNthCalledWith(2, undefined, expect.any(Object)) // deploy-actions
  expect(utils.runInProcess).toHaveBeenNthCalledWith(3, undefined, expect.any(Object)) // post-app-deploy
})

test('call inprocHook with filter : isLocalDev false', async () => {
  const mockHook = jest.fn()
  const config = { hooks: {} }
  const deployConfig = {
    isLocalDev: false,
    filterEntities: {
      actions: ['boomer']
    }
  }
  await deployActions({ config, deployConfig, log: null, inprocHook: mockHook })
  expect(mockHook).toHaveBeenCalledWith('deploy-actions', expect.objectContaining({
    appConfig: { hooks: {} },
    filterEntities: ['boomer'],
    isLocalDev: false
  }))
  expect(rtDeployActions).toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenNthCalledWith(1, undefined, expect.any(Object)) // pre-app-deploy
  expect(utils.runInProcess).toHaveBeenNthCalledWith(2, undefined, expect.any(Object)) // deploy-actions
  expect(utils.runInProcess).toHaveBeenNthCalledWith(3, undefined, expect.any(Object)) // post-app-deploy
})

test('call inprocHook with filter : isLocalDev true', async () => {
  const mockHook = jest.fn()
  const config = { hooks: {} }
  const deployConfig = {
    isLocalDev: true,
    filterEntities: {
      actions: ['action-1', 'action-2']
    }
  }
  await deployActions({ config, deployConfig, log: null, inprocHook: mockHook })
  expect(mockHook).toHaveBeenCalledWith('deploy-actions', expect.objectContaining({
    appConfig: { hooks: {} },
    filterEntities: ['action-1', 'action-2'],
    isLocalDev: true
  }))
  expect(rtDeployActions).toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenNthCalledWith(1, undefined, expect.any(Object)) // pre-app-deploy
  expect(utils.runInProcess).toHaveBeenNthCalledWith(2, undefined, expect.any(Object)) // deploy-actions
  expect(utils.runInProcess).toHaveBeenNthCalledWith(3, undefined, expect.any(Object)) // post-app-deploy
})

test('throws if hook returns failures', async () => {
  const mockHook = jest.fn().mockResolvedValueOnce({
    successes: [],
    failures: [{ plugin: { name: 'ifailedu' }, error: 'some error' }]
  })
  const mockLog = jest.fn()
  const config = { hooks: {} }
  const deployConfig = {
    isLocalDev: true,
    filterEntities: {
      actions: ['action-1', 'action-2']
    }
  }
  await expect(deployActions({ config, deployConfig, log: mockLog, inprocHook: mockHook }))
    .rejects.toThrow('Hook \'deploy-actions\' failed with some error')
  expect(mockHook).toHaveBeenCalledWith('deploy-actions', expect.objectContaining({
    appConfig: { hooks: {} },
    filterEntities: ['action-1', 'action-2'],
    isLocalDev: true
  }))
  expect(rtDeployActions).not.toHaveBeenCalled()
  expect(mockLog).toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenCalledTimes(2)
})

test('use default parameters (coverage)', async () => {
  rtDeployActions.mockResolvedValue({
    actions: [
      { name: 'pkg/action', url: 'https://fake.com/action' },
      { name: 'pkg/actionNoUrl' }
    ]
  })

  const config = { hooks: {} }
  await deployActions({ config })

  expect(rtDeployActions).toHaveBeenCalled()
  expect(utils.runInProcess).toHaveBeenNthCalledWith(1, undefined, expect.any(Object)) // pre-app-deploy
  expect(utils.runInProcess).toHaveBeenNthCalledWith(2, undefined, expect.any(Object)) // deploy-actions
  expect(utils.runInProcess).toHaveBeenNthCalledWith(3, undefined, expect.any(Object)) // post-app-deploy
})

test('should log actions url or name when actions are deployed (web-export: true)', async () => {
  rtDeployActions.mockResolvedValue({
    actions: [
      { name: 'pkg/action', url: 'https://fake.com/action', ...createWebExportAnnotation(true) },
      { name: 'pkg/actionNoUrl', ...createWebExportAnnotation(true) }
    ]
  })
  const log = jest.fn()
  const config = { hooks: {} }
  const deployConfig = {
    isLocalDev: false,
    filterEntities: {}
  }
  await deployActions({ config, deployConfig, log })

  expect(log).toHaveBeenCalledWith(expect.stringContaining('web actions:'))
  expect(log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
  expect(log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
})

test('should log actions url or name when actions are deployed (web-export: false)', async () => {
  rtDeployActions.mockResolvedValue({
    actions: [
      { name: 'pkg/action', url: 'https://fake.com/action', ...createWebExportAnnotation(false) },
      { name: 'pkg/actionNoUrl', ...createWebExportAnnotation(false) }
    ]
  })
  {
    const log = jest.fn()
    const config = { hooks: {} }
    const deployConfig = {
      isLocalDev: false,
      filterEntities: {}
    }
    await deployActions({ config, deployConfig, log })

    expect(log).toHaveBeenCalledWith(expect.stringContaining('non-web actions:'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  }
  {
    const log = jest.fn()
    const config = { hooks: {} }
    const deployConfig = {
      isLocalDev: false,
      filterEntities: {}
    }
    await deployActions({ config, deployConfig }) // empty logger
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('non-web actions:'))
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  }
})
