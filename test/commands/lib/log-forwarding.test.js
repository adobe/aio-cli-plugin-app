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

const RuntimeLib = require('@adobe/aio-lib-runtime')
const LogForwarding = require('../../../src/lib/log-forwarding')
const { writeAio, writeEnv } = require('../../../src/lib/import-helper')
const fs = require('fs-extra')
const path = require('path')

jest.mock('../../../src/lib/import-helper', () => {
  return {
    writeAio: jest.fn(),
    writeEnv: jest.fn()
  }
})
jest.mock('fs-extra')

const rtConfig = {
  namespace: 'fake_ns',
  auth: 'fake:auth',
  apihost: 'https://adobeioruntime.net',
  apiversion: 'v1',
  package: 'sample-app-1.0.0'
}

const LF_CONFIGPATH = path.join('dist', 'log-forwarding-config.sha256')

let lf, rtLib

beforeEach(async () => {
  rtLib = await RuntimeLib.init({ apihost: 'https://adobeioruntime.net', api_key: 'fakekey' })
  RuntimeLib.utils.checkOpenWhiskCredentials = jest.fn()
  rtLib.logForwarding.getDestinationSettings = jest.fn().mockReturnValue([
    {
      name: 'field',
      message: 'Field'
    },
    {
      name: 'secret_field',
      message: 'Secret',
      type: 'password'
    }
  ])
})

test('getLocalConfig (adobe_io_runtime)', async () => {
  const aioConfig = {
    project: {
      workspace: {
        log_forwarding: {
          adobe_io_runtime: {}
        }
      }
    },
    runtime: rtConfig
  }
  lf = await LogForwarding.init(aioConfig)
  const expected = new LogForwarding.LogForwardingConfig('adobe_io_runtime', {})
  expect(lf.getLocalConfig()).toEqual(expected)
  expect(lf.getLocalConfig().isDefault()).toEqual(true)
})

describe('with local log forwarding config', () => {
  beforeEach(async () => {
    const aioConfig = {
      project: {
        workspace: {
          log_forwarding: {
            destination: {
              field: 'value'
            }
          }
        }
      },
      runtime: rtConfig
    }
    lf = await LogForwarding.init(aioConfig)
  })

  test('getLocalConfig (custom)', async () => {
    const expected = new LogForwarding.LogForwardingConfig(
      'destination',
      {
        field: 'value'
      })
    expect(lf.getLocalConfig()).toEqual(expected)
  })

  test('getLocalConfigWithSecrets (fails due to not defined secrets in env vars)', async () => {
    expect(() => lf.getLocalConfigWithSecrets()).toThrow('Required secrets are missing in environment variables: DESTINATION__SECRET_FIELD')
  })
})

