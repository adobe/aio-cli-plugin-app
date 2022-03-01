/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheCommand = require('../../../../src/commands/app/template/uninstall')
const BaseCommand = require('../../../../src/BaseCommand')

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
})

test('description', async () => {
  expect(TheCommand.description.length).toBeGreaterThan(0)
})

test('aliases', async () => {
  expect(TheCommand.aliases).toEqual(['app:template:un'])
})

test('flags', async () => {
  expect(Object.keys(TheCommand.flags)).toMatchObject(Object.keys(BaseCommand.flags))
})

test('args', async () => {
  expect(TheCommand.args.length).toEqual(1)
  expect(TheCommand.args[0].name).toEqual('package-name')
})

// describe('instance methods', () => {
//   let command

//   beforeEach(() => {
//     command = new TheCommand([])
//   })

//   describe('run', () => {
//     test('exists', async () => {
//       expect(command.run).toBeInstanceOf(Function)
//     })

//     test('returns help file for app:list command', () => {
//       const spy = jest.spyOn(HHelp.prototype, 'showHelp').mockReturnValue(true)
//       return command.run().then(() => {
//         expect(spy).toHaveBeenCalledWith(['app:template', '--help'])
//       })
//     })
//   })
// })
