/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const Cleanup = require('../../../src/lib/cleanup')
const mockLogger = require('@adobe/aio-lib-core-logging')
const execa = require('execa')

jest.mock('execa')
jest.mock('@adobe/aio-lib-core-logging')

process.exit = jest.fn()
process.on = jest.fn()

let theCleanup

beforeEach(() => {
    theCleanup = new Cleanup()
    mockLogger.mockReset()
    process.exit.mockReset()
    process.on.mockReset()
    execa.mockReset()
})

test('exports', () => {
    expect(typeof Cleanup).toEqual('function')
    expect(typeof Cleanup.prototype.add).toEqual('function')
    expect(typeof Cleanup.prototype.run).toEqual('function')
    expect(typeof Cleanup.prototype.wait).toEqual('function')
})

test('add', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    expect(theCleanup.resources.length).toEqual(0)
    theCleanup.add(fn1, 'fn1')
    theCleanup.add(fn2, 'fn2')
    expect(theCleanup.resources.length).toEqual(2)
})

test('run', async () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    theCleanup.add(fn1, 'fn1')
    theCleanup.add(fn2, 'fn2')
    await theCleanup.run()

    expect(fn1).toHaveBeenCalled()
    expect(fn2).toHaveBeenCalled()
    expect(mockLogger.debug).toBeCalledWith('fn1')
    expect(mockLogger.debug).toBeCalledWith('fn2')
})

test('wait (cleanup no errors)', async () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    const mockKill = jest.fn()
    execa.mockImplementation(async () => {
        return {
            kill: mockKill
        }
      })

    process.exit.mockImplementation((code) => {
        expect(code).toEqual(0) // ok
    })

    process.on.mockImplementation(async (eventName, fn) => {
        if (eventName === 'SIGINT') {
            // call the fn immediately as if SIGINT was sent
            await fn()

            expect(execa).toHaveBeenCalled()
            expect(fn1).toHaveBeenCalled()
            expect(fn2).toHaveBeenCalled()
            expect(mockKill).toHaveBeenCalled()
        }
    })

    theCleanup.add(fn1, 'fn1')
    theCleanup.add(fn2, 'fn2')
    await theCleanup.wait()
})

test('wait (cleanup has error)', async () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn(() => {
        throw new Error('error')
    })

    const mockKill = jest.fn()
    execa.mockImplementation(async () => {
        return {
            kill: mockKill
        }
      })

    process.exit.mockImplementation((code) => {
        expect(code).toEqual(1) // error
    })

    process.on.mockImplementation(async (eventName, fn) => {
        if (eventName === 'SIGINT') {
            // call the fn immediately as if SIGINT was sent
            await fn()

            expect(execa).toHaveBeenCalled()
            expect(fn1).toHaveBeenCalled()
            expect(fn2).toHaveBeenCalled()
            expect(mockKill).not.toHaveBeenCalled() // never gets here because of the exception
        }
    })

    theCleanup.add(fn1, 'fn1')
    theCleanup.add(fn2, 'fn2')
    await theCleanup.wait()
})

