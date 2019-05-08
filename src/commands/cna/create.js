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
const tmp = require('tmp')
const spawn = require('cross-spawn')
const which = require('which')

// const npa = require('npm-package-arg')

// 'https://registry.npmjs.org/' // <= this is the normal default
const DEFAULT_REGISTRY = 'https://artifactory.corp.adobe.com/artifactory/api/npm/npm-adobe-release/'

// Creates temp dir that is deleted on process exit
// returns name of dir
function getSelfDestructingTempDir () {
  return tmp.dirSync({
    prefix: 'cna-create-',
    unsafeCleanup: false
  }).name
}

function isNpmInstalled () {
  return which.sync('npm', { nothrow: true }) !== null
}

class CNACreate extends Command {
  async run () {
    const { args, flags } = this.parse(CNACreate)

    // 1. make path absolute
    let destDir = path.resolve(args.path)

    // 2. Make sure we have npm, fatal otherwise
    if (!isNpmInstalled()) {
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

    // 5 get and copy our template files over
    // 5a create a temp directory
    let tmpDest = getSelfDestructingTempDir()

    // 5b call npm i with spec+temp temp destination
    fs.ensureDirSync(path.join(tmpDest, 'node_modules'))
    let res = this.npmInstall(flags.template, tmpDest, flags.registry || DEFAULT_REGISTRY)
    res.then(() => {
      // console.log('success ... ' + tmpDest)
      // 5c copy files from temp to dest

      let srcDir = path.join(tmpDest, 'node_modules', flags.template)
      fs.copySync(srcDir, destDir)

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
    }).catch(err => {
      console.log('it threw .. ', err)
    })
  }

  async npmInstall (spec, dest, registry) {
    let cmd = 'npm'

    let result = new Promise((resolve, reject) => {
      let env = Object.assign({}, process.env)
      env = Object.assign(env, { npm_config_registry: registry })

      cli.action.start('starting a process')

      const child = spawn(cmd, ['install', spec], {
        cwd: dest,
        stdio: 'inherit',
        env: env
      })
      child.on('error', err => {
        cli.action.stop('failed')
        reject(err)
      })
      child.on('close', (code, sig) => {
        // console.log('close : ', code, sig)
        if (code !== 0) {
          cli.action.stop('failed')
          reject(new Error(`Failed to install ${spec}`))
        } else {
          cli.action.stop()
          resolve()
        }
      })
    })
    return result
  }

  // todo: use this to do the copy so we can ignore some stuff, especially relevant when we support creating
  // from templates on the local filesystem
  async copyTemplateFiles (templateDir, projectDir) {
    const dirList = fs.readdirSync(templateDir)
    // skip directories, and files that are unwanted
    let excludes = ['.git', 'NOTICE', 'LICENSE', 'COPYRIGHT', '.npmignore', '.gitignore', 'node_modules']
    let templateFiles = dirList.filter(value => excludes.indexOf(value) < 0)
    // Copy each template file after filter
    templateFiles.forEach(f => {
      let srcPath = path.resolve(templateDir, f)
      this.log('copying ', srcPath, ' to ', f)
      fs.copySync(srcPath, path.resolve(projectDir, f))
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
  // todo: support a specified name that is used to populate package.json ...
  // {
  //   name: 'name',
  //   default: 'MyApp',
  // },
]

CNACreate.flags = {
  template: flags.string({
    char: 't',
    description: 'Template starter filepath, git-url or published id/name.',
    default: '@adobe/io-cna-starter-project'
  }),
  registry: flags.string({
    char: 'r',
    description: 'Alternate registry to use. Passed into npm as environmental variable `npm_config_registry`'
  }),
  verbose: flags.boolean({ char: 'd', description: 'Show verbose/debug output' }),
  help: flags.boolean({ char: 'h', description: 'Show help' })
}

module.exports = CNACreate
