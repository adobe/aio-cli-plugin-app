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
const appHelper = require('../../../src/lib/app-helper')

describe('exports helper methods', () => {
  test('isNpmInstalled', () => {
    expect(appHelper.isNpmInstalled).toBeDefined()
    expect(appHelper.isNpmInstalled).toBeInstanceOf(Function)
    which.sync.mockReturnValue('not-null')
    expect(appHelper.isNpmInstalled()).toBeTruthy()
    which.sync.mockReturnValue(null)
    expect(appHelper.isNpmInstalled()).toBeFalsy()
  })

  test('isGitInstalled', () => {
    expect(appHelper.isGitInstalled).toBeDefined()
    expect(appHelper.isGitInstalled).toBeInstanceOf(Function)
    which.sync.mockReturnValue('not-null')
    expect(appHelper.isGitInstalled()).toBeTruthy()
    which.sync.mockReturnValue(null)
    expect(appHelper.isGitInstalled()).toBeFalsy()
  })

  test('installPackage', async () => {
    expect(appHelper.installPackage).toBeDefined()
    expect(appHelper.installPackage).toBeInstanceOf(Function)

    // throws error if dir dne => // fs.statSync(dir).isDirectory()
    fs.statSync.mockReturnValue({
      isDirectory: () => false
    })
    await expect(appHelper.installPackage('does-not-exist'))
      .rejects.toThrow(/does-not-exist is not a directory/)

    // throws error if dir does not contain a package.json
    fs.statSync.mockReturnValue({
      isDirectory: () => true
    })
    fs.readdirSync.mockReturnValue([])
    await expect(appHelper.installPackage('does-not-exist'))
      .rejects.toThrow(/does-not-exist does not contain a package.json file./)

    // succeeds if npm install returns success
    fs.readdirSync.mockReturnValue(['package.json'])
    appHelper.installPackage('does-not-exist')
    expect(execa).toHaveBeenCalledWith('npm', ['install'], { cwd: 'does-not-exist' })
  })

  test('runPackageScript', async () => {
    expect(appHelper.runPackageScript).toBeDefined()
    expect(appHelper.runPackageScript).toBeInstanceOf(Function)
  })

  test('runPackageScript called without valid dir', async () => {
    // throws error if dir dne => // fs.statSync(dir).isDirectory()
    fs.statSync.mockReturnValue({
      isDirectory: () => false
    })
    await expect(appHelper.runPackageScript('is-not-a-script', 'does-not-exist'))
      .rejects.toThrow(/does-not-exist is not a directory/)
  })

  test('runPackageScript missing package.json', async () => {
    // throws error if dir does not contain a package.json
    fs.statSync.mockReturnValue({
      isDirectory: () => true
    })
    fs.readdirSync.mockReturnValue([])
    await expect(appHelper.runPackageScript('is-not-a-script', 'does-not-exist'))
      .rejects.toThrow(/does-not-exist does not contain a package.json file./)
  })

  test('runPackageScript success', async () => {
    // succeeds if npm run-script returns success
    fs.statSync.mockReturnValue({
      isDirectory: () => true
    })
    fs.readdirSync.mockReturnValue(['package.json'])
    fs.readJSONSync.mockReturnValue({ scripts: { test: 'some-value' } })

    await appHelper.runPackageScript('test', '')
    expect(execa).toHaveBeenCalledWith('npm', ['run-script', 'test'], expect.any(Object))
  })

  test('runPackageScript success with silent option', async () => {
    // succeeds if npm run-script returns success
    fs.statSync.mockReturnValue({
      isDirectory: () => true
    })
    fs.readdirSync.mockReturnValue(['package.json'])
    fs.readJSONSync.mockReturnValue({ scripts: { cmd: 'some-value' } })

    await appHelper.runPackageScript('cmd', '', { silent: true })
    expect(execa).toHaveBeenCalledWith('npm', ['run-script', 'cmd', '--silent'], expect.any(Object))
  })

  test('runPackageScript rejects if package.json does not have matching script', async () => {
    fs.readdirSync.mockReturnValue(['package.json'])
    fs.readJSONSync.mockReturnValue({ scripts: { notest: 'some-value' } })
    await expect(appHelper.runPackageScript('is-not-a-script', 'does-not-exist'))
      .rejects.toThrow(/does-not-exist/)
  })
})
