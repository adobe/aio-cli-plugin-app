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

const path = require('path')

jest.mock('execa')
const execa = require('execa')

const aioLogger = require('@adobe/aio-lib-core-logging')()

beforeEach(() => {
  execa.sync.mockReset()
  delete process.env.OW_LOCAL_NAMESPACE
  delete process.env.OW_CONFIG_RUNTIMES_FILE
  delete process.env.OW_LOCAL_AUTH
  delete process.env.OW_JAR_URL
  delete process.env.OW_LOCAL_APIHOST
  aioLogger.debug.mockReset()
})

describe('owlocal', () => {
  test('exports', () => {
    let owLocal
    jest.isolateModules(() => {
      owLocal = require('../../../src/lib/owlocal')
    })
    expect(typeof owLocal.getDockerNetworkAddress).toEqual('function')
    expect(owLocal.OW_CONFIG_RUNTIMES_FILE).toEqual(expect.stringContaining(path.normalize('/bin/openwhisk-standalone-config/runtimes.json')))
    expect(owLocal.OW_JAR_URL).toMatch('https://github.com/adobe/aio-cli-plugin-app/releases/download/6.2.0/openwhisk-standalone.jar')
    expect(owLocal.OW_JAR_PATH).toMatch(path.join('openwhisk', 'openwhisk-standalone.jar'))
    expect(owLocal.OW_LOCAL_NAMESPACE).toMatch('guest')
    expect(owLocal.OW_LOCAL_AUTH).toMatch('23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP')
  })

  test('exports can be overwritten by process env', () => {
    process.env.OW_LOCAL_NAMESPACE = 'dude'
    process.env.OW_CONFIG_RUNTIMES_FILE = 'file'
    process.env.OW_LOCAL_AUTH = '123'
    process.env.OW_JAR_URL = 'https://example.com/openwhisk/foo/bar.jar'
    process.env.OW_LOCAL_APIHOST = 'fake.com'
    let owLocal
    jest.isolateModules(() => {
      owLocal = require('../../../src/lib/owlocal')
    })
    expect(owLocal.OW_CONFIG_RUNTIMES_FILE).toEqual('file')
    expect(owLocal.OW_JAR_URL).toMatch('https://example.com/openwhisk/foo/bar.jar')
    expect(owLocal.OW_JAR_PATH).toMatch(path.join('openwhisk', 'foo', 'bar.jar'))
    expect(owLocal.OW_LOCAL_NAMESPACE).toMatch('dude')
    expect(owLocal.OW_LOCAL_AUTH).toMatch('123')
    expect(owLocal.OW_LOCAL_APIHOST).toMatch('fake.com')
  })

  test('use defaults for OW_JAR_PATH if path not found in OW_JAR_URL', () => {
    process.env.OW_JAR_URL = 'https://example.com/some/path'
    let owLocal
    jest.isolateModules(() => {
      owLocal = require('../../../src/lib/owlocal')
    })
    expect(owLocal.OW_JAR_URL).toMatch('https://example.com/some/path')
    expect(owLocal.OW_JAR_PATH).toMatch(path.join('openwhisk', 'openwhisk-standalone.jar'))
  })

  describe('getDockerNetworkAddress', () => {
    test('is not windows or mac', () => {
      Object.defineProperty(process, 'platform', {
        value: 'abc'
      })
      execa.sync.mockReturnValue(
        { stdout: JSON.stringify([{ IPAM: { Config: [{ Gateway: 'example.com' }] } }]) }
      )

      let owLocal
      jest.isolateModules(() => {
        owLocal = require('../../../src/lib/owlocal')
      })
      expect(owLocal.getDockerNetworkAddress()).toEqual('http://example.com:3233')
      expect(execa.sync).toHaveBeenCalledWith('docker', ['network', 'inspect', 'bridge'])
      expect(owLocal.OW_LOCAL_APIHOST).toEqual('http://example.com:3233')
    })

    test('is windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      })
      let owLocal
      jest.isolateModules(() => {
        owLocal = require('../../../src/lib/owlocal')
      })
      expect(owLocal.getDockerNetworkAddress()).toBe('http://localhost:3233')
      expect(execa.sync).not.toHaveBeenCalled()
      expect(owLocal.OW_LOCAL_APIHOST).toEqual('http://localhost:3233')
    })

    test('is mac', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      })
      let owLocal
      jest.isolateModules(() => {
        owLocal = require('../../../src/lib/owlocal')
      })
      expect(owLocal.getDockerNetworkAddress()).toBe('http://localhost:3233')
      expect(execa.sync).not.toHaveBeenCalled()
      expect(owLocal.OW_LOCAL_APIHOST).toEqual('http://localhost:3233')
    })

    test('if execa fails', () => {
      Object.defineProperty(process, 'platform', {
        value: 'abc'
      })
      execa.sync.mockImplementation(() => { throw new Error('fake error') })
      let owLocal
      jest.isolateModules(() => {
        owLocal = require('../../../src/lib/owlocal')
      })
      expect(owLocal.getDockerNetworkAddress()).toBe('http://localhost:3233') // fall back to default
      expect(execa.sync).toHaveBeenCalledWith('docker', ['network', 'inspect', 'bridge'])
      expect(owLocal.OW_LOCAL_APIHOST).toEqual('http://localhost:3233')
      expect(aioLogger.debug).toHaveBeenCalledWith(expect.stringContaining('fake error'))
    })
  })
})
