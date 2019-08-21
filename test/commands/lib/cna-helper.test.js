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
const which = require('which')
const fs = require('fs-extra')
const execa = require('execa')
const cnaHelper = require('../../../src/lib/cna-helper')

describe('exports helper methods', () => {

  test('isNpmInstalled', () => {
    expect(cnaHelper.isNpmInstalled).toBeDefined()
    expect(cnaHelper.isNpmInstalled).toBeInstanceOf(Function)
    which.sync.mockReturnValue('not-null')
    expect(cnaHelper.isNpmInstalled()).toBeTruthy()
    which.sync.mockReturnValue(null)
    expect(cnaHelper.isNpmInstalled()).toBeFalsy()
  })

  test('isGitInstalled', () => {
    expect(cnaHelper.isGitInstalled).toBeDefined()
    expect(cnaHelper.isGitInstalled).toBeInstanceOf(Function)
    which.sync.mockReturnValue('not-null')
    expect(cnaHelper.isGitInstalled()).toBeTruthy()
    which.sync.mockReturnValue(null)
    expect(cnaHelper.isGitInstalled()).toBeFalsy()
  })

  test('installPackage', async () => {
    expect(cnaHelper.installPackage).toBeDefined()
    expect(cnaHelper.installPackage).toBeInstanceOf(Function)

    // throws error if dir dne => // fs.statSync(dir).isDirectory()
    fs.statSync.mockReturnValue({
      isDirectory: () => false
    })
    expect(cnaHelper.installPackage('does-not-exist'))
      .rejects.toThrow(/does-not-exist is not a valid directory with a package.json file./)

    // throws error if dir does not contain a package.json
    fs.statSync.mockReturnValue({
      isDirectory: () => true
    })
    fs.readdirSync.mockReturnValue([])
    expect(cnaHelper.installPackage('does-not-exist'))
      .rejects.toThrow(/does-not-exist is not a valid directory with a package.json file./)

    // succeeds if npm install returns success
    fs.readdirSync.mockReturnValue(['package.json'])
    cnaHelper.installPackage('does-not-exist')
    expect(execa).toHaveBeenCalledWith('npm', ['install', '--no-package-lock'], { 'cwd': 'does-not-exist' })
  })
})
