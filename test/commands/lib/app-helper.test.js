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

// unmock to test proper returned urls from getActionUrls
jest.unmock('@adobe/aio-lib-runtime')

const mockFetch = jest.fn()
jest.mock('@adobe/aio-lib-core-networking', () => ({
  createFetch: jest.fn(() => mockFetch),
  HttpExponentialBackoff: jest.fn()
}))

jest.mock('@adobe/aio-lib-core-config')
jest.mock('execa')
jest.mock('process')
jest.mock('path')
jest.mock('fs-extra') // do not touch the real fs
jest.mock('@adobe/aio-lib-env')
jest.mock('@adobe/aio-lib-ims')

const mockLogger = require('@adobe/aio-lib-core-logging')

const which = require('which')
const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const appHelper = require('../../../src/lib/app-helper')
const aioConfig = require('@adobe/aio-lib-core-config')
const libEnv = require('@adobe/aio-lib-env')
const libIms = require('@adobe/aio-lib-ims')

beforeEach(() => {
  Object.defineProperty(process, 'platform', { value: 'linux' })
  execa.mockReset()
  execa.command.mockReset()
  aioConfig.get.mockReset()
  aioConfig.set.mockReset()
  libEnv.getCliEnv.mockReset()
  libIms.getToken.mockReset()
  mockFetch.mockReset()
  mockLogger.mockReset()
})

const getMockConfig = require('../../data-mocks/config-loader')

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

test('installPackages', async () => {
  expect(appHelper.installPackages).toBeDefined()
  expect(appHelper.installPackages).toBeInstanceOf(Function)

  // throws error if dir dne => // fs.statSync(dir).isDirectory()
  fs.statSync.mockReturnValue({
    isDirectory: () => false
  })
  await expect(appHelper.installPackages('does-not-exist'))
    .rejects.toThrow(/does-not-exist is not a directory/)

  // throws error if dir does not contain a package.json
  fs.statSync.mockReturnValue({
    isDirectory: () => true
  })
  fs.readdirSync.mockReturnValue([])
  await expect(appHelper.installPackages('does-not-exist'))
    .rejects.toThrow(/does-not-exist does not contain a package.json file./)

  // succeeds if npm install returns success
  execa.mockReset()
  fs.readdirSync.mockReturnValue(['package.json'])
  await appHelper.installPackages('does-not-exist')
  expect(execa).toHaveBeenCalledWith('npm', ['install'], { cwd: 'does-not-exist' })

  // verbose option
  execa.mockReset()
  await appHelper.installPackages('somedir', { verbose: true })
  expect(execa).toHaveBeenCalledWith('npm', ['install'], { cwd: 'somedir', stderr: 'inherit', stdout: 'inherit' })

  // spinner option
  execa.mockReset()
  const spinner = { start: jest.fn(), stop: jest.fn() }
  await appHelper.installPackages('somedir', { spinner, verbose: false })
  expect(execa).toHaveBeenCalledWith('npm', ['install'], { cwd: 'somedir' })
  expect(spinner.start).toHaveBeenCalled()
  expect(spinner.stop).toHaveBeenCalled()
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

  return expect(execa.command).toHaveBeenCalledWith(scripts.test,
    expect.objectContaining({
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    }))
})

