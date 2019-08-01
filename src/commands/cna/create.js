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

const CNABaseCommand = require('../../CNABaseCommand')
const InitCommand = require('./init')

// const { cli } = require('cli-ux')
// const spawn = require('cross-spawn')
// function npmInstall (destDir) {
//   // todo: apply name from flags to package.json
//   cli.action.start('installing dependencies')
//   const child = spawn('npm', ['install'], {
//     cwd: destDir,
//     stdio: 'inherit',
//     env: process.env
//   })
//   child.on('error', err => {
//     cli.action.stop('failed')
//     console.log('error ' + err)
//   })
//   child.on('close', (code, sig) => {
//     if (code !== 0) {
//       cli.action.stop('failed')
//     } else {
//       cli.action.stop('good')
//     }
//   })
// }

class CNACreate extends CNABaseCommand {
  async run () {
    const { args } = this.parse(CNACreate)
    return InitCommand.run([args.path, '-y'])
  }
}

CNACreate.description = `Create a new Cloud Native Application
`

CNACreate.flags = {
  ...CNABaseCommand.flags
}

CNACreate.args = CNABaseCommand.args

module.exports = CNACreate
