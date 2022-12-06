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

const BaseCommand = require('../../BaseCommand')
const InitCommand = require('./init')
const { Flags } = require('@oclif/core')

class Package extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Package)

    if (flags.import) {
      return InitCommand.run([args.path, '-y', '--import', flags.import])
    }
    return InitCommand.run([args.path, '-y'])
  }
}

Package.description = `Package a new Adobe I/O App for distribution
`

Package.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'The packaged app output file path',
    char: 'o',
    default: 'app.zip'
  })
}

Package.args = [
  {
    name: 'path',
    description: 'Path to the app directory to package',
    default: '.'
  }
]

module.exports = Package
