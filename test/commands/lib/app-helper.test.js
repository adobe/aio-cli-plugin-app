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
const fetch = require('node-fetch')
const config = require('@adobe/aio-lib-core-config')

jest.mock('@adobe/aio-lib-core-config')
jest.mock('node-fetch')
jest.mock('execa')
jest.mock('process')

beforeEach(() => {
  execa.mockReset()
  fetch.mockReset()
  config.get.mockReset()
  config.set.mockReset()
})

test('isDockerRunning', async () => {
  let result

  expect(appHelper.isDockerRunning).toBeDefined()
  expect(appHelper.isDockerRunning).toBeInstanceOf(Function)

  execa.mockImplementation(() => {
    return { stdout: jest.fn() }
  })

  result = await appHelper.isDockerRunning()
  expect(result).toBeTruthy()

  execa.mockImplementation((cmd, args) => {
    if (cmd === 'docker' && args.includes('info')) {
      throw new Error('fake error')
    }
    return { stdout: jest.fn() }
  })

  result = await appHelper.isDockerRunning()
  expect(result).toBeFalsy()
})

test('hasDockerCLI', async () => {
  let result

  expect(appHelper.hasDockerCLI).toBeDefined()
  expect(appHelper.hasDockerCLI).toBeInstanceOf(Function)

  execa.mockImplementation(() => {
    return { stdout: jest.fn() }
  })

  result = await appHelper.hasDockerCLI()
  expect(result).toBeTruthy()

  execa.mockImplementation((cmd, args) => {
    if (cmd === 'docker' && args.includes('-v')) {
      throw new Error('fake error')
    }
    return { stdout: jest.fn() }
  })

  result = await appHelper.hasDockerCLI()
  expect(result).toBeFalsy()
})

test('hasJavaCLI', async () => {
  let result

  expect(appHelper.hasJavaCLI).toBeDefined()
  expect(appHelper.hasJavaCLI).toBeInstanceOf(Function)

  execa.mockImplementation(() => {
    return { stdout: jest.fn() }
  })

  result = await appHelper.hasJavaCLI()
  expect(result).toBeTruthy()

  execa.mockImplementation((cmd) => {
    if (cmd === 'java') {
      throw new Error('fake error')
    }
    return { stdout: jest.fn() }
  })

  result = await appHelper.hasJavaCLI()
  expect(result).toBeFalsy()
})

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
  const scripts = {
    test: 'some-script some-arg-1 some-arg-2'
  }
  fs.readJSON.mockReturnValue({ scripts })

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

  execa.command.mockReturnValueOnce({
    on: mockChildProcessOn
  })

  await appHelper.runPackageScript('test', '')
  expect(mockChildProcessOn).toHaveBeenCalledWith('message', expect.any(Function))
  expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function))
  expect(process.kill).toHaveBeenCalledWith(ipcMessage.data.pid, 'SIGTERM')
  return expect(execa.command).toHaveBeenCalledWith(scripts.test, expect.any(Object))
})

