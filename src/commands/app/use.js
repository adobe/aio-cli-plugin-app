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

const BaseCommand = require('../../BaseCommand')
const { importConfigJson } = require('../../lib/import')
const { flags } = require('@oclif/command')

class Use extends BaseCommand {
  async run () {
    const { args, flags } = this.parse(Use)
    const overwrite = flags.overwrite
    let interactive = true

    if (overwrite) {
      interactive = false
    }

    return importConfigJson(args.config_file_path, process.cwd(), { interactive, overwrite })
  }
}

Use.description = `Import an Adobe I/O Developer Console configuration file
`

Use.flags = {
  ...BaseCommand.flags,
  overwrite: flags.boolean({
    description: 'Overwrite any .aio and .env files during import of the Adobe I/O Developer Console configuration file',
    char: 'w',
    default: false
  })
}

Use.args = [
  {
    name: 'config_file_path',
    description: 'path to an Adobe I/O Developer Console configuration file',
    required: true
  }
]

module.exports = Use
