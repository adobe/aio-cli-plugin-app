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

const spawn = require('cross-spawn')
const which = require('which')

function isNpmInstalled () {
  return which.sync('npm', { nothrow: true }) !== null
}

function isGitInstalled () {
  return which.sync('git', { nothrow: true }) !== null
}

async function installPackage () {
  return new Promise(function (resolve, reject) {
    const child = spawn('npm', ['install'], {
      stdio: 'inherit',
      env: process.env
    })
    child.on('error', err => {
      reject(err)
    })
    child.on('close', (code /* ,sig */) => {
      if (code !== 0) {
        reject(new Error(`Failed with code ${code}`))
      } else {
        resolve('Success')
      }
    })
  })
}

module.exports = {
  isNpmInstalled,
  isGitInstalled,
  installPackage
}
