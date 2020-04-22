/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const mockScripts = {
  listeners: null,
  buildUI: jest.fn(async () => mockWithCallbacks()),
  buildActions: jest.fn(async () => mockWithCallbacks()),
  deployUI: jest.fn(async () => mockWithCallbacks()),
  deployActions: jest.fn(async () => mockWithCallbacks()),
  undeployUI: jest.fn(async () => mockWithCallbacks()),
  undeployActions: jest.fn(async () => mockWithCallbacks()),
  runDev: jest.fn(async () => mockWithCallbacks()),
  addAuth: jest.fn(async () => mockWithCallbacks()),
  logs: jest.fn(async () => mockWithCallbacks())
}

mockScripts.mockReset = (script) => {
  mockScripts[script].mockReset()
  mockScripts[script].mockImplementation(async () => mockWithCallbacks())
}

mockScripts.mockResolvedValue = (script, value) => {
  mockScripts[script].mockImplementation(async () => { mockWithCallbacks(); return value })
}

mockScripts.mockRejectedValue = (script, value) => {
  mockScripts[script].mockImplementation(async () => { mockWithCallbacks(); throw value })
}

const mockWithCallbacks = () => {
  const lnr = mockScripts.listeners
  if (lnr.onStart) {
    lnr.onStart('run:start')
  }
  if (lnr.onProgress) {
    lnr.onProgress('gettin stuff done')
  }
  if (lnr.onWarning) {
    lnr.onWarning('you have been warned')
  }
  if (lnr.onEnd) {
    lnr.onEnd('run:end')
  }
}

module.exports = (arg) => {
  arg = arg || { listeners: null }
  mockScripts.listeners = arg.listeners
  return mockScripts
}
