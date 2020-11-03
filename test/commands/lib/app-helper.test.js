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
const mockWebLib = require('@adobe/aio-lib-web')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const ora = require('ora')
const spinner = ora()

jest.mock('process')

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
    return expect(execa).toHaveBeenCalledWith('npm', ['install'], { cwd: 'does-not-exist' })
  })

  test('runPackageScript', async () => {
    expect(appHelper.runPackageScript).toBeDefined()
    expect(appHelper.runPackageScript).toBeInstanceOf(Function)
  })

  test('runPackageScript success', async () => {
    fs.readJSON.mockReturnValue({ scripts: { test: 'some-script some-arg-1 some-arg-2' } })

    const ipcMessage = {
      type: 'long-running-process',
      data: {
        pid: 123,
        logs: {
          stdout: 'logs/foo.sh.out.log',
          stderr: 'logs/foo.sh.err.log'
        }
      }
    }

    const mockChildProcessOn = jest.fn((eventname, fn) => {
      if (eventname === 'message') {
        // call it back right away, for coverage
        fn(ipcMessage)
        // now call with a different message type, for coverage
        fn({
          type: 'some-other-message',
          data: {
            pid: 1234,
            logs: {
              stdout: 'logs/bar.sh.out.log',
              stderr: 'logs/bar.sh.err.log'
            }
          }
        })
      }
    })

    process.kill = jest.fn()
    process.on = jest.fn((eventname, fn) => {
      if (eventname === 'exit') {
        // call it back right away, for coverage
        fn()
      }
    })

    execa.mockReturnValueOnce({
      on: mockChildProcessOn
    })

    await appHelper.runPackageScript('test', '')
    expect(mockChildProcessOn).toHaveBeenCalledWith('message', expect.any(Function))
    expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function))
    expect(process.kill).toHaveBeenCalledWith(ipcMessage.data.pid, 'SIGTERM')
    return expect(execa).toHaveBeenCalledWith('some-script', ['some-arg-1', 'some-arg-2'], expect.any(Object))
  })

  test('runPackageScript success with additional command arg/flag', async () => {
    // succeeds if npm run-script returns success
    fs.readJSON.mockReturnValue({ scripts: { cmd: 'some-script some-arg-1 some-arg-2' } })

    const mockChildProcessOn = jest.fn()
    execa.mockReturnValueOnce({
      on: mockChildProcessOn
    })

    await appHelper.runPackageScript('cmd', '', ['--my-flag'])
    expect(mockChildProcessOn).toHaveBeenCalledWith('message', expect.any(Function))
    return expect(execa).toHaveBeenCalledWith('some-script', ['some-arg-1', 'some-arg-2', '--my-flag'], expect.any(Object))
  })

  test('runPackageScript logs if package.json does not have matching script', async () => {
    fs.readdirSync.mockReturnValue(['package.json'])
    fs.readJSONSync.mockReturnValue({ scripts: { notest: 'some-value' } })
    // coverage: the error is logged, no error thrown
    await expect(appHelper.runPackageScript('is-not-a-script', 'does-not-exist'))
      .resolves.toBeUndefined()
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

describe('buildApp', () => {
  const defaultAppConfig = { actions: { dist: 'dist/actions' }, web: { distProd: 'dist/web-src-prod' } }
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('build & deploy only some actions using --action', async () => {
    const flags = { 'skip-static': true, action: ['a', 'b', 'c'], 'force-build': true }
    fs.existsSync.mockReturnValue(true)
    await appHelper.buildApp(defaultAppConfig, flags, spinner, undefined)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(0)

    expect(mockRuntimeLib.buildActions).toHaveBeenCalledWith(expect.objectContaining({ actions: expect.objectContaining({ dist: 'dist/actions' }) }), ['a', 'b', 'c'])
  })

  test('build & deploy actions with no actions folder and no manifest', async () => {
    const flags = { 'skip-static': true }
    fs.existsSync.mockReturnValue(false)
    await appHelper.buildApp(defaultAppConfig, flags, spinner, undefined)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(0)
  })

  test('build & deploy actions with no actions folder but with a manifest', async () => {
    const flags = { 'skip-static': true, 'force-build': true }
    fs.existsSync.mockReturnValue(true)
    await appHelper.buildApp(defaultAppConfig, flags, spinner, undefined)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(1)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(0)
  })

  test('build & deploy with --skip-actions', async () => {
    const flags = { 'skip-actions': true, 'force-build': true }
    fs.existsSync.mockReturnValue(true)
    await appHelper.buildApp(defaultAppConfig, flags, spinner, undefined)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(1)
  })

  test('build & deploy with --skip-actions with no static folder', async () => {
    const flags = { 'skip-actions': true, 'force-build': true }
    fs.existsSync.mockReturnValue(false)
    await appHelper.buildApp(defaultAppConfig, flags, spinner, undefined)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(0)
  })

  test('--skip-deploy --skip-actions', async () => {
    const flags = { 'skip-deploy': true, 'skip-actions': true, 'force-build': true }
    fs.existsSync.mockReturnValue(true)
    await appHelper.buildApp(defaultAppConfig, flags, spinner, undefined)
    expect(mockRuntimeLib.deployActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.deployWeb).toHaveBeenCalledTimes(0)
    expect(mockRuntimeLib.buildActions).toHaveBeenCalledTimes(0)
    expect(mockWebLib.buildWeb).toHaveBeenCalledTimes(1)
  })

  test('write web-src/src/config.json with action urls after buildActions and before buildWeb', async () => {
    fs.existsSync.mockReturnValue(true)
    mockRuntimeLib.deployActions.mockResolvedValue('ok')
    mockWebLib.deployWeb.mockImplementation(async (config, log) => {
      log('progress log')
      return 'ok'
    })
    mockRuntimeLib.utils.getActionUrls.mockResolvedValue({ a: 'a' })
    defaultAppConfig.app = { hasBackend: true }
    defaultAppConfig.web.injectedConfig = 'sdf'
    await appHelper.buildApp(defaultAppConfig, { 'force-build': true }, spinner, undefined)
    expect(mockRuntimeLib.utils.getActionUrls).toHaveBeenCalledTimes(1)
    expect(fs.writeFileSync).toHaveBeenCalledWith('sdf', '{"a":"a"}', expect.anything())
  })

  test('build & deploy (app hooks missing)', async () => {
    fs.existsSync.mockReturnValue(true)
    fs.readJSON.mockRejectedValue('error-1')
    const logFunc = jest.fn()
    await appHelper.buildApp(defaultAppConfig, {}, spinner, undefined, logFunc)
    expect(logFunc).toHaveBeenLastCalledWith('error-1')
  })
})
