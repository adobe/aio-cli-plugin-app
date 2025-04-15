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
const TheCommand = require('../../../../../src/commands/app/config/set/log-forwarding.js')
const LogForwarding = require('../../../../../src/lib/log-forwarding')

jest.mock('../../../../../src/lib/auth-helper')
const authHelper = require('../../../../../src/lib/auth-helper')

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
  command.prompt = jest.fn()

  lf = {
    getSupportedDestinations: jest.fn().mockReturnValue([{ value: 'destination', name: 'Destination' }]),
    getSettingsConfig: jest.fn().mockReturnValue({ key: 'value' }),
    updateServerConfig: jest.fn(),
    updateLocalConfig: jest.fn(),
    getConfigFromJson: jest.fn()
  }
  LogForwarding.init.mockResolvedValue(lf)
  authHelper.setRuntimeApiHostAndAuthHandler.mockImplementation(aioConfig => aioConfig)
})

test('set log forwarding destination and save local', async () => {
  const destination = 'destination'
  const input = {
    field_one: 'val_one',
    field_two: 'val_two',
    secret: 'val_secret'
  }
  command.prompt.mockResolvedValueOnce({ type: destination })
  command.prompt.mockResolvedValueOnce(input)
  const serverSanitizedSettings = {
    field_one: 'val_one',
    field_two: 'val_two sanitized'
  }
  const fullSanitizedSettings = {
    field_one: 'val_one',
    field_two: 'val_two sanitized',
    secret: 'val_secret'
  }
  const setCall = jest.fn().mockResolvedValue({
    destination: serverSanitizedSettings
  })
  const localSetCall = jest.fn()
  lf.updateServerConfig = setCall
  lf.updateLocalConfig = localSetCall.mockResolvedValue()
  lf.getConfigFromJson.mockReturnValue(new LogForwarding.LogForwardingConfig(destination, serverSanitizedSettings))

  await expect(command.run()).resolves.not.toThrow()
  expect(command.prompt).toHaveBeenNthCalledWith(1, [{
    name: 'type',
    message: 'select log forwarding destination',
    type: 'list',
    choices: [{ name: 'Destination', value: 'destination' }]
  }])
  expect(stdout.output).toMatch(`Log forwarding is set to '${destination}'\nLog forwarding settings are saved to the local configuration`)
  expect(setCall).toHaveBeenCalledTimes(1)
  expect(setCall).toHaveBeenCalledWith(new LogForwarding.LogForwardingConfig(destination, input))
  expect(localSetCall).toHaveBeenCalledTimes(1)
  expect(localSetCall).toHaveBeenCalledWith(new LogForwarding.LogForwardingConfig(destination, fullSanitizedSettings))
  expect(authHelper.setRuntimeApiHostAndAuthHandler).not.toHaveBeenCalled()
})

test('should Invoke setRuntimeApiHostAndAuthHandler if IS_DEPLOY_SERVICE_ENABLED = ture and set log forwarding destination', async () => {
  process.env.IS_DEPLOY_SERVICE_ENABLED = true
  const destination = 'destination'
  const input = {
    field_one: 'val_one',
    field_two: 'val_two',
    secret: 'val_secret'
  }
  command.prompt.mockResolvedValueOnce({ type: destination })
  command.prompt.mockResolvedValueOnce(input)
  const serverSanitizedSettings = {
    field_one: 'val_one',
    field_two: 'val_two sanitized'
  }
  const fullSanitizedSettings = {
    field_one: 'val_one',
    field_two: 'val_two sanitized',
    secret: 'val_secret'
  }
  const setCall = jest.fn().mockResolvedValue({
    destination: serverSanitizedSettings
  })
  const localSetCall = jest.fn()
  lf.updateServerConfig = setCall
  lf.updateLocalConfig = localSetCall.mockResolvedValue()
  lf.getConfigFromJson.mockReturnValue(new LogForwarding.LogForwardingConfig(destination, serverSanitizedSettings))

  await expect(command.run()).resolves.not.toThrow()
  expect(command.prompt).toHaveBeenNthCalledWith(1, [{
    name: 'type',
    message: 'select log forwarding destination',
    type: 'list',
    choices: [{ name: 'Destination', value: 'destination' }]
  }])
  expect(stdout.output).toMatch(`Log forwarding is set to '${destination}'\nLog forwarding settings are saved to the local configuration`)
  expect(setCall).toHaveBeenCalledTimes(1)
  expect(setCall).toHaveBeenCalledWith(new LogForwarding.LogForwardingConfig(destination, input))
  expect(localSetCall).toHaveBeenCalledTimes(1)
  expect(localSetCall).toHaveBeenCalledWith(new LogForwarding.LogForwardingConfig(destination, fullSanitizedSettings))
  expect(authHelper.setRuntimeApiHostAndAuthHandler).toHaveBeenCalledTimes(1)
  process.env.IS_DEPLOY_SERVICE_ENABLED = false
})

test('set log forwarding destination and fail save local', async () => {
  const destination = 'destination'
  const input = {
    field_one: 'val_one',
    field_two: 'val_two',
    secret: 'val_secret'
  }
  command.prompt.mockResolvedValueOnce({ type: destination })
  command.prompt.mockResolvedValueOnce(input)
  const serverSanitizedSettings = {
    field_one: 'val_one',
    field_two: 'val_two sanitized'
  }
  const fullSanitizedSettings = {
    field_one: 'val_one',
    field_two: 'val_two sanitized',
    secret: 'val_secret'
  }
  const setCall = jest.fn().mockResolvedValue({
    destination: serverSanitizedSettings
  })
  const localSetCall = jest.fn()
  lf.updateServerConfig = setCall
  lf.updateLocalConfig = localSetCall.mockRejectedValue(Error('mocked error'))
  lf.getConfigFromJson.mockReturnValue(new LogForwarding.LogForwardingConfig(destination, serverSanitizedSettings))
  await expect(command.run()).resolves.not.toThrow('mocked error')
  expect(command.prompt).toHaveBeenNthCalledWith(1, [{
    name: 'type',
    message: 'select log forwarding destination',
    type: 'list',
    choices: [{ name: 'Destination', value: 'destination' }]
  }])
  expect(stdout.output).toMatch(`Log forwarding is set to '${destination}'\n`)
  expect(setCall).toHaveBeenCalledTimes(1)
  expect(setCall).toHaveBeenCalledWith(new LogForwarding.LogForwardingConfig(destination, input))
  expect(localSetCall).toHaveBeenCalledTimes(1)
  expect(localSetCall).toHaveBeenCalledWith(new LogForwarding.LogForwardingConfig(destination, fullSanitizedSettings))
})

test('failed to set log forwarding settings', async () => {
  const destination = 'destination'
  const input = {
    field_one: 'val_one',
    field_two: 'val_two'
  }
  command.prompt.mockResolvedValueOnce({ type: destination })
  lf.updateServerConfig = jest.fn().mockRejectedValue(new Error(`mocked error for ${destination}`))
  command.prompt.mockResolvedValueOnce(input)
  await expect(command.run()).rejects.toThrow(`mocked error for ${destination}`)
})
