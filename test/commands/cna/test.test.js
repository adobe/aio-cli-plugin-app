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

const TheCommand = require('../../../src/commands/cna/test')
const CNABaseCommand = require('../../../src/CNABaseCommand')

jest.mock('../../../src/lib/cna-helper', () => {
  return { runPackageScript: jest.fn() }
})
const cnaHelper = require('../../../src/lib/cna-helper')

beforeEach(() => {
  jest.resetAllMocks()
})

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof CNABaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })
})

describe('bad flags', () => {
  test('unknown', async (done) => {
    let result = TheCommand.run(['.', '--wtf'])
    expect(result instanceof Promise).toBeTruthy()
    return result
      .then(() => done.fail())
      .catch(res => {
        expect(res).toEqual(new Error('Unexpected argument: --wtf\nSee more help with --help'))
        done()
      })
  })
})

describe('no flags', () => {
  test('run tests', async () => {
    let result = await TheCommand.run([])
    expect(cnaHelper.runPackageScript).toHaveBeenCalled()
    return result
  })
})
