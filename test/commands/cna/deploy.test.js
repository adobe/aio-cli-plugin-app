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

const TheCommand = require('../../../src/commands/cna/deploy')
const CNABaseCommand = require('../../../src/CNABaseCommand')

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
  expect(typeof TheCommand.flags.actions).toBe('object')
  expect(TheCommand.flags.actions.char).toBe('a')

  expect(typeof TheCommand.flags.static).toBe('object')
  expect(TheCommand.flags.static.char).toBe('s')

  expect(typeof TheCommand.flags.build).toBe('object')
  expect(TheCommand.flags.build.char).toBe('b')
})
