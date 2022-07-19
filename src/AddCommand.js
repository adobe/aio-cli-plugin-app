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

const BaseCommand = require('./BaseCommand')
const { Flags } = require('@oclif/core')
const { installPackages } = require('./lib/app-helper')

class AddCommand extends BaseCommand {
  async runInstallPackages (flags, spinner) {
    const doInstall = flags.install && !flags['skip-install']
    if (doInstall) {
      await installPackages('.', { spinner, verbose: flags.verbose })
    } else {
      this.log('skipped installation, make sure to run \'npm install\' later on')
    }
  }
}

AddCommand.flags = {
  'skip-install': Flags.boolean({
    description: '[deprecated] Please use --no-install',
    char: 's',
    default: false
  }),
  install: Flags.boolean({
    description: '[default: true] Run npm installation after files are created',
    default: true,
    allowNo: true
  }),
  ...BaseCommand.flags
}

module.exports = AddCommand
