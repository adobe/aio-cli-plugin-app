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

import TheCommand from '../../../../../../src/commands/app/config/get/log-forwarding/errors.js'
import rtLib from '@adobe/aio-lib-runtime'
import ora from 'ora'

vi.mock('@adobe/aio-lib-runtime', () => ({
  default: {
    init: vi.fn(),
    utils: {
      checkOpenWhiskCredentials: vi.fn()
    }
  }
}))

let command, logForwarding
beforeEach(async () => {
  command = new TheCommand([])
  command.config = global.createOclifMockConfig()
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
    getErrors: vi.fn()
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
  const spinner = ora()
  expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Log forwarding errors for the last configured destination \'test-destination\':'))
  expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Error 1'))
  expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Error 2'))
})

test('get log forwarding errors without errors', async () => {
  logForwarding.getErrors.mockResolvedValue({
    errors: [],
    configured_forwarder: 'test-destination'
  })

  await command.run()
  const spinner = ora()
  expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('No log forwarding errors for the last configured destination \'test-destination\''))
})

test('get log forwarding errors without configured forwarder', async () => {
  logForwarding.getErrors.mockResolvedValue({
    errors: ['Error 1']
  })

  await command.run()
  const spinner = ora()
  expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Log forwarding errors:'))
  expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Error 1'))
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
