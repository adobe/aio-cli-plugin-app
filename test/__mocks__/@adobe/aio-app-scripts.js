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
  buildUI: jest.fn(() => mockWithCallbacks()),
  buildActions: jest.fn(() => mockWithCallbacks()),
  deployUI: jest.fn(() => mockWithCallbacks()),
  deployActions: jest.fn(() => mockWithCallbacks()),
  undeployUI: jest.fn(() => mockWithCallbacks()),
  undeployActions: jest.fn(() => mockWithCallbacks()),
  runDev: jest.fn(() => mockWithCallbacks()),
  addAuth: jest.fn(() => mockWithCallbacks())
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
