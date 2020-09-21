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
global.mockFs()
const runDev = require('../../../src/lib/runDev')
const loadConfig = require('../../../src/lib/config-loader')
const cloneDeep = require('lodash.clonedeep')
const path = require('path')
const stream = require('stream')
const mockAIOConfig = require('@adobe/aio-lib-core-config')
const util = require('util')
const sleep = util.promisify(setTimeout)

/* ****************** Mocks & beforeEach ******************* */
let onChangeFunc
jest.mock('chokidar', () => {
  return {
    watch: (...watchArgs) => {
      return {
        on: (status, method) => {
          onChangeFunc = method
        },
        close: jest.fn()
      }
    }
  }
})
const execa = require('execa')
jest.mock('execa')
const fetch = require('node-fetch')
jest.mock('node-fetch')
const mockLogger = require('@adobe/aio-lib-core-logging')
const Bundler = require('parcel-bundler')
jest.mock('parcel-bundler')

const mockUIServerAddressInstance = { port: 1111 }
const mockUIServerInstance = {
  close: jest.fn(),
  address: jest.fn().mockReturnValue(mockUIServerAddressInstance)
}
const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const BuildActions = mockRuntimeLib.buildActions
const DeployActions = mockRuntimeLib.deployActions

const httpTerminator = require('http-terminator')
jest.mock('http-terminator')
const mockTerminatorInstance = {
  terminate: jest.fn()
}

let deployActionsSpy

process.exit = jest.fn()

const actualSetTimeout = setTimeout
const now = Date.now
let time

beforeEach(() => {
  // global.cleanFs(vol)
  global.fakeFileSystem.reset()
  delete process.env.REMOTE_ACTIONS

  BuildActions.mockClear()
  DeployActions.mockClear()

  fetch.mockReset()
  execa.mockReset()

  mockLogger.mockReset()

  Bundler.mockReset()
  // mock bundler server
  Bundler.mockServe.mockResolvedValue(mockUIServerInstance)
  mockUIServerInstance.close.mockReset()
  mockUIServerInstance.address.mockClear()
  mockUIServerAddressInstance.port = 1111

  process.exit.mockReset()
  process.removeAllListeners('SIGINT')

  httpTerminator.createHttpTerminator.mockReset()
  httpTerminator.createHttpTerminator.mockImplementation(() => mockTerminatorInstance)
  mockTerminatorInstance.terminate.mockReset()

  // workaround for timers and elapsed time
  // to replace when https://github.com/facebook/jest/issues/5165 is closed
  Date.now = jest.fn()
  global.setTimeout = jest.fn()
  time = now()
  Date.now.mockImplementation(() => time)
  global.setTimeout.mockImplementation((fn, d) => { time = time + d; fn() })

  // deployActionsSpy = jest.spyOn(DeployActions.prototype, 'run')
  deployActionsSpy = DeployActions
  deployActionsSpy.mockResolvedValue({})
})

afterAll(() => {
  // deployActionsSpy.mockRestore()
})

/* ****************** Consts ******************* */

const localOWCredentials = {
  ...global.fakeConfig.local.runtime
}

const remoteOWCredentials = {
  ...global.fakeConfig.tvm.runtime,
  apihost: global.defaultOwApiHost
}

const expectedLocalOWConfig = expect.objectContaining({
  ow: expect.objectContaining({
    ...localOWCredentials
  })
})

const expectedRemoteOWConfig = expect.objectContaining({
  ow: expect.objectContaining({
    ...remoteOWCredentials
  })
})

// those must match the ones defined in dev.js
const owJarFile = 'openwhisk-standalone.jar'
const owJarPath = path.resolve(__dirname, '../../../bin/' + owJarFile)
const owRuntimesConfig = path.resolve(__dirname, '../../../bin/openwhisk-standalone-config/runtimes.json')
const owJarUrl = 'https://dl.bintray.com/adobeio-firefly/aio/openwhisk-standalone.jar'
const waitInitTime = 2000
const waitPeriodTime = 500

const execaLocalOWArgs = ['java', expect.arrayContaining(['-jar', r(owJarPath), '-m', owRuntimesConfig, '--no-ui']), expect.anything()]

/* ****************** Helpers ******************* */
function generateDotenvContent (credentials) {
  let content = ''
  if (credentials.namespace) content = content + `AIO_RUNTIME_NAMESPACE=${credentials.namespace}`
  if (credentials.auth) content = content + `\nAIO_RUNTIME_AUTH=${credentials.auth}`
  if (credentials.apihost) content = content + `\nAIO_RUNTIME_APIHOST=${credentials.apihost}`
  return content
}

async function loadEnvScripts (project, config, excludeFiles = []) {
  // create test app
  // global.loadFs(vol, project)
  // TODO: respect project though it is not used ?
  global.addSampleAppFiles()
  excludeFiles.forEach(f => global.fakeFileSystem.removeKeys([f])/* vol.unlinkSync(f) */)
  mockAIOConfig.get.mockReturnValue(config)
  // console.log(Object.keys(global.fakeFileSystem.files()))
  process.chdir('/')
  return loadConfig()
  // const scripts = AppScripts({ listeners: { onProgress: mockOnProgress } })
  // return scripts
}

function writeFakeOwJar () {
  // global.addFakeFiles(vol, path.dirname(owJarPath), path.basename(owJarPath))
  const fakeFsJson = {}
  fakeFsJson[path.dirname(owJarPath) + '/' + path.basename(owJarPath)] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFsJson)
}

function deleteFakeOwJar () {
  global.fakeFileSystem.removeKeys([deriveOwJarFilePath()])
}

