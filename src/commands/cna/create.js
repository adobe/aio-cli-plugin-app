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

const templateMap = require('../../templates')

function isNpmInstalled () {
  return which.sync('npm', { nothrow: true }) !== null
}

function installTemplate (destDir) {

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

class CNACreate extends Command {
  async run () {
    const { args, flags } = this.parse(CNACreate)

    // 1. make path absolute
    let destDir = path.resolve(args.path)

    // 2. Make sure we have npm, fatal otherwise
    if (!isNpmInstalled()) { // todo: better error message
      this.error('npm is required.')
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

    // 5. use templateMap
    let template = templateMap[flags.template]
    if (template != null) {
      // 6. try to get the template src from this repos templates folder
      let srcDir = path.resolve(__dirname, '../../templates/', template.path)
      if (fs.existsSync(srcDir)) {
        fs.copySync(srcDir, destDir)
        if (flags.deps) {
          installTemplate(destDir)
        } else {
          this.log(`Dependencies were not installed.  Be sure to run 'npm install' inside ${destDir}`)
        }
      }
    } else {
      // todo: could try a fetch from npm
      this.error(`'${flags.template}' does not appear to be a valid template name`)
    }
  }
}

CNACreate.description = `Create a new Cloud Native Application

Valid template names are ${Object.keys(templateMap).join(', ')}
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
    // description: 'Template starter filepath, git-url or published id/name.',
    description: 'template name to use',
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
