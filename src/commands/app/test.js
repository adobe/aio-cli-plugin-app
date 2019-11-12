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
const appHelper = require('../../lib/app-helper')
const BaseCommand = require('../../BaseCommand')

class Test extends BaseCommand {
  async run () {
    const { flags } = this.parse(Test)
    // some things we could do here:
    // test configurations, ie remote-actions deployed and called from local
    // this just runs package.json scripts.test, we could also check that this is in fact an aio app project
    const command = flags.e2e ? 'e2e' : 'test'
    try {
      await appHelper.runPackageScript(command, process.cwd(), { silent: !flags.verbose })
    } catch (e) {
      return this.error(e.message, { exit: e.exitCode })
    }
  }
}

Test.description = `Run tests for an Adobe I/O App
`

Test.flags = {
  ...BaseCommand.flags,
  unit: flags.boolean({
    char: 'u',
    description: 'runs unit tests (default).',
    default: true,
    exclusive: ['e2e']
  }),
  e2e: flags.boolean({
    char: 'e',
    description: 'runs e2e tests.',
    exclusive: ['unit']
  })
}
module.exports = Test
