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
const fs = require('fs-extra')

const TheCommand = require('../../../../src/commands/app/delete/event')
const BaseCommand = require('../../../../src/BaseCommand')
const DeleteActionCommand = require('../../../../src/commands/app/delete/action')
jest.mock('../../../../src/commands/app/delete/action')

jest.mock('fs-extra')

beforeEach(() => {
  fs.ensureDirSync.mockClear()
  DeleteActionCommand.run.mockReset()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

// Question? What is/are the actual difference between this call and `delete action`?
// Are event-actions somehow special?
// How can we detect the diff? -jm

describe('passes flags through to delete action', () => {
  test('no flags', async () => {
    await TheCommand.run()
    expect(DeleteActionCommand.run).toHaveBeenCalled()
  })

  test('--yes', async () => {
    await expect(TheCommand.run(['--yes'])).rejects.toThrow('<event-action-name> must also be provided')
    expect(DeleteActionCommand.run).not.toHaveBeenCalled()
  })

  test('--yes, <event-action-name>', async () => {
    await TheCommand.run(['--yes', 'event-action-name'])
    expect(DeleteActionCommand.run).toHaveBeenCalledWith(['event-action-name', '--yes'])
  })
})
