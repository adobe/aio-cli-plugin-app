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

const TheCommand = require('../../../../../../src/commands/app/config/get/log-forwarding/errors')
const RuntimeLib = require('@adobe/aio-lib-runtime')
const ora = require('ora')

jest.mock('ora')

let command, rtLib, spinner
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
  rtLib = await RuntimeLib.init({ apihost: 'https://adobeioruntime.net', api_key: 'fake:auth' })
  RuntimeLib.utils.checkOpenWhiskCredentials = jest.fn()
  rtLib.logForwarding.getErrors = jest.fn()
  spinner = ora()
})

test('app:config:get:log-forwarding:errors command', async () => {
  return new Promise(resolve => {
    rtLib.logForwarding.getErrors.mockResolvedValue({
      configured_forwarder: 'destination',
      errors: [
        'error 1',
        'error 2'
      ]
    })

    return command.run()
      .then(() => {
        expect(spinner.succeed)
          .toBeCalledWith("Log forwarding errors for the last configured destination 'destination':\nerror 1\nerror 2")
        resolve()
      })
  })
})

test('app:config:get:log-forwarding:errors command - no destination returned from the server', async () => {
  return new Promise(resolve => {
    rtLib.logForwarding.getErrors.mockResolvedValue({
      errors: [
        'error 1',
        'error 2'
      ]
    })

    return command.run()
      .then(() => {
        expect(spinner.succeed).toBeCalledWith('Log forwarding errors:\nerror 1\nerror 2')
        resolve()
      })
  })
})

test('app:config:get:log-forwarding:errors command - no errors', async () => {
  return new Promise(resolve => {
    rtLib.logForwarding.getErrors.mockResolvedValue({
      configured_forwarder: 'destination',
      errors: []
    })

    return command.run()
      .then(() => {
        expect(spinner.succeed)
          .toBeCalledWith("No log forwarding errors for the last configured destination 'destination'")
        resolve()
      })
  })
})

test('app:config:get:log-forwarding:errors command - no errors and no destination returned from the server', async () => {
  return new Promise(resolve => {
    rtLib.logForwarding.getErrors.mockResolvedValue({
      errors: []
    })

    return command.run()
      .then(() => {
        expect(spinner.succeed).toBeCalledWith('No log forwarding errors')
        resolve()
      })
  })
})

test('app:config:get:log-forwarding:errors command - failed response from server', async () => {
  rtLib.logForwarding.getErrors.mockRejectedValue(new Error('mocked error'))
  await expect(command.run()).rejects.toThrow('mocked error')
})
