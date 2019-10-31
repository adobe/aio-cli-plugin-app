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

class Create extends BaseCommand {
  async run () {
    const { args } = this.parse(Create)
    return InitCommand.run([args.path, '-y'])
  }
}

Create.description = `Create a new Cloud Native Application with default parameters
`

Create.flags = {
  ...BaseCommand.flags
}

Create.args = BaseCommand.args

module.exports = Create
