/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const originalRuntimeLib = await vi.importActual('@adobe/aio-lib-runtime')

const cleanRtLibInstance = {
  actions: {},
  activations: {},
  namespaces: {},
  packages: {
    update: vi.fn(),
    list: vi.fn(() => '')
  },
  rules: {
    list: vi.fn(() => '')
  },
  triggers: {
    list: vi.fn(() => '')
  },
  logForwarding: {
    get: vi.fn(),
    setAdobeIoRuntime: vi.fn(),
    setAzureLogAnalytics: vi.fn(),
    setSplunkHec: vi.fn(),
    setNewRelic: vi.fn()
  },
  feeds: {},
  routes: {}
}
const RtLibInstanceMethods = {
  mockFn: function (methodName) {
    const cmd = methodName.split('.')
    let method = this
    while (cmd.length > 1) {
      const word = cmd.shift()
      method = method[word] = method[word] || {}
    }
    method = method[cmd.shift()] = vi.fn()
    return method
  },
  mockResolvedFixtureMulitValue: function (methodName, returnValues) {
    return this.mockResolvedMulitValue(methodName, returnValues, true)
  },
  mockResolvedFixture: function (methodName, returnValue) {
    return this.mockResolved(methodName, returnValue, true)
  },
  mockRejectedFixture: function (methodName, returnValue) {
    return this.mockRejected(methodName, returnValue, true)
  },
  mockResolvedMulitValue: function (methodName, returnValues, isFile) {
    let vals = (isFile) ? fixtureFile(returnValues) : returnValues
    try {
      vals = JSON.parse(vals)
    } catch (e) { }
    const mockFn = this.mockFn(methodName)
    for (const i in vals) {
      mockFn.mockResolvedValueOnce(vals[i], isFile)
    }
    mockFn.mockResolvedValue(vals[vals.length - 1], isFile)
    return mockFn
  },
  mockResolved: function (methodName, returnValue, isFile) {
    let val = (isFile) ? fixtureFile(returnValue) : returnValue
    try {
      val = JSON.parse(val)
    } catch (e) { }
    return this.mockFn(methodName).mockResolvedValue(val, isFile)
  },
  mockRejected: function (methodName, err) {
    return this.mockFn(methodName).mockRejectedValue(err)
  }
}

const mockRtLibInstance = {
  ...cleanRtLibInstance,
  ...RtLibInstanceMethods
}

const mockRtUtils = {
  getActionUrls: vi.fn(),
  checkOpenWhiskCredentials: vi.fn()
}

const init = vi.fn().mockReturnValue(mockRtLibInstance)
const mockActionMethods = {
  buildActions: vi.fn(),
  deployActions: vi.fn(),
  undeployActions: vi.fn(),
  printActionLogs: vi.fn()
}
export default {
  utils: {
    ...mockRtUtils,
    _absApp: originalRuntimeLib.utils._absApp,
    _relApp: originalRuntimeLib.utils._relApp,
    getActionEntryFile: originalRuntimeLib.utils.getActionEntryFile
  },
  init,
  ...mockActionMethods,
  mockReset: () => {
    Object.values(mockRtUtils).forEach(v => v.mockReset())
    init.mockClear()
    Object.values(mockActionMethods).forEach(v => v.mockReset())
    Object.assign(mockRtLibInstance, cleanRtLibInstance)
  }
}
