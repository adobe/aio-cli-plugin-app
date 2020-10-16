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

  test('runPackageScript missing package.json', async () => {
    // throws error if dir does not contain a package.json
    await expect(appHelper.runPackageScript('is-not-a-script', 'does-not-exist'))
      .rejects.toThrow(/does-not-exist does not contain a package.json/)
  })

  test('runPackageScript success', async () => {
    fs.readJSON.mockReturnValue({ scripts: { test: 'some-value' } })
    await appHelper.runPackageScript('test', '')
    expect(execa).toHaveBeenCalledWith('npm', ['run-script', 'test'], expect.any(Object))
  })

  test('runPackageScript success with silent option', async () => {
    // succeeds if npm run-script returns success
    fs.readJSON.mockReturnValue({ scripts: { cmd: 'some-value' } })

    await appHelper.runPackageScript('cmd', '', ['--silent'])
    expect(execa).toHaveBeenCalledWith('npm', ['run-script', 'cmd', '--silent'], expect.any(Object))
  })

  test('runPackageScript rejects if package.json does not have matching script', async () => {
    fs.readdirSync.mockReturnValue(['package.json'])
    fs.readJSONSync.mockReturnValue({ scripts: { notest: 'some-value' } })
    await expect(appHelper.runPackageScript('is-not-a-script', 'does-not-exist'))
      .rejects.toThrow(/does-not-exist/)
  })

  test('wrapError returns an a Error in any case', async () => {
    expect(appHelper.wrapError).toBeDefined()
    expect(appHelper.wrapError).toBeInstanceOf(Function)

    let error = appHelper.wrapError()
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toEqual('Unknown error')
    expect(error.stack).toBeDefined()

    error = appHelper.wrapError({ message: 'yolo' })
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toEqual('yolo')
    expect(error.stack).toBeDefined()

    error = appHelper.wrapError('yolo2')
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toEqual('yolo2')
    expect(error.stack).toBeDefined()

    error = appHelper.wrapError(new Error('yolo3'))
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toEqual('yolo3')
    expect(error.stack).toBeDefined()
  })

  describe('getActionUrls', () => {
    let fakeConfig
    beforeEach(() => {
      // base
      fakeConfig = {
        ow: {
          namespace: 'dude',
          apihost: 'https://fake.com',
          package: 'thepackage',
          apiversion: 'v0'
        },
        app: {
          hasFrontend: true,
          hostname: 'https://cdn.com'
        },
        manifest: {
          package: {
            actions: {}
          }
        }
      }
    })
    test('no actions in manifest config', () => {
      expect(appHelper.getActionUrls(fakeConfig)).toEqual({})
    })
    test('6 actions, 2 web and 4 non-web and no sequence', () => {
      fakeConfig.manifest.package.actions = {
        one: { 'web-export': true },
        two: { web: true },
        three: { web: false },
        four: { web: 'no' },
        five: { web: 'false' },
        six: { other: 'something' }
      }
      expect(appHelper.getActionUrls(fakeConfig)).toEqual({
        five: 'https://dude.fake.com/api/v0/thepackage/five',
        four: 'https://dude.fake.com/api/v0/thepackage/four',
        one: 'https://dude.cdn.com/api/v0/web/thepackage/one',
        six: 'https://dude.fake.com/api/v0/thepackage/six',
        three: 'https://dude.fake.com/api/v0/thepackage/three',
        two: 'https://dude.cdn.com/api/v0/web/thepackage/two'
      })
    })
    test('6 sequences, 2 web and 4 non-web and no actions', () => {
      fakeConfig.manifest.package.sequences = {
        one: { 'web-export': true },
        two: { web: true },
        three: { web: false },
        four: { web: 'no' },
        five: { web: 'false' },
        six: { other: 'something' }
      }
      expect(appHelper.getActionUrls(fakeConfig)).toEqual({
        five: 'https://dude.fake.com/api/v0/thepackage/five',
        four: 'https://dude.fake.com/api/v0/thepackage/four',
        one: 'https://dude.cdn.com/api/v0/web/thepackage/one',
        six: 'https://dude.fake.com/api/v0/thepackage/six',
        three: 'https://dude.fake.com/api/v0/thepackage/three',
        two: 'https://dude.cdn.com/api/v0/web/thepackage/two'
      })
    })
    test('2 actions and 2 sequences, one web one non-web', () => {
      fakeConfig.manifest.package.actions = {
        aone: { 'web-export': true },
        atwo: {}
      }
      fakeConfig.manifest.package.sequences = {
        sone: { 'web-export': true },
        stwo: {}
      }
      expect(appHelper.getActionUrls(fakeConfig)).toEqual({
        aone: 'https://dude.cdn.com/api/v0/web/thepackage/aone',
        atwo: 'https://dude.fake.com/api/v0/thepackage/atwo',
        sone: 'https://dude.cdn.com/api/v0/web/thepackage/sone',
        stwo: 'https://dude.fake.com/api/v0/thepackage/stwo'
      })
    })
    test('2 actions and 2 sequences, one web one non-web, app has no frontend', () => {
      fakeConfig.manifest.package.actions = {
        aone: { 'web-export': true },
        atwo: {}
      }
      fakeConfig.manifest.package.sequences = {
        sone: { 'web-export': true },
        stwo: {}
      }
      fakeConfig.app.hasFrontend = false
      expect(appHelper.getActionUrls(fakeConfig)).toEqual({
        aone: 'https://dude.fake.com/api/v0/web/thepackage/aone',
        atwo: 'https://dude.fake.com/api/v0/thepackage/atwo',
        sone: 'https://dude.fake.com/api/v0/web/thepackage/sone',
        stwo: 'https://dude.fake.com/api/v0/thepackage/stwo'
      })
    })
    test('2 actions and 2 sequences, one web one non-web, isRemoteDev=true', () => {
      fakeConfig.manifest.package.actions = {
        aone: { 'web-export': true },
        atwo: {}
      }
      fakeConfig.manifest.package.sequences = {
        sone: { 'web-export': true },
        stwo: {}
      }
      expect(appHelper.getActionUrls(fakeConfig, true)).toEqual({
        aone: 'https://dude.fake.com/api/v0/web/thepackage/aone',
        atwo: 'https://dude.fake.com/api/v0/thepackage/atwo',
        sone: 'https://dude.fake.com/api/v0/web/thepackage/sone',
        stwo: 'https://dude.fake.com/api/v0/thepackage/stwo'
      })
    })
    test('2 actions and 2 sequences, one web one non-web, isLocalDev=true', () => {
      fakeConfig.manifest.package.actions = {
        aone: { 'web-export': true },
        atwo: {}
      }
      fakeConfig.manifest.package.sequences = {
        sone: { 'web-export': true },
        stwo: {}
      }
      expect(appHelper.getActionUrls(fakeConfig, false, true)).toEqual({
        aone: 'https://fake.com/api/v0/web/dude/thepackage/aone',
        atwo: 'https://fake.com/api/v0/dude/thepackage/atwo',
        sone: 'https://fake.com/api/v0/web/dude/thepackage/sone',
        stwo: 'https://fake.com/api/v0/dude/thepackage/stwo'
      })
    })
  })

  test('removeProtocol', () => {
    let res = appHelper.removeProtocolFromURL('https://some-url')
    expect(res).toBe('some-url')

    res = appHelper.removeProtocolFromURL('https:/some-url')
    expect(res).toBe('https:/some-url')

    res = appHelper.removeProtocolFromURL('https:some-url')
    expect(res).toBe('https:some-url')

    res = appHelper.removeProtocolFromURL('https//some-url')
    expect(res).toBe('https//some-url')

    res = appHelper.removeProtocolFromURL('http://user:pass@sub.example.com:8080/p/a/t/h?query=string#hash')
    expect(res).toBe('user:pass@sub.example.com:8080/p/a/t/h?query=string#hash')
  })

  test('urlJoin', () => {
    let res = appHelper.urlJoin('a', 'b', 'c')
    expect(res).toBe('a/b/c')
    // keeps leading /
    res = appHelper.urlJoin('/', 'a', 'b', 'c')
    expect(res).toBe('/a/b/c')

    res = appHelper.urlJoin('/a/b/c')
    expect(res).toBe('/a/b/c')
    // keeps inner /
    res = appHelper.urlJoin('a/b/c')
    expect(res).toBe('a/b/c')

    res = appHelper.urlJoin('a/b', 'c')
    expect(res).toBe('a/b/c')

    res = appHelper.urlJoin('a/b', '/c')
    expect(res).toBe('a/b/c')

    res = appHelper.urlJoin('a/b', '/', 'c')
    expect(res).toBe('a/b/c')
    // collapses duplicate //
    res = appHelper.urlJoin('a/b', '/', '/', '/', 'c')
    expect(res).toBe('a/b/c')

    res = appHelper.urlJoin('a', 'b', 'c/')
    expect(res).toBe('a/b/c')

    res = appHelper.urlJoin('a', 'b', 'c', '/')
    expect(res).toBe('a/b/c')
  })

  test('checkFile', () => {
    jest.mock('fs-extra')
    const fs = require('fs-extra')
    // if file exists
    fs.lstatSync.mockReturnValue({ isFile: () => true })
    expect(() => appHelper.checkFile('somepath/a/b')).not.toThrow()
    expect(fs.lstatSync).toHaveBeenCalledWith('somepath/a/b')
    // if not exists
    fs.lstatSync.mockReturnValue({ isFile: () => false })
    expect(() => appHelper.checkFile('no/exists')).toThrow('no/exists is not a valid file')
  })
})