function deriveOwJarFilePath () {
  let owJarFilePath
  Object.keys(global.fakeFileSystem.files()).forEach(filePath => {
    if (filePath.includes(owJarFile)) {
      owJarFilePath = filePath
    }
  })
  return owJarFilePath
}

// helpers for checking good path
function expectDevActionBuildAndDeploy (expectedBuildDeployConfig) {
  // build & deploy
  expect(BuildActions).toHaveBeenCalledTimes(1)
  expect(BuildActions.mock.calls[0][0]).toEqual(expectedBuildDeployConfig)
  // expect(BuildActions.mock.instances[1].run).toHaveBeenCalledTimes(1)
  expect(DeployActions).toHaveBeenCalledTimes(1)
  expect(DeployActions.mock.calls[0][0]).toEqual(expectedBuildDeployConfig)
  // expect(DeployActions.mock.instances[1].run).toHaveBeenCalledTimes(1)
}

function expectUIServer (fakeMiddleware, port) {
  expect(Bundler.mockConstructor).toHaveBeenCalledTimes(1)
  expect(Bundler.mockConstructor).toHaveBeenCalledWith(r('/web-src/index.html'),
    expect.objectContaining({
      watch: true,
      outDir: r('/dist/web-src-dev')
    }))
}

function expectAppFiles (expectedFiles) {
  const expectedFileSet = new Set(expectedFiles)
  const files = new Set(Object.keys(global.fakeFileSystem.files()).filter(filePath => !filePath.includes(owJarFile)))
  // in run local, the openwhisk standalone jar is created at __dirname,
  // but as we store the app in the root of the memfs, we need to ignore the extra created folder
  expect(files).toEqual(expectedFileSet)
}

async function testCleanupNoErrors (done, config, postCleanupChecks) {
  // todo why do we need to remove listeners here, somehow the one in beforeEach isn't sufficient, is jest adding a listener?
  process.removeAllListeners('SIGINT')
  process.exit.mockImplementation(() => {
    postCleanupChecks()
    expect(process.exit).toHaveBeenCalledWith(0)
    done()
  })
  await runDev([], config)
  expect(process.exit).toHaveBeenCalledTimes(0)
  // make sure we have only one listener = cleanup listener after each test + no pending promises
  expect(process.listenerCount('SIGINT')).toEqual(1)
  // send cleanup signal
  process.emit('SIGINT')
  // if test times out => means handler is not calling process.exit
}

async function testCleanupOnError (config, postCleanupChecks) {
  const error = new Error('fake')
  const logFunc = (message) => {
    if (message.includes('CTRL+C to terminate')) {
      throw error
    } else {
      console.log(message)
    }
  }
  /* mockOnProgress.mockImplementation(msg => {
    // throw error for last progress statement
    // todo tests for intermediary progress steps aswell
    if (msg.includes('CTRL+C to terminate')) {
      throw error
    }
  }) */
  await expect(runDev([], config, {}, logFunc)).rejects.toBe(error)
  postCleanupChecks()
}

const getExpectedActionVSCodeDebugConfig = actionName =>
  expect.objectContaining({
    type: 'pwa-node',
    request: 'launch',
    name: 'Action:' + actionName,
    attachSimplePort: 0,
    runtimeExecutable: r('/node_modules/.bin/wskdebug'),
    runtimeArgs: [
      actionName,
      expect.stringContaining(actionName.split('/')[1]),
      '-v',
      '--kind',
      'nodejs:12'
    ],
    env: { WSK_CONFIG_FILE: r('/.wskdebug.props.tmp') },
    localRoot: r('/'),
    remoteRoot: '/code'
  })

const getExpectedUIVSCodeDebugConfig = uiPort => expect.objectContaining({
  type: 'chrome',
  request: 'launch',
  name: 'Web',
  url: `http://localhost:${uiPort}`,
  webRoot: r('/web-src'),
  breakOnLoad: true,
  sourceMapPathOverrides: {
    '*': r('/dist/web-src-dev/*')
  }
})
/* ****************** Tests ******************* */

test('runDev is exported', async () => {
  // const scripts = await loadEnvScripts('sample-app', global.fakeConfig.tvm)
  expect(runDev).toBeDefined()
  expect(typeof runDev).toBe('function')
})

describe('call checkOpenwhiskCredentials with right params', () => {
  const failMissingRuntimeConfig = async (configVarName, remoteActionsValue) => {
    process.env.REMOTE_ACTIONS = remoteActionsValue
    const tvmConfig = cloneDeep(global.fakeConfig.tvm) // don't override original
    delete tvmConfig.runtime[configVarName]
    const config = await loadEnvScripts('sample-app', tvmConfig)
    await runDev([], config)
    expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalledWith(config)
    // await expect(runDev([], config)).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(`missing Adobe I/O Runtime ${configVarName}`) }))
  }

  test('error before chokidar watcher gets a chance to be initialized -> codecov', async () => {
    BuildActions.mockImplementationOnce(() => { throw new Error('error') })
    await expect(failMissingRuntimeConfig('auth', '1')).rejects.toThrowError('error')
  }) // eslint-disable-line jest/expect-expect

  test('missing runtime namespace and REMOTE_ACTIONS=true', () => failMissingRuntimeConfig('namespace', 'true')) // eslint-disable-line jest/expect-expect
  test('missing runtime namespace and REMOTE_ACTIONS=yes', () => failMissingRuntimeConfig('namespace', 'yes')) // eslint-disable-line jest/expect-expect
  test('missing runtime namespace and REMOTE_ACTIONS=1', () => failMissingRuntimeConfig('namespace', '1')) // eslint-disable-line jest/expect-expect

  test('missing runtime auth and REMOTE_ACTIONS=true', () => failMissingRuntimeConfig('auth', 'true')) // eslint-disable-line jest/expect-expect
  test('missing runtime auth and REMOTE_ACTIONS=yes', () => failMissingRuntimeConfig('auth', 'yes')) // eslint-disable-line jest/expect-expect
  test('missing runtime auth and REMOTE_ACTIONS=1', () => failMissingRuntimeConfig('auth', '1')) // eslint-disable-line jest/expect-expect
})

