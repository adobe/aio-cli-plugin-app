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

const buildActions = require('../../../src/lib/build-actions')
const utils = require('../../../src/lib/app-helper')
const { buildActions: rtBuildActions } = require('@adobe/aio-lib-runtime')

jest.mock('../../../src/lib/app-helper')

const extensionConfig = {
  hooks: {
    // make script be the same name as hook, for testing purposes
    'pre-app-build': 'pre-app-build',
    'build-actions': 'build-actions',
    'post-app-build': 'post-app-build'
  }
}
beforeEach(() => {
  utils.runScript.mockReset()
})

test('exports', () => {
  expect(typeof buildActions).toEqual('function')
})

test('build-actions app hook available', async () => {
  utils.runScript.mockImplementation((script) => {
    if (script === 'build-actions') {
      return {}
    }
  })

  await buildActions(extensionConfig)

  expect(rtBuildActions).not.toBeCalled()
  expect(utils.runScript).toHaveBeenNthCalledWith(1, 'pre-app-build')
  expect(utils.runScript).toHaveBeenNthCalledWith(2, 'build-actions')
  expect(utils.runScript).toHaveBeenNthCalledWith(3, 'post-app-build')
})

test('no build-actions app hook available (use inbuilt)', async () => {
  await buildActions(extensionConfig)

  expect(rtBuildActions).toHaveBeenCalled()
  expect(utils.runScript).toHaveBeenNthCalledWith(1, 'pre-app-build')
  expect(utils.runScript).toHaveBeenNthCalledWith(2, 'build-actions')
  expect(utils.runScript).toHaveBeenNthCalledWith(3, 'post-app-build')
})
