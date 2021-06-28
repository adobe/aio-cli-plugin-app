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

const { flags } = require('@oclif/command')
const BaseCommand = require('../../BaseCommand')

class Test extends BaseCommand {
  async run () {
    const { flags } = this.parse(Test)

    console.log('flags.all', flags.all)
    if (flags.all) {
      flags.unit = true
      flags.e2e = true
    }

    console.log('flags.unit', flags.unit)
    console.log('flags.e2e', flags.e2e)
    console.log('flags.action', flags.action)
    console.log('flags.extension', flags.extension)
  }
}

Test.flags = {
  extension: flags.string({
    description: 'the extension(s) to test',
    exclusive: ['action'],
    multiple: true
  }),
  action: flags.string({
    description: 'the action(s) to test',
    exclusive: ['extension'],
    multiple: true
  }),
  all: flags.boolean({
    description: 'run both unit and e2e tests',
    default: false
  }),
  e2e: flags.boolean({
    description: 'run e2e tests',
    default: false,
    exclusive: ['all'],
    allowNo: true
  }),
  unit: flags.boolean({
    description: 'run unit tests',
    default: true,
    exclusive: ['all'],
    allowNo: true
  })
}

Test.description = `Run tests for an Adobe I/O App
`
module.exports = Test