function runCommonTests (ref) {
  test('should save a previous existing .vscode/config.json file to .vscode/config.json.save', async () => {
    // global.addFakeFiles(vol, '.vscode', { 'launch.json': 'fakecontent' })
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent'
    })
    await runDev([], ref.config)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
    expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontent')
    // expect(vol.existsSync('/.vscode/launch.json.save')).toEqual(true)
    // expect(vol.readFileSync('/.vscode/launch.json.save').toString()).toEqual('fakecontent')
  })

  test('should not save to .vscode/config.json.save if there is no existing .vscode/config.json file', async () => {
    await runDev([], ref.config)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
  })

  test('should not overwrite .vscode/config.json.save', async () => {
    // why? because it might be because previous restore failed
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })
    // global.addFakeFiles(vol, '.vscode', { 'launch.json': 'fakecontent' })
    // global.addFakeFiles(vol, '.vscode', { 'launch.json.save': 'fakecontentsaved' })
    await runDev([], ref.config)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
    expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontentsaved')
  })

  // eslint-disable-next-line jest/expect-expect
  test('should cleanup generated files on SIGINT', async () => {
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => { expectAppFiles(ref.appFiles) })
    })
  })

  // eslint-disable-next-line jest/expect-expect
  test('should cleanup generated files on error', async () => {
    await testCleanupOnError(ref.config, () => {
      expectAppFiles(ref.appFiles)
    })
  })

  test('should cleanup and restore previous existing .vscode/config.json on SIGINT', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent'
    })
    // global.addFakeFiles(vol, '.vscode', { 'launch.json': 'fakecontent' })
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => {
        expectAppFiles([...ref.appFiles, '/.vscode/launch.json'])
        expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
        expect('/.vscode/launch.json' in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).toEqual('fakecontent')
      })
    })
  })

  test('should cleanup and restore previous existing .vscode/config.json on error', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent'
    })
    // global.addFakeFiles(vol, '.vscode', { 'launch.json': 'fakecontent' })
    await testCleanupOnError(ref.config, () => {
      expectAppFiles([...ref.appFiles, '/.vscode/launch.json'])
      expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
      expect('/.vscode/launch.json' in global.fakeFileSystem.files()).toEqual(true)
      expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).toEqual('fakecontent')
    })
  })

  test('should not remove previously existing ./vscode/launch.json.save on SIGINT', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => {
        expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
        expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontentsaved')
      })
    })
  })

  test('should not remove previously existing ./vscode/launch.json.save on error', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })
    await testCleanupOnError(ref.config, () => {
      expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
      expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontentsaved')
    })
  })

  test('should not build and deploy actions if skipActions is set', async () => {
    await runDev([], ref.config, { skipActions: true })
    // build & deploy constructor have been called once to init the scripts
    // here we make sure run has not been called
    expect(BuildActions).toHaveBeenCalledTimes(0)
    expect(DeployActions).toHaveBeenCalledTimes(0)
  })

  test('should not set vscode config for actions if skipActions is set', async () => {
    await runDev([], ref.config, { skipActions: true })
    expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).not.toEqual(expect.stringContaining('wskdebug'))
  })
}

function runCommonWithBackendTests (ref) {
  test('should log actions url or name when actions are deployed', async () => {
    DeployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action' },
        { name: 'pkg/actionNoUrl' }
      ]
    })
    const log = jest.fn()
    await runDev([], ref.config, {}, log)

    expect(log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  })
}

function runCommonRemoteTests (ref) {
  // eslint-disable-next-line jest/expect-expect
  test('should build and deploy actions to remote', async () => {
    const log = jest.fn()
    await runDev([], ref.config, {}, log)
    expectDevActionBuildAndDeploy(expectedRemoteOWConfig)

    BuildActions.mockClear()
    DeployActions.mockClear()

    jest.useFakeTimers()
    DeployActions.mockImplementation(async () => { await sleep(2000); return {} })
    // First change
    onChangeFunc('changed')
    DeployActions.mockImplementation(async () => { throw new Error() })

    // Second change
    onChangeFunc('changed')
    await jest.runAllTimers()

    // Second change should not have resulted in build & deploy yet because first deploy would take 2 secs
    expect(BuildActions).toHaveBeenCalledTimes(1)
    expect(DeployActions).toHaveBeenCalledTimes(1)
    await jest.runAllTimers()
    await sleep(3)

    // The second call to DeployActions will result in an error because of the second mock above
    expect(log).toHaveBeenLastCalledWith(expect.stringContaining('Stopping'))
    expect(BuildActions).toHaveBeenCalledTimes(2)
    // expect(BuildActions.mock.instances[0].run).toHaveBeenCalledTimes(1)
    expect(DeployActions).toHaveBeenCalledTimes(2)
    // expect(DeployActions.mock.instances[0].run).toHaveBeenCalledTimes(1)
  })

  test('should not start the local openwhisk stack', async () => {
    await runDev([], ref.config)
    expect(execa).not.toHaveBeenCalledWith(...execaLocalOWArgs)
  })

  test('should generate a .wskdebug.props.tmp file with the remote credentials', async () => {
    await runDev([], ref.config)
    const debugProps = global.fakeFileSystem.files()['/.wskdebug.props.tmp'].toString()
    expect(debugProps).toContain(`NAMESPACE=${remoteOWCredentials.namespace}`)
    expect(debugProps).toContain(`AUTH=${remoteOWCredentials.auth}`)
    expect(debugProps).toContain(`APIHOST=${remoteOWCredentials.apihost}`)
  })
}