test('runPackageScript success with additional command arg/flag', async () => {
  // succeeds if npm run-script returns success
  const scripts = {
    cmd: 'some-script some-arg-1 some-arg-2'
  }
  fs.readJSON.mockReturnValue({ scripts })

  const mockChildProcessOn = jest.fn()
  execa.command.mockReturnValueOnce({
    on: mockChildProcessOn
  })

  const cmdExtraArgs = ['--my-flag']
  await appHelper.runPackageScript('cmd', '', cmdExtraArgs)
  expect(mockChildProcessOn).toHaveBeenCalledWith('message', expect.any(Function))
  const finalCommand = `${scripts.cmd} ${cmdExtraArgs.join(' ')}`
  return expect(execa.command).toHaveBeenCalledWith(finalCommand, expect.any(Object))
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

test('downloadOWJar failed (server has response, but not ok)', async () => {
  const response = {
    ok: false,
    statusText: 'some error'
  }
  fetch.mockReturnValueOnce(response)

  const url = 'https://some.url'
  const result = appHelper.downloadOWJar(url, 'foo/bar')
  await expect(result).rejects.toEqual(new Error(`unexpected response while downloading '${url}': ${response.statusText}`))
})

test('downloadOWJar failed (no server response, fetch exception)', async () => {
  const err = new Error('some fetch error')
  fetch.mockRejectedValueOnce(err)

  const url = 'https://some.url'
  const result = appHelper.downloadOWJar(url, 'foo/bar')
  await expect(result).rejects.toEqual(new Error(`connection error while downloading '${url}', are you online?`))
})

test('downloadOWJar ok', async () => {
  const response = {
    ok: true,
    statusText: 'success',
    body: {
      pipe: jest.fn(),
      on: jest.fn()
    }
  }

  const url = 'https://some.url'
  const fileToWrite = 'foo/bar'

  fs.createWriteStream.mockImplementation((outFile) => {
    expect(outFile).toEqual(fileToWrite)
    return {
      on: jest.fn((eventName, fn) => {
        if (eventName === 'finish') { // immediately call it
          fn()
        }
      })
    }
  })
  fetch.mockReturnValueOnce(response)

  const result = appHelper.downloadOWJar(url, fileToWrite)
  await expect(result).resolves.toBeUndefined()
})

test('downloadOWJar (server connected ok, streaming error)', async () => {
  const streamError = new Error('stream error')
  const response = {
    ok: true,
    statusText: 'success',
    body: {
      pipe: jest.fn(),
      on: jest.fn((eventName, fn) => {
        expect(eventName).toEqual('error')
        fn(streamError) // immediately call it
      })
    }
  }

  const url = 'https://some.url'
  const fileToWrite = 'foo/bar'

  fetch.mockReturnValueOnce(response)

  const result = appHelper.downloadOWJar(url, fileToWrite)
  await expect(result).rejects.toEqual(streamError)
})

test('runOpenWhiskJar ok', async () => {
  fetch.mockReturnValue({ ok: true })
  execa.mockReturnValue({ stdout: jest.fn() })

  const result = appHelper.runOpenWhiskJar('jar', 'conf')

  await expect(result).resolves.toEqual({
    proc: expect.any(Object)
  })
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(execa).toHaveBeenCalledWith('java', expect.arrayContaining(['jar', 'conf']), {})
})

test('runOpenWhiskJar with AIO_OW_JVM_ARGS env var is passed to execa', async () => {
  fetch.mockReturnValue({ ok: true })
  execa.mockReturnValue({ stdout: jest.fn() })

  config.get.mockReturnValueOnce('arg1 arg2')

  const result = appHelper.runOpenWhiskJar('jar', 'conf')

  await expect(result).resolves.toEqual({
    proc: expect.any(Object)
  })
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(execa).toHaveBeenCalledWith('java', expect.arrayContaining(['arg1', 'arg2', 'jar', 'conf']), {})
})

test('waitForOpenWhiskReadiness timeout', async () => {
  const host = 'my-host'
  const period = 5000
  const timeout = 5000
  const endTime = Date.now() - 1000 // ends now

  const waitFunc = jest.fn((_period) => {
    expect(_period).toEqual(period)
  })
  const result = appHelper.waitForOpenWhiskReadiness(host, endTime, period, timeout, waitFunc)

  await expect(result).rejects.toEqual(new Error(`local openwhisk stack startup timed out: ${timeout}ms`))
  expect(fetch).toHaveBeenCalledTimes(0)
  expect(waitFunc).toHaveBeenCalledTimes(0)
})

test('waitForOpenWhiskReadiness (fail, retry, then success)', async () => {
  const host = 'my-host'
  const period = 5000
  const timeout = 5000
  const endTime = Date.now() + 5000

  const waitFunc = jest.fn((_period) => {
    expect(_period).toEqual(period)
  })
  fetch
    .mockRejectedValueOnce(new Error('some error')) // first fail (fetch exception)
    .mockRejectedValueOnce({ ok: false }) // second fail (response not ok)
    .mockResolvedValue({ ok: true }) // finally success
  const result = appHelper.waitForOpenWhiskReadiness(host, endTime, period, timeout, waitFunc)

  await expect(result).resolves.not.toBeDefined()
  expect(fetch).toHaveBeenCalledTimes(3)
  expect(waitFunc).toHaveBeenCalledTimes(2)
})

describe('warnIfOverwriteServicesInProductionWorkspace', () => {
  const logSpy = jest.spyOn(console, 'error')
  beforeEach(() => {
    logSpy.mockClear()
  })
  test('not a prod workspace', () => {
    appHelper.warnIfOverwriteServicesInProductionWorkspace('projectName', 'stage')
    expect(logSpy).not.toHaveBeenCalled()
  })
  test('is a prod workspace', () => {
    appHelper.warnIfOverwriteServicesInProductionWorkspace('projectName', 'Production')
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(
      '⚠ Warning: you are authorizing to overwrite Services in your *Production* Workspace in Project \'projectName\'.'
    ))
  })
})

test('setWorkspaceServicesConfig', () => {
  const fakeServiceProps = [
    { name: 'first', sdkCode: 'firsts', code: 'no such field', a: 'hello', type: 'no such field' },
    { name: 'sec', sdkCode: 'secs', code: 'no such field', b: 'hello', type: 'no such field' }
  ]
  appHelper.setWorkspaceServicesConfig(fakeServiceProps)
  expect(config.set).toHaveBeenCalledWith(
    'project.workspace.details.services', [
      { name: 'first', code: 'firsts' },
      { name: 'sec', code: 'secs' }
    ],
    true
  )
})

test('setOrgServicesConfig', () => {
  const fakeOrgServices = [
    { name: 'first', code: 'firsts', sdkCode: 'no such field', type: 'entp' },
    { name: 'sec', code: 'secs', sdkCode: 'no such field', type: 'entp' },
    { name: 'third', code: 'thirds', sdkCode: 'no such field', type: 'entp' }
  ]
  appHelper.setOrgServicesConfig(fakeOrgServices)
  expect(config.set).toHaveBeenCalledWith(
    'project.org.details.services', [
      { name: 'first', code: 'firsts', type: 'entp' },
      { name: 'sec', code: 'secs', type: 'entp' },
      { name: 'third', code: 'thirds', type: 'entp' }
    ],
    true
  )
})
