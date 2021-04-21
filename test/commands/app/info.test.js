/*
Copyright 2021 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../src/commands/app/info.js')
const BaseCommand = require('../../../src/BaseCommand.js')

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description).toBeDefined()
})

test('flags', async () => {
  expect(TheCommand.flags).toMatchObject({
    json: expect.any(Object),
    hson: expect.any(Object),
    yml: expect.any(Object),
    mask: expect.any(Object)
  })
})

test('args', async () => {
  expect(TheCommand.args).toBeDefined()
  expect(TheCommand.args).toBeInstanceOf(Array)
})

describe('instance methods', () => {
  let command

  beforeEach(() => {
    command = new TheCommand([])
  })

  describe('run', () => {
    test('exists', async () => {
      expect(command.run).toBeInstanceOf(Function)
    })
  })
})

describe('missing props', () => {
  test('appConfig.s3.tvmUrl', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = { s3: { tvmUrl: 'some url', creds: 'definitely defined' }, ow: { auth: 'super secret' } }
    command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).not.toHaveBeenCalledWith(expect.stringContaining('super secret'))
  })
})

describe('masking secrets', () => {
  test('masks by default', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = { s3: {}, ow: { auth: 'super secret' } }
    command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).not.toHaveBeenCalledWith(expect.stringContaining('super secret'))
  })
  // this is really just to get coverage on L32
  test('masks without appConfig.ow.auth', async () => {
    const command = new TheCommand([])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = { s3: {}, ow: { auth: '' } }
    command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).not.toHaveBeenCalledWith(expect.stringContaining('super secret'))
  })
  test('no-masking', async () => {
    const command = new TheCommand(['--no-mask', '-j'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = { s3: {}, ow: { auth: 'super secret' } }
    command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('super secret'))
  })
  test('no-masking --yaml', async () => {
    const command = new TheCommand(['--no-mask', '-y'])
    command.error = jest.fn()
    command.log = jest.fn()
    command.appConfig = { s3: {}, ow: { auth: 'super secret' } }
    command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('super secret'))
  })
})