function runCommonBackendOnlyTests (ref) {
  test('should not start a ui server', async () => {
    await runDev([], ref.config)
    expect(Bundler.mockConstructor).toHaveBeenCalledTimes(0)
  })

  test('should generate a vscode config for actions only', async () => {
    await runDev([], ref.config)
    expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
      configurations: [
        getExpectedActionVSCodeDebugConfig('sample-app-1.0.0/action'),
        getExpectedActionVSCodeDebugConfig('sample-app-1.0.0/action-zip')
        // fails if ui config
      ]
    }))
  })
}

function runCommonWithFrontendTests (ref) {
  // eslint-disable-next-line jest/expect-expect
  test('should start a ui server', async () => {
    const fakeMiddleware = Symbol('fake middleware')
    Bundler.mockMiddleware.mockReturnValue(fakeMiddleware)
    await runDev([], ref.config)
    expectUIServer(fakeMiddleware, 9080)
  })

  test('should use https cert/key if passed', async () => {
    const options = { parcel: { https: { cert: 'cert.cert', key: 'key.key' } } }
    const port = 8888
    await runDev([port], ref.config, options)
    expect(Bundler.mockServe).toHaveBeenCalledWith(port, options.parcel.https)
  })

  test('should cleanup ui server on SIGINT', async () => {
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => {
        expect(Bundler.mockStop).toHaveBeenCalledTimes(1)
        expect(mockUIServerInstance.close).toBeCalledTimes(0) // should not be called directly, b/c terminator does
        expect(mockTerminatorInstance.terminate).toBeCalledTimes(1)
        expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
          server: mockUIServerInstance
        })
      })
    })
  })

  test('should cleanup ui server on error', async () => {
    await testCleanupOnError(ref.config, () => {
      expect(Bundler.mockStop).toHaveBeenCalledTimes(1)
      expect(mockUIServerInstance.close).toBeCalledTimes(0) // should not be called directly, b/c terminator does
      expect(mockTerminatorInstance.terminate).toBeCalledTimes(1)
      expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
        server: mockUIServerInstance
      })
    })
  })
  // eslint-disable-next-line jest/no-test-callback
  test('should exit with 1 if there is an error in cleanup', async done => {
    const theError = new Error('theerror')
    Bundler.mockStop.mockRejectedValue(theError)
    process.removeAllListeners('SIGINT')
    process.exit.mockImplementation(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(theError)
      expect(process.exit).toHaveBeenCalledWith(1)
      done()
    })
    await runDev([], ref.config)
    expect(process.exit).toHaveBeenCalledTimes(0)
    // send cleanup signal
    process.emit('SIGINT')
    // if test times out => means handler is not calling process.exit
  })

  test('should return another available port for the UI server if used', async () => {
    mockUIServerAddressInstance.port = 9999
    const options = { parcel: { https: { cert: 'cert.cert', key: 'key.key' } } }
    const resultUrl = await runDev([8888], ref.config, options)
    expect(Bundler.mockServe).toHaveBeenCalledWith(8888, options.parcel.https)
    expect(resultUrl).toBe('https://localhost:9999')
  })

  test('should return the used ui server port', async () => {
    mockUIServerAddressInstance.port = 8888
    const options = { parcel: { https: { cert: 'cert.cert', key: 'key.key' } } }
    const resultUrl = await runDev([8888], ref.config, options)
    expect(Bundler.mockServe).toHaveBeenCalledWith(8888, options.parcel.https)
    expect(resultUrl).toBe('https://localhost:8888')
  })
}

