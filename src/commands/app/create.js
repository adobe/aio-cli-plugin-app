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

const BaseCommand = require('../../BaseCommand')
const InitCommand = require('./init')
const { flags } = require('@oclif/command')

class Create extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(Create)

    if (flags.import) {
      return InitCommand.run([args.path, '-y', '--import', flags.import])
    }
    return InitCommand.run([args.path, '-y'])
  }
}

Create.description = `Create a new Adobe I/O App with default parameters
`

Create.flags = {
  ...BaseCommand.flags,
  import: flags.string({
    description: 'Import an Adobe I/O Developer Console configuration file',
    char: 'i'
  })
}

Create.args = [
  {
    name: 'path',
    description: 'Path to the app directory',
    default: '.'
  }
]

module.exports = Create
