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

const execa = require('execa')
const fs = require('fs-extra')
const which = require('which')
const debug = require('debug')('aio-cli-plugin-cna:cna-helper')

function isNpmInstalled () {
  let result = which.sync('npm', { nothrow: true })
  return result !== null
}

function isGitInstalled () {
  return which.sync('git', { nothrow: true }) !== null
}

async function installPackage (dir) {
  debug(`running npm install : ${dir}`)
  if (!(fs.statSync(dir).isDirectory())) {
    debug(`${dir}  is not a directory`)
    throw new Error(`${dir} is not a directory`)
  }
  if (!fs.readdirSync(dir).includes('package.json')) {
    debug(`${dir} does not contain a package.json file.`)
    throw new Error(`${dir} does not contain a package.json file.`)
  }
  // npm install
  await execa('npm', ['install'], { cwd: dir })
}

module.exports = {
  isNpmInstalled,
  isGitInstalled,
  installPackage
}