function runCommonLocalTests (ref) {
  test('should fail if java is not installed', async () => {
    execa.mockImplementation((cmd, args) => {
      if (cmd === 'java') {
        throw new Error('fake error')
      }
      return { stdout: jest.fn() }
    })
    await expect(runDev([], ref.config)).rejects.toEqual(expect.objectContaining({ message: 'could not find java CLI, please make sure java is installed' }))
  })

  test('should fail if docker CLI is not installed', async () => {
    execa.mockImplementation((cmd, args) => {
      if (cmd === 'docker' && args.includes('-v')) {
        throw new Error('fake error')
      }
      return { stdout: jest.fn() }
    })
    await expect(runDev([], ref.config)).rejects.toEqual(expect.objectContaining({ message: 'could not find docker CLI, please make sure docker is installed' }))
  })

  test('should fail if docker is not running', async () => {
    execa.mockImplementation((cmd, args) => {
      if (cmd === 'docker' && args.includes('info')) {
        throw new Error('fake error')
      }
      return { stdout: jest.fn() }
    })
    await expect(runDev([], ref.config)).rejects.toEqual(expect.objectContaining({ message: 'docker is not running, please make sure to start docker' }))
  })

  test('should download openwhisk-standalone.jar on first usage', async () => {
    // there seems to be a bug with memfs streams + mock timeouts
    // Error [ERR_UNHANDLED_ERROR]: Unhandled error. (Error: EBADF: bad file descriptor, close)
    // so disabling mocks for this test only, with the consequence of taking 2 seconds to run
    // !!!! todo fix and use timer mocks to avoid bugs in new tests + performance !!!!
    global.setTimeout = actualSetTimeout
    Date.now = now

    deleteFakeOwJar()
    const streamBuffer = ['fake', 'ow', 'jar', null]
    const fakeOwJarStream = stream.Readable({
      read: function () {
        this.push(streamBuffer.shift())
      },
      emitClose: true
    })
    fetch.mockResolvedValue({
      ok: true,
      body: fakeOwJarStream
    })

    await runDev([], ref.config)

    expect(fetch).toHaveBeenCalledWith(owJarUrl)
    expect(deriveOwJarFilePath() in global.fakeFileSystem.files()).toEqual(true)
    expect(global.fakeFileSystem.files()[deriveOwJarFilePath()].toString()).toEqual('fakeowjar')
  })

  test('should fail if downloading openwhisk-standalone.jar creates a stream error', async () => {
    // restore timeouts see above
    global.setTimeout = actualSetTimeout
    Date.now = now

    deleteFakeOwJar()
    const fakeOwJarStream = stream.Readable({
      read: function () {
        this.emit('error', new Error('fake stream error'))
      },
      emitClose: true
    })
    fetch.mockResolvedValue({
      ok: true,
      body: fakeOwJarStream
    })

    await expect(runDev([], ref.config)).rejects.toThrow('fake stream error')
  })

  test('should fail when there is a connection error while downloading openwhisk-standalone.jar on first usage', async () => {
    deleteFakeOwJar()
    fetch.mockRejectedValue(new Error('fake connection error'))
    await expect(runDev([], ref.config)).rejects.toEqual(expect.objectContaining({ message: `connection error while downloading '${owJarUrl}', are you online?` }))
  })

  test('should fail if fetch fails to download openwhisk-standalone.jar on first usage because of status error', async () => {
    deleteFakeOwJar()
    fetch.mockResolvedValue({
      ok: false,
      statusText: 404
    })
    await expect(runDev([], ref.config)).rejects.toEqual(expect.objectContaining({ message: `unexpected response while downloading '${owJarUrl}': 404` }))
  })

  // eslint-disable-next-line jest/expect-expect
  test('should build and deploy actions to local ow', async () => {
    const log = jest.fn()
    await runDev([], ref.config, {}, log)
    expectDevActionBuildAndDeploy(expectedLocalOWConfig)

    BuildActions.mockClear()
    DeployActions.mockClear()

    jest.useFakeTimers()
    DeployActions.mockImplementation(async () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve({})
        }, 2000)
      })
    })
    // First change
    onChangeFunc('changed')
    // Defensive sleep just to let the onChange handler pass through
    await sleep(1)

    // Second change
    DeployActions.mockImplementation(async () => { throw new Error() })
    onChangeFunc('changed')
    await jest.runAllTimers()

    // Second change should not have resulted in build & deploy yet because first deploy would take 2 secs
    expect(BuildActions).toHaveBeenCalledTimes(1)
    expect(DeployActions).toHaveBeenCalledTimes(1)

    await jest.runAllTimers()
    // Defensive sleep just to let the onChange handler pass through
    await sleep(1)

    // The second call to DeployActions will result in an error because of the second mock above
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Stopping'))
    expect(BuildActions).toHaveBeenCalledTimes(2)
    expect(DeployActions).toHaveBeenCalledTimes(2)
  })

  test('should create a tmp .env file with local openwhisk credentials if there is no existing .env', async () => {
    await runDev([], ref.config)
    expect('/.env' in global.fakeFileSystem.files()).toBe(true)
    const dotenvContent = global.fakeFileSystem.files()['/.env'].toString()
    expect(dotenvContent).toContain(generateDotenvContent(localOWCredentials))
  })

  test('should backup an existing .env and create a new .env with local openwhisk credentials', async () => {
    // vol.writeFileSync('/.env', generateDotenvContent(remoteOWCredentials))
    global.fakeFileSystem.addJson({
      '.env': generateDotenvContent(remoteOWCredentials)
    })
    await runDev([], ref.config)
    // 1. make sure the new .env is still written properly
    expect('/.env' in global.fakeFileSystem.files()).toBe(true)
    const dotenvContent = global.fakeFileSystem.files()['/.env'].toString()
    expect(dotenvContent).toContain(generateDotenvContent(localOWCredentials))
    // 2. check that saved file has old content
    expect('/.env.app.save' in global.fakeFileSystem.files()).toBe(true)
    const dotenvSaveContent = global.fakeFileSystem.files()['/.env.app.save'].toString()
    expect(dotenvSaveContent).toEqual(generateDotenvContent(remoteOWCredentials))
  })

  test('should fail backup an existing .env if .env.save already exists', async () => {
    // vol.writeFileSync('/.env', generateDotenvContent(remoteOWCredentials))
    // vol.writeFileSync('/.env.app.save', 'fake content')
    global.fakeFileSystem.addJson({
      '.env': generateDotenvContent(remoteOWCredentials),
      '.env.app.save': 'fake content'
    })
    await expect(runDev([], ref.config)).rejects.toThrow(`cannot save .env, please make sure to restore and delete ${r('/.env.app.save')}`)
    expect(global.fakeFileSystem.files()['/.env.app.save'].toString()).toEqual('fake content')
  })

  test('should take additional variables from existing .env and plug them into new .env with local openwhisk credentials', async () => {
    const dotenvOldContent = generateDotenvContent(remoteOWCredentials) + `
AIO_RUNTIME_MORE=hello
AIO_CNA_TVMURL=yolo
MORE_VAR_1=hello2
`
    // vol.writeFileSync('/.env', dotenvOldContent)
    global.fakeFileSystem.addJson({
      '.env': dotenvOldContent
    })

    await runDev([], ref.config)
    // 1. make sure the new .env is still written properly
    expect('/.env' in global.fakeFileSystem.files()).toBe(true)
    const dotenvContent = global.fakeFileSystem.files()['/.env'].toString()
    expect(dotenvContent).toContain(generateDotenvContent(localOWCredentials))
    // 2. make sure the new .env include additional variables
    expect(dotenvContent).toContain('AIO_RUNTIME_MORE=hello')
    expect(dotenvContent).toContain('AIO_CNA_TVMURL=yolo')
    expect(dotenvContent).toContain('MORE_VAR_1=hello2')
    // 3. check that saved file has old content
    expect('/.env.app.save' in global.fakeFileSystem.files()).toBe(true)
    const dotenvSaveContent = global.fakeFileSystem.files()['/.env.app.save'].toString()
    expect(dotenvSaveContent).toEqual(dotenvOldContent)
  })

  test('should restore .env file on SIGINT', async () => {
    const dotenvOldContent = generateDotenvContent(remoteOWCredentials) + `
AIO_RUNTIME_MORE=hello
AIO_CNA_TVMURL=yolo
MORE_VAR_1=hello2
`
    // vol.writeFileSync('/.env', dotenvOldContent)
    global.fakeFileSystem.addJson({
      '.env': dotenvOldContent
    })

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => {
        expect('/.env.app.save' in global.fakeFileSystem.files()).toBe(false)
        expect('/.env' in global.fakeFileSystem.files()).toBe(true)
        const dotenvContent = global.fakeFileSystem.files()['/.env'].toString()
        expect(dotenvContent).toEqual(dotenvOldContent)
      })
    })
  })

  test('should restore .env file on error', async () => {
    const dotenvOldContent = generateDotenvContent(remoteOWCredentials) + `
AIO_RUNTIME_MORE=hello
AIO_CNA_TVMURL=yolo
MORE_VAR_1=hello2
`
    // vol.writeFileSync('/.env', dotenvOldContent)
    global.fakeFileSystem.addJson({
      '.env': dotenvOldContent
    })

    await testCleanupOnError(ref.config, () => {
      expect('/.env.app.save' in global.fakeFileSystem.files()).toBe(false)
      expect('/.env' in global.fakeFileSystem.files()).toBe(true)
      const dotenvContent = global.fakeFileSystem.files()['/.env'].toString()
      expect(dotenvContent).toEqual(dotenvOldContent)
    })
  })

  test('should start openwhisk-standalone jar', async () => {
    await runDev([], ref.config)
    expect(execa).toHaveBeenCalledWith(...execaLocalOWArgs)
  })

  test('should kill openwhisk-standalone subprocess on SIGINT', async () => {
    const owProcessMockKill = jest.fn()
    execa.mockImplementation((cmd, args) => {
      if (cmd === 'java' && args.includes('-jar') && args.includes(owJarPath)) {
        return {
          stdout: jest.fn(),
          kill: owProcessMockKill
        }
      }
      return {
        stdout: jest.fn(),
        kill: jest.fn()
      }
    })
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => {
        expect(execa).toHaveBeenCalledWith(...execaLocalOWArgs)
        expect(owProcessMockKill).toHaveBeenCalledTimes(1)
      })
    })
  })

  test('should kill openwhisk-standalone subprocess on error', async () => {
    const owProcessMockKill = jest.fn()
    execa.mockImplementation((cmd, args) => {
      if (cmd === 'java' && args.includes('-jar') && args.includes(owJarPath)) {
        return {
          stdout: jest.fn(),
          kill: owProcessMockKill
        }
      }
      return {
        stdout: jest.fn(),
        kill: jest.fn()
      }
    })
    await testCleanupOnError(ref.config, () => {
      expect(execa).toHaveBeenCalledWith(...execaLocalOWArgs)
      expect(owProcessMockKill).toHaveBeenCalledTimes(1)
    })
  })

  test('should wait for local openwhisk-standalone jar startup', async () => {
    let waitSteps = 4
    fetch.mockImplementation(async url => {
      if (url === 'http://localhost:3233/api/v1') {
        if (waitSteps > 3) {
          // fake first call connection error
          waitSteps--
          throw new Error('connection error')
        }
        if (waitSteps > 0) {
          // fake some calls status error
          waitSteps--
          return { ok: false }
        }
      }
      return { ok: true }
    })

    await runDev([], ref.config)
    expect(execa).toHaveBeenCalledWith(...execaLocalOWArgs)
    expect(fetch).toHaveBeenCalledWith('http://localhost:3233/api/v1')
    expect(fetch).toHaveBeenCalledTimes(5)
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), waitInitTime) // initial wait
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), waitPeriodTime) // period wait
    expect(setTimeout).toHaveBeenCalledTimes(5)
  })

  test('should fail if local openwhisk-standalone jar startup takes 61seconds', async () => {
    const initialTime = Date.now() // fake Date.now() only increases with setTimeout, see beginning of this file
    fetch.mockImplementation(async url => {
      if (url === 'http://localhost:3233/api/v1') {
        if (Date.now() < initialTime + 61000) return { ok: false }
      }
      return { ok: true }
    })
    await expect(runDev([], ref.config)).rejects.toEqual(expect.objectContaining({ message: 'local openwhisk stack startup timed out: 60000ms' }))
    expect(execa).toHaveBeenCalledWith(...execaLocalOWArgs)
    expect(fetch).toHaveBeenCalledWith('http://localhost:3233/api/v1')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), waitInitTime) // initial wait
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), waitPeriodTime) // period wait
  })

  test('should run if local openwhisk-standalone jar startup takes 59seconds', async () => {
    const initialTime = Date.now() // fake Date.now() only increases with setTimeout, see beginning of this file
    fetch.mockImplementation(async url => {
      if (url === 'http://localhost:3233/api/v1') {
        if (Date.now() < initialTime + 59000) return { ok: false }
      }
      return { ok: true }
    })
    await runDev([], ref.config)
    expect(execa).toHaveBeenCalledWith(...execaLocalOWArgs)
    expect(fetch).toHaveBeenCalledWith('http://localhost:3233/api/v1')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), waitInitTime) // initial wait
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), waitPeriodTime) // period wait
  })
}