test('runPackageScript success (os is Windows)', async () => {
  const scripts = {
    test: 'some-script some-arg-1 some-arg-2'
  }
  fs.readJSON.mockReturnValue({ scripts })

  Object.defineProperty(process, 'platform', { value: 'win32' })

  execa.command.mockReturnValueOnce({
    on: jest.fn()
  })

  await appHelper.runPackageScript('test', '')
  return expect(execa.command).toHaveBeenCalledWith(scripts.test,
    expect.objectContaining({
      stdio: ['inherit', 'inherit', 'inherit', null]
    }))
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

test('runInProcess with script should call runScript', async () => {
  expect(appHelper.runInProcess).toBeDefined()
  expect(appHelper.runInProcess).toBeInstanceOf(Function)
  execa.command.mockReturnValue({ on: () => {} })
  await appHelper.runInProcess('echo new command who dis?', {})
  expect(mockLogger.debug).toHaveBeenCalledWith('runInProcess: error running project hook in process, running as package script instead')
  expect(execa.command).toHaveBeenCalledWith('echo new command who dis?', expect.any(Object))
})

test('runInProcess with require', async () => {
  const mockReq = jest.fn()
  path.resolve.mockReturnValue('does-not-exist')
  jest.mock('does-not-exist',
    () => mockReq,
    { virtual: true }
  )
  expect(appHelper.runInProcess).toBeDefined()
  expect(appHelper.runInProcess).toBeInstanceOf(Function)
  execa.command.mockReturnValue({ on: () => {} })
  await appHelper.runInProcess('does-not-exist', {})
  expect(mockReq).toHaveBeenCalled()
  expect(mockLogger.debug).toHaveBeenCalledWith('runInProcess: running project hook in process')
  expect(execa.command).not.toHaveBeenCalled()
})

test('runInProcess fails with no hook-path', async () => {
  // execa.command.mockReturnValue({ on: () => {} })
  await appHelper.runInProcess(undefined, {})
  expect(execa.command).not.toHaveBeenCalled()
  expect(mockLogger.debug).toHaveBeenCalledWith('runInProcess: undefined hookPath')
})

test('runScript with empty command', async () => {
  await appHelper.runScript(undefined, 'dir')
  expect(execa.command).not.toHaveBeenCalled()
})

test('runScript with defined dir', async () => {
  execa.command.mockReturnValue({ on: () => {} })
  await appHelper.runScript('somecommand', 'somedir')
  expect(execa.command).toHaveBeenCalledWith('somecommand', expect.objectContaining({ cwd: 'somedir' }))
})

test('runScript with empty dir => process.cwd', async () => {
  execa.command.mockReturnValue({ on: () => {} })
  await appHelper.runScript('somecommand', undefined)
  expect(execa.command).toHaveBeenCalledWith('somecommand', expect.objectContaining({ cwd: process.cwd() }))
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
  mockFetch.mockResolvedValueOnce(response)

  const url = 'https://some.url'
  const result = appHelper.downloadOWJar(url, 'foo/bar')
  await expect(result).rejects.toEqual(new Error(`unexpected response while downloading '${url}': ${response.statusText}`))
})

test('downloadOWJar failed (no server response, fetch exception)', async () => {
  const err = new Error('some fetch error')
  mockFetch.mockRejectedValueOnce(err)

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
  mockFetch.mockResolvedValueOnce(response)

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

  mockFetch.mockResolvedValueOnce(response)

  const result = appHelper.downloadOWJar(url, fileToWrite)
  await expect(result).rejects.toEqual(streamError)
})

test('runOpenWhiskJar ok', async () => {
  mockFetch.mockResolvedValue({ ok: true })
  execa.mockReturnValue({ stdout: jest.fn() })

  const result = appHelper.runOpenWhiskJar('jar', 'conf')

  await expect(result).resolves.toEqual({
    proc: expect.any(Object)
  })
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(execa).toHaveBeenCalledWith('java', expect.arrayContaining(['jar', 'conf']), {})
})

test('runOpenWhiskJar with AIO_OW_JVM_ARGS env var is passed to execa', async () => {
  mockFetch.mockResolvedValue({ ok: true })
  execa.mockReturnValue({ stdout: jest.fn() })

  aioConfig.get.mockReturnValueOnce('arg1 arg2')

  const result = appHelper.runOpenWhiskJar('jar', 'conf')

  await expect(result).resolves.toEqual({
    proc: expect.any(Object)
  })
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(execa).toHaveBeenCalledWith('java', expect.arrayContaining(['arg1', 'arg2', 'jar', 'conf']), {})
})

test('waitForOpenWhiskReadiness timeout', async () => {
  const host = 'my-host'
  const period = 5000
  const timeout = 5000
  const endTime = Date.now() - 1000 // ends now
  const status = 'FAIL'

  const waitFunc = jest.fn((_period) => {
    expect(_period).toEqual(period)
  })
  const result = appHelper.waitForOpenWhiskReadiness(host, endTime, period, timeout, status, waitFunc)

  await expect(result).rejects.toEqual(new Error(`local openwhisk stack startup timed out after ${timeout}ms due to ${status}`))
  expect(mockFetch).toHaveBeenCalledTimes(0)
  expect(waitFunc).toHaveBeenCalledTimes(0)
})

test('waitForOpenWhiskReadiness (fail, retry, then success)', async () => {
  const host = 'my-host'
  const period = 5000
  const timeout = 5000
  const endTime = Date.now() + 5000
  const status = null

  const waitFunc = jest.fn((_period) => {
    expect(_period).toEqual(period)
  })
  mockFetch
    .mockRejectedValueOnce(new Error('some error')) // first fail (fetch exception)
    .mockRejectedValueOnce({ ok: false }) // second fail (response not ok)
    .mockResolvedValue({ ok: true }) // finally success
  const result = appHelper.waitForOpenWhiskReadiness(host, endTime, period, timeout, status, waitFunc)

  await expect(result).resolves.not.toBeDefined()
  expect(mockFetch).toHaveBeenCalledTimes(3)
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
  expect(aioConfig.set).toHaveBeenCalledWith(
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
  expect(aioConfig.set).toHaveBeenCalledWith(
    'project.org.details.services', [
      { name: 'first', code: 'firsts', type: 'entp' },
      { name: 'sec', code: 'secs', type: 'entp' },
      { name: 'third', code: 'thirds', type: 'entp' }
    ],
    true
  )
})

describe('buildExcShellViewExtensionMetadata', () => {
  test('with service properties from console', async () => {
    const mockConsoleCLIInstance = {
      getServicePropertiesFromWorkspace: jest.fn()
    }
    const mockAIOConfig = {
      project: {
        org: {
          id: 'hola'
        },
        workspace: {
          id: 'yay',
          name: 'yo'
        },
        id: 'bonjour'
      }
    }
    mockConsoleCLIInstance.getServicePropertiesFromWorkspace.mockResolvedValue([
      { name: 'service1', sdkCode: 'service1code', other: 'field' },
      { name: 'service2', sdkCode: 'service2code', other: 'field2' }
    ])
    const res = await appHelper.buildExcShellViewExtensionMetadata(mockConsoleCLIInstance, mockAIOConfig)
    expect(res).toEqual({
      services: [
        { name: 'service1', code: 'service1code' },
        { name: 'service2', code: 'service2code' }
      ],
      profile: {
        client_id: 'firefly-app',
        scope: 'ab.manage,additional_info.job_function,additional_info.projectedProductContext,additional_info.roles,additional_info,AdobeID,adobeio_api,adobeio.appregistry.read,audiencemanager_api,creative_cloud,mps,openid,read_organizations,read_pc.acp,read_pc.dma_tartan,read_pc,session'
      }
    })
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledWith('hola', 'bonjour', { id: 'yay', name: 'yo' })
  })

  test('with service properties in config', async () => {
    const mockConsoleCLIInstance = {
      getServicePropertiesFromWorkspace: jest.fn()
    }
    const mockAIOConfig = {
      project: {
        org: {
          id: 'hola'
        },
        workspace: {
          id: 'yay',
          name: 'yo',
          details: {
            services: [
              {
                code: 'service1code',
                name: 'service1'
              },
              {
                code: 'service2code',
                name: 'service2'
              }
            ]
          }
        },
        id: 'bonjour'
      }
    }
    const res = await appHelper.buildExcShellViewExtensionMetadata(mockConsoleCLIInstance, mockAIOConfig)
    expect(res).toEqual({
      services: [
        { name: 'service1', code: 'service1code' },
        { name: 'service2', code: 'service2code' }
      ],
      profile: {
        client_id: 'firefly-app',
        scope: 'ab.manage,additional_info.job_function,additional_info.projectedProductContext,additional_info.roles,additional_info,AdobeID,adobeio_api,adobeio.appregistry.read,audiencemanager_api,creative_cloud,mps,openid,read_organizations,read_pc.acp,read_pc.dma_tartan,read_pc,session'
      }
    })
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(0)
  })

  test('with service properties set as string', async () => {
    const services = JSON.stringify([
      {
        code: 'service1code',
        name: 'service1'
      },
      {
        code: 'service2code',
        name: 'service2'
      }
    ])
    const mockConsoleCLIInstance = {
      getServicePropertiesFromWorkspace: jest.fn()
    }
    const mockAIOConfig = {
      project: {
        org: {
          id: 'hola'
        },
        workspace: {
          id: 'yay',
          name: 'yo',
          details: {
            services
          }
        },
        id: 'bonjour'
      }
    }
    const res = await appHelper.buildExcShellViewExtensionMetadata(mockConsoleCLIInstance, mockAIOConfig)
    expect(res).toEqual({
      services: [
        { name: 'service1', code: 'service1code' },
        { name: 'service2', code: 'service2code' }
      ],
      profile: {
        client_id: 'firefly-app',
        scope: 'ab.manage,additional_info.job_function,additional_info.projectedProductContext,additional_info.roles,additional_info,AdobeID,adobeio_api,adobeio.appregistry.read,audiencemanager_api,creative_cloud,mps,openid,read_organizations,read_pc.acp,read_pc.dma_tartan,read_pc,session'
      }
    })
    expect(mockConsoleCLIInstance.getServicePropertiesFromWorkspace).toHaveBeenCalledTimes(0)
  })
})

describe('buildExtensionPointPayloadWoMetadata', () => {
  test('app config', () => {
    // application config has no ext reg payload
    const mockConfig = getMockConfig('app', {})
    expect(appHelper.buildExtensionPointPayloadWoMetadata(mockConfig.all))
      .toEqual({ endpoints: {} })
  })

  test('exc config', () => {
    const mockConfig = getMockConfig('exc', { runtime: { namespace: 'hola' } })
    expect(appHelper.buildExtensionPointPayloadWoMetadata(mockConfig.all))
      .toEqual({
        endpoints: {
          'dx/excshell/1': { view: [{ href: 'https://hola.adobeio-static.net/index.html' }] }
        }
      })
  })

  test('app-exc-nui config', () => {
    const mockConfig = getMockConfig('app-exc-nui', { runtime: { namespace: 'hola' } })
    expect(appHelper.buildExtensionPointPayloadWoMetadata(mockConfig.all))
      .toEqual({
        endpoints: {
          'dx/asset-compute/worker/1': { workerProcess: [{ href: 'https://hola.adobeioruntime.net/api/v1/web/my-nui-package/action' }] },
          'dx/excshell/1': { view: [{ href: 'https://hola.adobeio-static.net/index.html' }] }
        }
      })
  })

  test('fake headless extension with multi package actions', () => {
    const fakeConfig = {
      all: {
        fake: {
          operations: {
            one: [{
              type: 'action',
              impl: 'pkg1/action1'
            }],
            two: [{
              type: 'action',
              impl: 'pkg2/action2'
            }]
          },
          ow: {
            apihost: 'https://some.com',
            defaultApihost: 'https://adobeioruntime.com',
            package: 'bla-1',
            namespace: 'hola',
            apiversion: 'v1'
          },
          app: {
            hasBackend: true,
            hostname: 'fake.com',
            defaultHostname: 'another'
          },
          manifest: {
            full: {
              packages: {
                pkg1: {
                  actions: {
                    action1: {
                      web: 'yes'
                    }
                  }
                },
                pkg2: {
                  actions: {
                    action2: {
                      web: 'false'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(appHelper.buildExtensionPointPayloadWoMetadata(fakeConfig.all))
      .toEqual({ endpoints: { fake: { one: [{ href: 'https://hola.fake.com/api/v1/web/pkg1/action1' }], two: [{ href: 'https://some.com/api/v1/hola/pkg2/action2' }] } } })
  })

  test('fake extension with bad operation type', () => {
    const fakeConfig = {
      all: {
        fake: {
          operations: {
            one: [{
              type: 'notsupported',
              impl: 'pkg1/action1'
            }]
          },
          manifest: {},
          app: {},
          ow: {}
        }
      }
    }
    expect(() => appHelper.buildExtensionPointPayloadWoMetadata(fakeConfig.all))
      .toThrow('unexpected op.type encountered => \'notsupported\'')
  })
})

describe('atLeastOne', () => {
  test('no input', () => {
    expect(appHelper.atLeastOne([])).toEqual('please choose at least one option')
  })
  test('some input', () => {
    expect(appHelper.atLeastOne(['some', 'input'])).toEqual(true)
  })
})

describe('deleteUserConfig', () => {
  beforeEach(() => {
    fs.writeFileSync.mockReset()
    fs.readFileSync.mockReset()
  })

  test('rewrite config', () => {
    fs.readFileSync.mockReturnValue(Buffer.from(`
some:
  config:
    in: 'a yaml file'
`))
    appHelper.deleteUserConfig({ file: 'fake.file', key: 'some.config.in' })
    expect(fs.readFileSync).toHaveBeenLastCalledWith('fake.file')
    expect(fs.writeFileSync).toHaveBeenCalledWith('fake.file', `some:
  config: {}
`)
  })
})

describe('serviceToGeneratorInput', () => {
  test('list with empty codes', () => {
    expect(appHelper.servicesToGeneratorInput(
      [{ name: 'hello', code: 'hellocode' },
        { name: 'bonjour', code: 'bonjourcode' },
        { name: 'nocode' }]
    )).toEqual('hellocode,bonjourcode')
  })
})

describe('writeConfig', () => {
  beforeEach(() => {
    fs.writeFileSync.mockReset()
    fs.ensureDirSync.mockReset()
  })
  test('write a json to a file', () => {
    path.dirname.mockReturnValue('the/dir')
    appHelper.writeConfig('the/dir/some.file', { some: 'config' })
    expect(fs.ensureDirSync).toHaveBeenCalledWith('the/dir')
    expect(fs.writeFileSync).toHaveBeenCalledWith('the/dir/some.file', '{"some":"config"}', { encoding: 'utf-8' })
  })
})

describe('getCliInfo', () => {
  test('prod', async () => {
    libEnv.getCliEnv.mockReturnValue('prod')
    libIms.getToken.mockResolvedValue('token')
    const res = await appHelper.getCliInfo()
    expect(res).toEqual(
      { accessToken: 'token', env: 'prod' }
    )
  })
  test('stage', async () => {
    libEnv.getCliEnv.mockReturnValue('stage')
    libIms.getToken.mockResolvedValue('stoken')
    const res = await appHelper.getCliInfo()
    expect(res).toEqual(
      { accessToken: 'stoken', env: 'stage' }
    )
  })
  test('useForceFalse', async () => {
    libEnv.getCliEnv.mockReturnValue('prod')
    libIms.getToken.mockResolvedValue('asdasd')
    const res = await appHelper.getCliInfo(false)
    expect(res).toEqual({ accessToken: undefined, env: 'prod' })
    expect(libIms.getToken).toHaveBeenCalledTimes(0)
  })
})

describe('createWebExportFilter', () => {
  const webFilter = appHelper.createWebExportFilter(true)
  const nonWebFilter = appHelper.createWebExportFilter(false)

  test('no web-export annotation', () => {
    const action = {
      name: 'abcde', url: 'https://fake.site', annotations: []
    }

    expect(webFilter(action)).toEqual(false)
    expect(nonWebFilter(action)).toEqual(true)
  })

  test('web-export:(true or truthy) annotation', () => {
    const action1 = {
      name: 'abcde',
      url: 'https://fake.site',
      annotations: { 'web-export': true }
    }

    expect(webFilter(action1)).toEqual(true)
    expect(nonWebFilter(action1)).toEqual(false)

    const action2 = {
      name: 'abcde',
      url: 'https://fake.site',
      annotations: { 'web-export': 1 }
    }

    expect(webFilter(action2)).toEqual(true)
    expect(nonWebFilter(action2)).toEqual(false)
  })

  test('web-export:(false or falsy) annotation', () => {
    const action1 = {
      name: 'abcde',
      url: 'https://fake.site',
      annotations: { 'web-export': false }
    }

    expect(webFilter(action1)).toEqual(false)
    expect(nonWebFilter(action1)).toEqual(true)

    const action2 = {
      name: 'abcde',
      url: 'https://fake.site',
      annotations: { 'web-export': null }
    }

    expect(webFilter(action2)).toEqual(false)
    expect(nonWebFilter(action2)).toEqual(true)
  })
})

describe('object values', () => {
  test('getObjectProp', () => {
    const obj = {
      FoO: 'bar'
    }
    expect(appHelper.getObjectProp(obj, 'foo')).toEqual('bar')
  })

  test('getObjectValue', () => {
    const obj = {
      foo: {
        bar: {
          baz: 'boo'
        }
      }
    }
    expect(appHelper.getObjectValue(obj, 'foo.bar.baz')).toEqual('boo')
  })

  test('getObjectValue (no key)', () => {
    const obj = {
      foo: 'bar'
    }
    expect(appHelper.getObjectValue(obj)).toEqual(obj)
  })
})
