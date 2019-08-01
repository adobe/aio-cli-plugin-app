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

const TheCommand = require('../../../src/commands/cna/run')
const CNABaseCommand = require('../../../src/CNABaseCommand')

// mocks
// const mockOpen = require('open')
jest.mock('open', () => jest.fn())
// const mockScripts = require('@adobe/io-cna-scripts')()
jest.mock('ora')

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof CNABaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual([])
})

test('flags', async () => {
  expect(typeof TheCommand.flags.local).toBe('object')
  expect(typeof TheCommand.flags.local.description).toBe('string')
})

describe('run', () => {
  let command
  beforeEach(() => {
    jest.resetAllMocks()

    command = new TheCommand([])
    command.error = jest.fn()
  })

  // console.log('mockScripts', mockScripts)

  test('cna:run with no flags', async () => {
    // mockScripts.runDev.mockResolvedValue('https://example.com')
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    // expect(mockScripts.run).toHaveBeenCalledTimes(1)
    
    // expect(mockScripts.deployUI).toHaveBeenCalledTimes(1)
    // expect(mockScripts.buildActions).toHaveBeenCalledTimes(1)
    // expect(mockScripts.buildUI).toHaveBeenCalledTimes(1)

  })

})