describe('with remote actions and no frontend', () => {
  const ref = {}
  beforeEach(async () => {
    process.env.REMOTE_ACTIONS = 'true'
    // remove '/web-src/index.html' file = no ui
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm, ['/web-src/index.html'])
    ref.appFiles = ['/manifest.yml', '/package.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']
  })

  runCommonTests(ref)
  runCommonWithBackendTests(ref)
  runCommonRemoteTests(ref)
  runCommonBackendOnlyTests(ref)

  test('should start a dummy node background process to wait1 on sigint', async () => {
    await runDev([], ref.config)
    expect(execa).toHaveBeenCalledWith('node')
  })

  test('should kill dummy node background process on sigint', async () => {
    const mockKill = jest.fn()
    execa.mockReturnValue({ kill: mockKill })
    await runDev([], ref.config)
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref.config, () => {
        expect(mockKill).toHaveBeenCalledTimes(1)
      })
    })
  })

  test('should kill dummy node background process on error', async () => {
    const mockKill = jest.fn()
    execa.mockReturnValue({ kill: mockKill })
    await runDev([], ref.config)
    await testCleanupOnError(ref.config, () => {
      expect(mockKill).toHaveBeenCalledTimes(1)
    })
  })
})

describe('with remote actions and frontend', () => {
  const ref = {}
  beforeEach(async () => {
    process.env.REMOTE_ACTIONS = 'true'
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm)
    ref.appFiles = ['/manifest.yml', '/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']
  })

  runCommonTests(ref)
  runCommonRemoteTests(ref)
  runCommonWithBackendTests(ref)
  runCommonWithFrontendTests(ref)

  test('should generate a vscode debug config for actions and web-src', async () => {
    mockUIServerAddressInstance.port = 9999
    await runDev([], ref.config)
    expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
      configurations: [
        getExpectedActionVSCodeDebugConfig('sample-app-1.0.0/action'),
        getExpectedActionVSCodeDebugConfig('sample-app-1.0.0/action-zip'),
        getExpectedUIVSCodeDebugConfig(9999)
      ]
    }))
  })

  test('should inject remote action urls into the UI', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApiHost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev([], ref.config)
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })

  test('should still inject remote action urls into the UI if skipActions is set', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApiHost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev([], ref.config, { skipActions: true })
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    console.log(global.fakeFileSystem.files())
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })
})

