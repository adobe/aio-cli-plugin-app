/*
Copyright 2019 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { stdout } = require('stdout-stderr')
const TheCommand = require('../../../../../../src/commands/app/config/get/log-forwarding/errors.js')
const rtLib = require('@adobe/aio-lib-runtime')
const { setRuntimeApiHostAndAuthHandler } = require('../../../../../../src/lib/auth-helper')

jest.mock('@adobe/aio-lib-runtime', () => ({
  init: jest.fn(),
  utils: {
    checkOpenWhiskCredentials: jest.fn()
  }
}))

jest.mock('../../../../../../src/lib/auth-helper', () => ({
  setRuntimeApiHostAndAuthHandler: jest.fn(config => config)
}))

let command, logForwarding
beforeEach(async () => {
  command = new TheCommand([])
  command.appConfig = {
    aio: {
      runtime: {
        namespace: 'fake_ns',
        auth: 'fake:auth',
        apihost: 'https://adobeioruntime.net',
        apiversion: 'v1',
        package: 'sample-app-1.0.0'
      }
    }
  }
  logForwarding = {
    getErrors: jest.fn()
  }
  rtLib.init.mockResolvedValue({ logForwarding })
})

test('get log forwarding errors with errors', async () => {
  const errors = ['Error 1', 'Error 2']
  logForwarding.getErrors.mockResolvedValue({
    errors,
    configured_forwarder: 'test-destination'
  })

  await command.run()
  expect(stdout.output).toContain('Log forwarding errors for the last configured destination \'test-destination\':')
  expect(stdout.output).toContain('Error 1')
  expect(stdout.output).toContain('Error 2')
})

test('get log forwarding errors without errors', async () => {
  logForwarding.getErrors.mockResolvedValue({
    errors: [],
    configured_forwarder: 'test-destination'
  })

  await command.run()
  expect(stdout.output).toContain('No log forwarding errors for the last configured destination \'test-destination\'')
})

test('get log forwarding errors without configured forwarder', async () => {
  logForwarding.getErrors.mockResolvedValue({
    errors: ['Error 1']
  })

  await command.run()
  expect(stdout.output).toContain('Log forwarding errors:')
  expect(stdout.output).toContain('Error 1')
})

test('get log forwarding errors with deploy service enabled', async () => {
  process.env.IS_DEPLOY_SERVICE_ENABLED = 'true'
  logForwarding.getErrors.mockResolvedValue({
    errors: []
  })

  await command.run()
  expect(setRuntimeApiHostAndAuthHandler).toHaveBeenCalledWith(command.appConfig.aio)
  expect(rtLib.init).toHaveBeenCalledWith({
    ...command.appConfig.aio.runtime,
    api_key: command.appConfig.aio.runtime.auth
  })

  delete process.env.IS_DEPLOY_SERVICE_ENABLED
})

test('failed to get log forwarding errors', async () => {
  logForwarding.getErrors.mockRejectedValue(new Error('mocked error'))
  await expect(command.run()).rejects.toThrow('mocked error')
})

test('command aliases are set correctly', () => {
  expect(TheCommand.aliases).toEqual(['app:config:get:log-forwarding:errors', 'app:config:get:lf:errors'])
})

test('command description is set correctly', () => {
  expect(TheCommand.description).toBe('Get log forwarding errors')
})
