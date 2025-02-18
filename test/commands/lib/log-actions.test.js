/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const logActions = require('../../../src/lib/log-actions')

beforeEach(() => {
})

test('exports', () => {
  expect(typeof logActions).toEqual('function')
})

test('default log', async () => {
  const log = jest.fn()
  const entities = {
    actions: [
      {} // non-web action
    ]
  }

  await logActions({ entities })
  expect(log).not.toHaveBeenCalled()
})

test('no actions', async () => {
  const log = jest.fn()
  const entities = {} // no actions

  await logActions({ entities, log })
  expect(log).not.toHaveBeenCalled()
})

test('one web action (truthy), one web action (raw)', async () => {
  const log = jest.fn()
  const entities = {
    actions: [
      { annotations: { 'web-export': true } }, // web action
      { annotations: { 'web-export': 'raw' } } // web action
    ]
  }

  await logActions({ entities, log })
  expect(log).toHaveBeenCalledWith('web actions:')
  expect(log).not.toHaveBeenCalledWith('non-web actions:')
})

test('one non-web action', async () => {
  const log = jest.fn()
  const entities = {
    actions: [
      {} // non-web action
    ]
  }

  await logActions({ entities, log })
  expect(log).not.toHaveBeenCalledWith('web actions:')
  expect(log).toHaveBeenCalledWith('non-web actions:')
})

test('two web actions, one non-web action', async () => {
  const log = jest.fn()
  const entities = {
    actions: [
      { annotations: { 'web-export': true } }, // web action
      {}, // non-web action
      { annotations: { 'web-export': 'raw' } } // web action
    ]
  }

  await logActions({ entities, log })
  expect(log).toHaveBeenCalledWith('web actions:')
  expect(log).toHaveBeenCalledWith('non-web actions:')
})