describe('with local actions and no frontend', () => {
  const ref = {}
  beforeEach(async () => {
    process.env.REMOTE_ACTIONS = 'false'
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm, ['/web-src/index.html'])
    ref.appFiles = ['/manifest.yml', '/package.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']
    // default mocks
    // assume ow jar is already downloaded
    writeFakeOwJar()
    execa.mockReturnValue({
      stdout: jest.fn(),
      kill: jest.fn()
    })

    fetch.mockResolvedValue({
      ok: true
    })
    // should expose a new config with local credentials when reloaded in the dev cmd
    // we could also not mock aioConfig and expect it to read from .env
    mockAIOConfig.get.mockReturnValue(global.fakeConfig.local)
  })

  runCommonTests(ref)
  runCommonWithBackendTests(ref)
  runCommonBackendOnlyTests(ref)
  runCommonLocalTests(ref)
})

describe('with local actions and frontend', () => {
  const ref = {}
  beforeEach(async () => {
    process.env.REMOTE_ACTIONS = 'false'
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm)
    ref.appFiles = ['/manifest.yml', '/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']
    // default mocks
    // assume ow jar is already downloaded
    writeFakeOwJar()
    execa.mockReturnValue({
      stdout: jest.fn(),
      kill: jest.fn()
    })
    fetch.mockResolvedValue({
      ok: true
    })
    // should expose a new config with local credentials when reloaded in the dev cmd
    // we could also not mock aioConfig and expect it to read from .env
    mockAIOConfig.get.mockReturnValue(global.fakeConfig.local)
  })

  runCommonTests(ref)
  runCommonWithBackendTests(ref)
  runCommonWithFrontendTests(ref)
  runCommonLocalTests(ref)

  test('should generate a vscode debug config for actions and web-src', async () => {
    mockUIServerAddressInstance.port = 9999
    await runDev([], ref.config)
    expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
      configurations: [
        getExpectedActionVSCodeDebugConfig('sample-app-1.0.0/action'),
        getExpectedActionVSCodeDebugConfig('sample-app-1.0.0/action-zip'),
        getExpectedUIVSCodeDebugConfig(9999)
      ]
    }))
  })

  test('should inject local action urls into the UI', async () => {
    const baseUrl = localOWCredentials.apihost + '/api/v1/web/' + localOWCredentials.namespace + '/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev([], ref.config)
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })

  test('should inject REMOTE action urls into the UI if skipActions is set', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApiHost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev([], ref.config, { skipActions: true })
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })
})

