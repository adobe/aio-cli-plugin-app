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
const yeoman = require('yeoman-environment')

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')

const CNABaseCommand = require('../../CNABaseCommand')

class CNAInit2 extends CNABaseCommand {
  async run () {
    const env = yeoman.createEnv()
    env.register(require.resolve('../generators/CnaGenerator'), 'CnaGenerator')
    await new Promise((resolve, reject) => {
      env.run('CnaGenerator')
    })
  }
}

CNAInit2.description = `Initialize a Cloud Native Application
`

CNAInit2.flags = {
  'yes': flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...CNABaseCommand.flags
}

CNAInit2.args = [
  ...CNABaseCommand.args
]

module.exports = CNAInit2