describe('with secrets in env vars', () => {
  const originalEnv = process.env
  beforeEach(async () => {
    jest.resetModules()
    const aioConfig = {
      project: {
        workspace: {
          log_forwarding: {
            destination: {
              field: 'value'
            }
          }
        }
      },
      runtime: rtConfig
    }
    process.env = {
      ...originalEnv,
      DESTINATION__SECRET_FIELD: 'secret'
    }
    lf = await LogForwarding.init(aioConfig)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('getLocalConfigWithSecrets', async () => {
    const expected = new LogForwarding.LogForwardingConfig(
      'destination',
      {
        field: 'value',
        secret_field: 'secret'
      })
    expect(lf.getLocalConfigWithSecrets()).toEqual(expected)
  })

  test('isLocalConfigChanged (not changed)', async () => {
    fs.pathExistsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue('e35c04da5060b3aa1406a907ca149f5d974d5ada308163046080c02c98796cf9')
    expect(lf.isLocalConfigChanged()).toEqual(false)
    expect(fs.pathExistsSync).toHaveBeenCalledWith(LF_CONFIGPATH)
  })

  test('isLocalConfigChanged (changed)', async () => {
    fs.pathExistsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue('outdated-checksum')
    expect(lf.isLocalConfigChanged()).toEqual(true)
    expect(fs.pathExistsSync).toHaveBeenCalledWith(LF_CONFIGPATH)
  })
})

describe('absent local log forwarding config', () => {
  beforeEach(async () => {
    const aioConfig = {
      project: {
        workspace: {}
      },
      runtime: rtConfig
    }
    lf = await LogForwarding.init(aioConfig)
  })

  test('getLocalConfig (undefined)', async () => {
    expect(lf.getLocalConfig().isDefault()).toEqual(true)
  })

  test('getLocalConfigWithSecrets (undefined config)', async () => {
    const expected = new LogForwarding.LogForwardingConfig()
    expect(lf.getLocalConfigWithSecrets()).toEqual(expected)
  })

  test('getServerConfig', async () => {
    rtLib.logForwarding.get = jest.fn().mockReturnValue({
      destination: {
        updated_at: '2021-08-27T14:40:06.000+00:00',
        some_key: 'some_value'
      }
    })
    const expected = new LogForwarding.LogForwardingConfig('destination', {
      updated_at: '2021-08-27T14:40:06.000+00:00',
      some_key: 'some_value'
    })
    expect(await lf.getServerConfig()).toEqual(expected)
  })

  test('getServerConfig (failed response)', async () => {
    rtLib.logForwarding.get = jest.fn().mockRejectedValue(new Error('mocked error'))
    await expect(lf.getServerConfig()).rejects.toThrow('mocked error')
  })

  test.each([
    [0, {}],
    [2, {
      destination1: {},
      destination2: {}
    }]
  ])('getServerConfig (incorrectly defined multiple destinations)', async (expectedDestinations, settings) => {
    rtLib.logForwarding.get = jest.fn().mockReturnValue(settings)
    await expect(() => lf.getServerConfig())
      .rejects
      .toThrow(`Incorrect log forwarding configuration on server. Configuration has ${expectedDestinations} destinations. Exactly one must be defined.`)
  })

  test('getSupportedDestinations', async () => {
    const destinations = { value: 'val', name: 'name' }
    rtLib.logForwarding.getSupportedDestinations = jest.fn().mockReturnValue(destinations)
    expect(lf.getSupportedDestinations()).toEqual({ value: 'val', name: 'name' })
  })

  test('getSettingsConfig', async () => {
    const config = [{
      name: 'name',
      message: 'message',
      type: 'type'
    }]
    rtLib.logForwarding.getDestinationSettings = jest.fn().mockReturnValue(config)
    expect(lf.getSettingsConfig('destination')).toEqual(config)
  })

  test('updateLocalConfig', async () => {
    const newConfig = new LogForwarding.LogForwardingConfig('destination', {
      field: 'val',
      secret_field: 'secret'
    })

    const expectedNonSecretConfig = {
      project: {
        workspace: {
          log_forwarding: {
            destination: {
              field: 'val'
            }
          }
        }
      }
    }

    const expectedSecretConfig = {
      DESTINATION__SECRET_FIELD: 'secret'
    }
    const interactive = false
    const merge = true

    await lf.updateLocalConfig(newConfig)
    expect(writeAio).toHaveBeenCalledWith(expectedNonSecretConfig, '', { interactive, merge })
    expect(writeEnv).toHaveBeenCalledWith({}, '', { interactive, merge }, expectedSecretConfig)
  })
})

test.each([
  [0, {}],
  [2, {
    destination1: {},
    destination2: {}
  }]
])('getLocalConfig (incorrectly defined destinations)', async (expectedDestinations, settings) => {
  const aioConfig = {
    project: {
      workspace: {
        log_forwarding: settings
      }
    },
    runtime: rtConfig
  }
  lf = await LogForwarding.init(aioConfig)
  expect(() => lf.getLocalConfig())
    .toThrow(`Incorrect local log forwarding configuration. Configuration has ${expectedDestinations} destinations. Exactly one must be defined.`)
})

describe('with checksum file', () => {
  beforeEach(() => {
    fs.readFileSync.mockReset()
  })

  test('isLocalConfigChanged (new config - no checksum)', async () => {
    fs.pathExistsSync.mockReturnValue(false)
    expect(lf.isLocalConfigChanged()).toEqual(true)
    expect(fs.pathExistsSync).toHaveBeenCalledWith(LF_CONFIGPATH)
    expect(fs.readFileSync).toHaveBeenCalledTimes(0)
  })

  test('updateServerConfig', async () => {
    const settings = {
      new_field: 'new value',
      new_secret_field: 'new secret'
    }
    const sanitizedSettings = {
      new_field: 'new value sanitized',
      new_secret_field: 'new secret sanitized'
    }

    rtLib.logForwarding.setDestination = jest.fn().mockResolvedValue({
      new_destination: sanitizedSettings
    })

    const config = new LogForwarding.LogForwardingConfig('new_destination', settings)

    expect(await lf.updateServerConfig(config)).toEqual({
      new_destination: sanitizedSettings
    })
    expect(rtLib.logForwarding.setDestination).toHaveBeenCalledWith('new_destination', settings)
    expect(fs.ensureDirSync).toHaveBeenCalledWith('dist')
    expect(fs.writeFile).toHaveBeenCalledWith(
      LF_CONFIGPATH,
      'a431a2616cbca2a7f017d3829dceb25d0f90f4dc285e0fa74796fa223576ea96',
      { flags: 'w' }
    )
  })
})

test('log forwarding configs are equal', () => {
  const config1 = new LogForwarding.LogForwardingConfig('destination', { field: 'value', updated_at: 'some time ago' })
  const config2 = new LogForwarding.LogForwardingConfig('destination', { field: 'value' })
  expect(config1.isEqual(config2)).toEqual(true)
  expect(config2.isEqual(config1)).toEqual(true)
})

test('absent and default log forwarding configs are equal', () => {
  const config1 = new LogForwarding.LogForwardingConfig(undefined, { })
  const config2 = new LogForwarding.LogForwardingConfig('adobe_io_runtime', { })
  expect(config1.isEqual(config2)).toEqual(true)
  expect(config2.isEqual(config1)).toEqual(true)
})

test.each([
  [
    'different destinations with identical settings',
    'destination1',
    'destination2',
    { field: 'value' },
    { field: 'value' }
  ],
  [
    'different destinations and setting values',
    'destination1',
    'destination2',
    { field: 'value' },
    { field: 'another value' }
  ],
  [
    'different destinations and setting fields',
    'destination1',
    'destination2',
    { field: 'value' },
    { field: 'value', another_field: 'another value' }
  ],
  [
    'same destinations and different setting values',
    'destination',
    'destination',
    { field: 'value' },
    { field: 'another value' }
  ],
  [
    'same destinations and different setting fields',
    'destination',
    'destination',
    { field: 'value' },
    { field: 'value', another_field: 'another value' }
  ]
])('%s', (fixtureName, dst1, dst2, dstConfig1, dstConfig2) => {
  const config1 = new LogForwarding.LogForwardingConfig(dst1, dstConfig1)
  const config2 = new LogForwarding.LogForwardingConfig(dst2, dstConfig2)
  expect(config1.isEqual(config2)).toEqual(false)
  expect(config2.isEqual(config1)).toEqual(false)
})