describe('with frontend only', () => {
  const ref = {}
  beforeEach(async () => {
    // exclude manifest file = backend only (should we make a fixture app without actions/ as well?)
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm, ['/manifest.yml'])
    ref.appFiles = ['/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js'] // still have actions cause we only delete manifest.yml
  })
  runCommonTests(ref)
  runCommonWithFrontendTests(ref)
  test('should set hasBackend=false', async () => {
    expect(ref.config.app.hasBackend).toBe(false)
  })

  // eslint-disable-next-line jest/expect-expect
  test('should start a ui server', async () => {
    await runDev([], ref.config)
    expectUIServer(null, 9080)
  })

  test('should not call build and deploy', async () => {
    await runDev([], ref.config)
    // build & deploy constructor have been called once to init the scripts
    // here we make sure run has not been calle
    expect(BuildActions).toHaveBeenCalledTimes(0)
    expect(DeployActions).toHaveBeenCalledTimes(0)
  })

  test('should generate a vscode config for ui only', async () => {
    mockUIServerAddressInstance.port = 9999
    await runDev([], ref.config)
    expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
      configurations: [
        getExpectedUIVSCodeDebugConfig(9999)
      ]
    }))
  })

  test('should create config.json = {}', async () => {
    await runDev([], ref.config)
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual({})
  })
})

// Note: these tests can be safely deleted once the require-adobe-auth is
// natively supported in Adobe I/O Runtime.
test('vscode wskdebug config with require-adobe-auth annotation && apihost=https://adobeioruntime.net', async () => {
  // create test app
  // global.loadFs(vol, 'sample-app')
  global.addSampleAppFiles()
  // vol.unlinkSync('web-src/index.html')
  global.fakeFileSystem.removeKeys(['/web-src/index.html'])
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  process.env.REMOTE_ACTIONS = 'true'
  // const scripts = AppScripts({})
  const config = loadConfig()
  // avoid recreating a new fixture
  config.manifest.package.actions.action.annotations = { 'require-adobe-auth': true }
  config.ow.apihost = 'https://adobeioruntime.net'
  await runDev([], config)

  expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
    configurations: expect.arrayContaining([
      expect.objectContaining({
        type: 'pwa-node',
        request: 'launch',
        name: 'Action:' + 'sample-app-1.0.0/action',
        attachSimplePort: 0,
        runtimeExecutable: r('/node_modules/.bin/wskdebug'),
        runtimeArgs: [
          'sample-app-1.0.0/__secured_action',
          r('actions/action.js'),
          '-v',
          '--kind',
          'nodejs:12'
        ],
        env: { WSK_CONFIG_FILE: r('/.wskdebug.props.tmp') },
        localRoot: r('/'),
        remoteRoot: '/code'
      })
    ])
  }))
})

test('vscode wskdebug config with require-adobe-auth annotation && apihost!=https://adobeioruntime.net', async () => {
  // create test app
  // global.loadFs(vol, 'sample-app')
  global.addSampleAppFiles()
  // vol.unlinkSync('web-src/index.html')
  global.fakeFileSystem.removeKeys(['/web-src/index.html'])
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  process.env.REMOTE_ACTIONS = 'true'
  // const scripts = AppScripts({})
  const config = loadConfig()
  // avoid recreating a new fixture
  config.manifest.package.actions.action.annotations = { 'require-adobe-auth': true }
  config.ow.apihost = 'https://notadobeioruntime.net'
  await runDev([], config)

  expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
    configurations: expect.arrayContaining([
      expect.objectContaining({
        type: 'pwa-node',
        request: 'launch',
        name: 'Action:' + 'sample-app-1.0.0/action',
        attachSimplePort: 0,
        runtimeExecutable: r('/node_modules/.bin/wskdebug'),
        runtimeArgs: [
          'sample-app-1.0.0/action',
          r('actions/action.js'),
          '-v',
          '--kind',
          'nodejs:12'
        ],
        env: { WSK_CONFIG_FILE: r('/.wskdebug.props.tmp') },
        localRoot: r('/'),
        remoteRoot: '/code'
      })
    ])
  }))
})

test('vscode wskdebug config without runtime option', async () => {
  // create test app
  // global.loadFs(vol, 'sample-app')
  global.addSampleAppFiles()
  // vol.unlinkSync('web-src/index.html')
  global.fakeFileSystem.removeKeys(['/web-src/index.html'])
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  process.env.REMOTE_ACTIONS = 'true'
  // const scripts = AppScripts({})
  const config = loadConfig()
  // avoid recreating a new fixture
  delete config.manifest.package.actions.action.runtime
  await runDev([], config)

  expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
    configurations: expect.arrayContaining([
      expect.objectContaining({
        type: 'pwa-node',
        request: 'launch',
        name: 'Action:' + 'sample-app-1.0.0/action',
        attachSimplePort: 0,
        runtimeExecutable: r('/node_modules/.bin/wskdebug'),
        runtimeArgs: [
          'sample-app-1.0.0/action',
          r('actions/action.js'),
          '-v'
          // no kind
        ],
        env: { WSK_CONFIG_FILE: r('/.wskdebug.props.tmp') },
        localRoot: r('/'),
        remoteRoot: '/code'
      })
    ])
  }))
})
