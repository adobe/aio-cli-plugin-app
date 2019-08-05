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

const TheCommand = require('../../../src/commands/cna/add-auth')
const CNABaseCommand = require('../../../src/CNABaseCommand')

// mocks
const mockFs = require('fs-extra')
jest.mock('fs-extra')
const mockScripts = require('@adobe/io-cna-scripts')()

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof CNABaseCommand).toBeTruthy()
  expect(typeof TheCommand.description).toBeDefined()
})

describe('run', () => {
  let command
  beforeEach(() => {
    jest.resetAllMocks()
    command = new TheCommand([])
    command.error = jest.fn()
  })

  test('with manifest', async () => {
    mockFs.existsSync.mockResolvedValue(true)
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.addAuth).toHaveBeenCalledTimes(1)
  })
  test('without manifest', async () => {
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(mockScripts.addAuth).toHaveBeenCalledTimes(0)
  })
})
