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
const TheCommand = require('../../../../../src/commands/app/config/get/log-forwarding.js')
const LogForwarding = require('../../../../../src/lib/log-forwarding')

jest.mock('../../../../../src/lib/log-forwarding', () => {
  const orig = jest.requireActual('../../../../../src/lib/log-forwarding')
  return {
    ...orig,
    init: jest.fn()
  }
})

let command, lf
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
  lf = {
    getLocalConfig: jest.fn(),
    getServerConfig: jest.fn()
  }

  LogForwarding.init.mockResolvedValue(lf)
})

test('get log forwarding settings (expect init to be passed a config)', async () => {
  const localConfig = new LogForwarding.LogForwardingConfig()
  const serverConfig = new LogForwarding.LogForwardingConfig()

  lf.getLocalConfig.mockReturnValue(localConfig)
  lf.getServerConfig.mockResolvedValue(serverConfig)

  await command.run()
  // config should be deploy service settings
  const modifiedConfig = structuredClone(command.appConfig.aio)
  modifiedConfig.runtime.apihost = 'https://deploy-service.stg.app-builder.adp.adobe.io/runtime' // aio-lib-env is mocked to return 'stage'
  modifiedConfig.runtime.auth_handler = {
    getAuthHeader: expect.any(Function)
  }
  expect(LogForwarding.init).toHaveBeenCalledWith(modifiedConfig)
})

test('get log forwarding settings (local and server are the same)', async () => {
  return new Promise(resolve => {
    const localConfig = new LogForwarding.LogForwardingConfig(
      'destination',
      { field_one: 'value one', field_two: 'value two' }
    )
    const serverConfig = new LogForwarding.LogForwardingConfig(
      'destination',
      { field_one: 'value one', field_two: 'value two', updated_at: '2021-08-27T14:40:06.000+00:00' }
    )

    lf.getLocalConfig.mockReturnValue(localConfig)
    lf.getServerConfig.mockResolvedValue(serverConfig)

    return command.run()
      .then(() => {
        expect(stdout.output).toEqual('destination: destination\n' +
          'settings: {\n' +
          "  field_one: 'value one',\n" +
          "  field_two: 'value two',\n" +
          "  updated_at: '2021-08-27T14:40:06.000+00:00'\n" +
          '}\n')
        resolve()
      })
  })
})

test('get log forwarding settings (no local and server config)', async () => {
  return new Promise(resolve => {
    const localConfig = new LogForwarding.LogForwardingConfig()
    const serverConfig = new LogForwarding.LogForwardingConfig()

    lf.getLocalConfig.mockReturnValue(localConfig)
    lf.getServerConfig.mockResolvedValue(serverConfig)

    return command.run()
      .then(() => {
        expect(stdout.output).toEqual('Not defined\n')
        resolve()
      })
  })
})

test('get log forwarding settings (local and server are different)', async () => {
  return new Promise(resolve => {
    const localConfig = new LogForwarding.LogForwardingConfig(
      'destination_one',
      { field_one: 'value one', field_two: 'value two' }
    )
    const serverConfig = new LogForwarding.LogForwardingConfig(
      'destination_two',
      { field_one: 'value two', field_three: 'value three', updated_at: '2021-08-27T14:40:06.000+00:00' }
    )

    lf.getLocalConfig.mockReturnValue(localConfig)
    lf.getServerConfig.mockResolvedValue(serverConfig)

    return command.run()
      .then(() => {
        expect(stdout.output).toEqual('Local and server log forwarding configuration is different\n' +
          "Run either 'aio app:deploy' to update the server, or 'aio app:config:set:log-forwarding' to set new local and server configuration\n" +
          'Local configuration:\n' +
          'destination: destination_one\n' +
          "settings: { field_one: 'value one', field_two: 'value two' }\n\n" +
          'Server configuration:\n' +
          'destination: destination_two\n' +
          'settings: {\n' +
          "  field_one: 'value two',\n" +
          "  field_three: 'value three',\n" +
          "  updated_at: '2021-08-27T14:40:06.000+00:00'\n" +
          '}\n')
        resolve()
      })
  })
})

test('get log forwarding settings (no local config)', async () => {
  return new Promise(resolve => {
    const localConfig = new LogForwarding.LogForwardingConfig()
    const serverConfig = new LogForwarding.LogForwardingConfig(
      'destination_two',
      { field_one: 'value two', field_three: 'value three', updated_at: '2021-08-27T14:40:06.000+00:00' }
    )

    lf.getLocalConfig.mockReturnValue(localConfig)
    lf.getServerConfig.mockResolvedValue(serverConfig)

    return command.run()
      .then(() => {
        expect(stdout.output).toEqual('Local and server log forwarding configuration is different\n' +
          "Run 'aio app:config:set:log-forwarding' to set new local and server configuration\n" +
          'Local configuration:\n' +
          'Not defined\n\n' +
          'Server configuration:\n' +
          'destination: destination_two\n' +
          'settings: {\n' +
          "  field_one: 'value two',\n" +
          "  field_three: 'value three',\n" +
          "  updated_at: '2021-08-27T14:40:06.000+00:00'\n" +
          '}\n')
        resolve()
      })
  })
})

test('get log forwarding settings (no server config)', async () => {
  return new Promise(resolve => {
    const localConfig = new LogForwarding.LogForwardingConfig(
      'destination_one',
      { field_one: 'value one', field_two: 'value two' }
    )
    const serverConfig = new LogForwarding.LogForwardingConfig()

    lf.getLocalConfig.mockReturnValue(localConfig)
    lf.getServerConfig.mockResolvedValue(serverConfig)

    return command.run()
      .then(() => {
        expect(stdout.output).toEqual('Local and server log forwarding configuration is different\n' +
          "Run either 'aio app:deploy' to update the server, or 'aio app:config:set:log-forwarding' to set new local and server configuration\n" +
          'Local configuration:\n' +
          'destination: destination_one\n' +
          "settings: { field_one: 'value one', field_two: 'value two' }\n\n" +
          'Server configuration:\n' +
          'Not defined\n')
        resolve()
      })
  })
})

test('failed to get log forwarding settings', async () => {
  lf.getServerConfig.mockRejectedValue(new Error('mocked error'))
  await expect(command.run()).rejects.toThrow('mocked error')
})

test('command aliases are set correctly', () => {
  expect(TheCommand.aliases).toEqual(['app:config:get:log-forwarding', 'app:config:get:lf'])
})

test('command description is set correctly', () => {
  expect(TheCommand.description).toBe('Get log forwarding destination configuration')
})
