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

jest.mock('execa')
const execa = require('execa')

beforeEach(() => {
  execa.sync.mockReset()
  delete process.env.OW_LOCAL_NAMESPACE
  delete process.env.OW_CONFIG_RUNTIMES_FILE
  delete process.env.OW_LOCAL_AUTH
  delete process.env.OW_JAR_URL
  delete process.env.OW_JAR_FILE
  delete process.env.OW_LOCAL_APIHOST
})

describe('owlocal', () => {
  test('exports', () => {
    let owLocal
    jest.isolateModules(() => {
      owLocal = require('../../../src/lib/owlocal')
    })
    expect(typeof owLocal.getDockerNetworkAddress).toEqual('function')
    expect(owLocal.OW_CONFIG_RUNTIMES_FILE).toMatch('/bin/openwhisk-standalone-config/runtimes.json')
    expect(owLocal.OW_JAR_FILE).toMatch('/bin/openwhisk-standalone.jar')
    expect(owLocal.OW_JAR_URL).toMatch('https://dl.bintray.com/adobeio-firefly/aio/openwhisk-standalone.jar')
    expect(owLocal.OW_LOCAL_NAMESPACE).toMatch('guest')
    expect(owLocal.OW_LOCAL_AUTH).toMatch('23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP')
  })
  test('exports can be overwritten by process env', () => {
    process.env.OW_LOCAL_NAMESPACE = 'dude'
    process.env.OW_CONFIG_RUNTIMES_FILE = 'file'
    process.env.OW_LOCAL_AUTH = '123'
    process.env.OW_JAR_URL = 'example.com'
    process.env.OW_JAR_FILE = 'hey.jar'
    process.env.OW_LOCAL_APIHOST = 'fake.com'
    let owLocal
    jest.isolateModules(() => {
      owLocal = require('../../../src/lib/owlocal')
    })
    expect(owLocal.OW_CONFIG_RUNTIMES_FILE).toEqual('file')
    expect(owLocal.OW_JAR_FILE).toMatch('hey.jar')
    expect(owLocal.OW_JAR_URL).toMatch('example.com')
    expect(owLocal.OW_LOCAL_NAMESPACE).toMatch('dude')
    expect(owLocal.OW_LOCAL_AUTH).toMatch('123')
    expect(owLocal.OW_LOCAL_APIHOST).toMatch('fake.com')
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
  })
})
