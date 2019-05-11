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

const { Command, flags } = require('@oclif/command')
const { cli } = require('cli-ux')
const path = require('path')
const fs = require('fs-extra')
const spawn = require('cross-spawn')
const which = require('which')

function isNpmInstalled () {
  return which.sync('npm', { nothrow: true }) !== null
}

class CNACreate extends Command {
  async run () {
    const { args, flags } = this.parse(CNACreate)

    // 1. make path absolute
    let destDir = path.resolve(args.path)

    // 2. Make sure we have npm, fatal otherwise
    if (!isNpmInstalled()) { // todo: better error message
      this.error('oops, npm is required.')
    }

    // 3. create destination if not there
    if (!fs.existsSync(destDir)) {
      this.log('Creating dir for app: ', destDir)
      fs.mkdirSync(destDir)
    }
    // 4. fail if destination is not empty
    if (fs.readdirSync(destDir).length > 0) {
      this.error('Expected destination path to be empty: ' + destDir)
    }

    let srcDir = path.resolve(__dirname, '../../templates/', flags.template)

    fs.copySync(srcDir, destDir)

    // todo: apply name from flags to package.json

    cli.action.start('installing dependencies')
    const child = spawn('npm', ['install'], {
      cwd: destDir,
      stdio: 'inherit',
      env: process.env
    })
    child.on('error', err => {
      cli.action.stop('failed')
      console.log('error ' + err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        cli.action.stop('failed')
      } else {
        cli.action.stop('good')
      }
    })
  }
}

CNACreate.description = `Create a new Cloud Native Application
`

CNACreate.args = [
  {
    name: 'path',
    description: 'Directory to create the app in',
    default: '.'
  }
]

CNACreate.flags = {
  template: flags.string({ 
    char: 't',
    description: 'Template starter filepath, git-url or published id/name.',
    default: 'basic-action-view-app'
  }),
  deps: flags.boolean({
    description: 'Install dependencies by running `npm install` in the target directory',
    default: true,
    allowNo: true
  }),
  // todo:
  // name: flags.string( {
  //   char: 'n',
  //   description: 'Specify a name for your app'
  // }),
  verbose: flags.boolean({ char: 'd', description: 'Show verbose/debug output' }),
  help: flags.boolean({ char: 'h', description: 'Show help' })
}

module.exports = CNACreate
