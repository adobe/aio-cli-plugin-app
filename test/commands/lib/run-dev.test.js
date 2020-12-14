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

/* eslint jest/expect-expect: [
  "error",
  {
    "assertFunctionNames": [
        "expect", "testCleanupNoErrors", "testCleanupOnError", "expectUIServer", "failMissingRuntimeConfig"
    ]
  }
]
*/

global.mockFs()
const runDev = require('../../../src/lib/run-dev')
const loadConfig = require('../../../src/lib/config-loader')
const cloneDeep = require('lodash.clonedeep')
const path = require('path')
const mockAIOConfig = require('@adobe/aio-lib-core-config')
const util = require('util')
const sleep = util.promisify(setTimeout)

jest.mock('../../../src/lib/poller')
jest.mock('serve-static')

const mockHttpsServerAddressInstance = {
  port: 9090
}
const mockHttpsServerInstance = {
  address: jest.fn(() => mockHttpsServerAddressInstance)
}
const mockHttpsCreateServer = jest.fn(() => mockHttpsServerInstance)

const https = require('https')
jest.mock('https')
https.createServer = mockHttpsCreateServer

const mockUIServerInstance = {
  use: jest.fn(),
  listen: jest.fn(),
  close: jest.fn()
}
jest.mock('pure-http', () => () => mockUIServerInstance)

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

const now = Date.now
let time

beforeEach(() => {
  global.fakeFileSystem.reset()

  BuildActions.mockClear()
  DeployActions.mockClear()

  fetch.mockReset()
  execa.mockReset()

  mockLogger.mockReset()

  Bundler.mockReset()

  mockUIServerInstance.use.mockClear()
  mockUIServerInstance.listen.mockClear()
  mockUIServerInstance.close.mockClear()
  https.createServer.mockClear()

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

  deployActionsSpy = DeployActions
  deployActionsSpy.mockResolvedValue({})
})

/* ****************** Consts ******************* */

const remoteOWCredentials = {
  ...global.fakeConfig.tvm.runtime,
  apihost: global.defaultOwApiHost
}

const expectedRemoteOWConfig = expect.objectContaining({
  ow: expect.objectContaining({
    ...remoteOWCredentials
  })
})

const CLI_CONFIG = {
  dataDir: path.join('/', 'dataDir')
}

// those must match the ones defined in dev.js
const OW_RUNTIMES_CONFIG = path.resolve(__dirname, '../../../bin/openwhisk-standalone-config/runtimes.json')
const OW_JAR_PATH = path.join(CLI_CONFIG.dataDir, 'openwhisk', 'standalone-v1', 'openwhisk-standalone.jar')

const EXECA_LOCAL_OW_ARGS = ['java', expect.arrayContaining(['-jar', OW_JAR_PATH, '-m', OW_RUNTIMES_CONFIG, '--no-ui']), expect.anything()]

/* ****************** Helpers ******************* */

/** @private */
async function loadEnvScripts (project, config, excludeFiles = []) {
  // create test app
  global.addSampleAppFiles()
  excludeFiles.forEach(f => global.fakeFileSystem.removeKeys([f]))
  mockAIOConfig.get.mockReturnValue(config)
  process.chdir('/')

  const appConfig = loadConfig()
  appConfig.cli = CLI_CONFIG
  return appConfig
}

/** @private */
function posixPath (pathString) {
  return pathString
    .split(path.sep)
    .join(path.posix.sep)
}

// helpers for checking good path
/** @private */
function expectDevActionBuildAndDeploy (expectedBuildDeployConfig) {
  // build & deploy
  expect(BuildActions).toHaveBeenCalledTimes(1)
  expect(BuildActions.mock.calls[0][0]).toEqual(expectedBuildDeployConfig)
  expect(DeployActions).toHaveBeenCalledTimes(1)
  expect(DeployActions.mock.calls[0][0]).toEqual(expectedBuildDeployConfig)
}

/** @private */
function expectUIServer (fakeMiddleware, port) {
  expect(Bundler.mockConstructor).toHaveBeenCalledTimes(1)
  expect(Bundler.mockConstructor).toHaveBeenCalledWith(path.resolve('/web-src/index.html'),
    expect.objectContaining({
      watch: true,
      outDir: path.resolve('/dist/web-src-dev')
    }))
}

/** @private */
function expectAppFiles (expectedFiles) {
  const expectedFileSet = new Set(expectedFiles)
  const files = new Set(Object.keys(global.fakeFileSystem.files()).filter(filePath => !filePath.includes(posixPath(OW_JAR_PATH))))
  // in run local, the openwhisk standalone jar is created at __dirname,
  // but as we store the app in the root of the memfs, we need to ignore the extra created folder
  expect(files).toEqual(expectedFileSet)
}

/** @private */
async function testCleanupNoErrors (done, ref, postCleanupChecks) {
  // todo why do we need to remove listeners here, somehow the one in beforeEach isn't sufficient, is jest adding a listener?
  process.removeAllListeners('SIGINT')
  process.exit.mockImplementation(() => {
    postCleanupChecks()
    expect(process.exit).toHaveBeenCalledWith(0)
    done()
  })

  const options = { devRemote: ref.devRemote }
  await runDev([], ref.config, options)
  expect(process.exit).toHaveBeenCalledTimes(0)
  // make sure we have only one listener = cleanup listener after each test + no pending promises
  expect(process.listenerCount('SIGINT')).toEqual(1)
  // send cleanup signal
  process.emit('SIGINT')
  // if test times out => means handler is not calling process.exit
}

/** @private */
async function testCleanupOnError (ref, postCleanupChecks) {
  const error = new Error('fake')
  const logFunc = (message) => {
    if (message.includes('CTRL+C to terminate')) {
      throw error
    } else {
      console.log(message)
    }
  }

  const options = { devRemote: ref.devRemote }
  await expect(runDev([], ref.config, options, logFunc)).rejects.toBe(error)
  postCleanupChecks()
}

const getExpectedActionVSCodeDebugConfig = (isLocal, actionName) => {
  const envFile = isLocal ? path.join('dist', '.env.local') : '.env'
  return expect.objectContaining({
    type: 'pwa-node',
    request: 'launch',
    name: 'Action:' + actionName,
    attachSimplePort: 0,
    runtimeExecutable: path.resolve('/node_modules/.bin/wskdebug'),
    runtimeArgs: [
      actionName,
      expect.stringContaining(actionName.split('/')[1]),
      '-v',
      '--kind',
      'nodejs:12'
    ],
    envFile: path.join('${workspaceFolder}', envFile), // eslint-disable-line no-template-curly-in-string
    localRoot: path.resolve('/'),
    remoteRoot: '/code'
  })
}

const getExpectedUIVSCodeDebugConfig = uiPort => expect.objectContaining({
  type: 'chrome',
  request: 'launch',
  name: 'Web',
  url: `http://localhost:${uiPort}`,
  webRoot: path.resolve('/web-src'),
  breakOnLoad: true,
  sourceMapPathOverrides: {
    '*': path.resolve('/dist/web-src-dev/*')
  }
})
/* ****************** Tests ******************* */

test('runDev is exported', async () => {
  expect(runDev).toBeDefined()
  expect(typeof runDev).toBe('function')
})

describe('call checkOpenwhiskCredentials with right params', () => {
  const failMissingRuntimeConfig = async (configVarName, remoteActionsValue) => {
    const devRemote = remoteActionsValue
    const tvmConfig = cloneDeep(global.fakeConfig.tvm) // don't override original
    delete tvmConfig.runtime[configVarName]
    const config = await loadEnvScripts('sample-app', tvmConfig)
    const options = { devRemote }
    await runDev([], config, options)
    expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalledWith(config)
  }

  test('error before chokidar watcher gets a chance to be initialized -> codecov', async () => {
    BuildActions.mockImplementationOnce(() => { throw new Error('error') })
    await expect(failMissingRuntimeConfig('auth', '1')).rejects.toThrowError('error')
  })

  test('missing runtime namespace and devRemote=true', () => failMissingRuntimeConfig('namespace', true))
  test('missing runtime auth and devRemote=true', () => failMissingRuntimeConfig('auth', true))
})

/** @private */
function runCommonTests (ref) {
  test('should save a previous existing .vscode/config.json file to .vscode/config.json.save', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent'
    })
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
    expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontent')
  })

  test('should not save to .vscode/config.json.save if there is no existing .vscode/config.json file', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
  })

  test('should not overwrite .vscode/config.json.save', async () => {
    // why? because it might be because previous restore failed
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })

    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
    expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontentsaved')
  })

  test('should cleanup generated files on SIGINT', async () => {
    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => { expectAppFiles(ref.appFiles) })
    })
  })

  test('should cleanup generated files on error', async () => {
    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    await testCleanupOnError(ref, () => {
      expectAppFiles(ref.appFiles)
    })
  })

  test('should cleanup and restore previous existing .vscode/config.json on SIGINT', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent'
    })

    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
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

    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    await testCleanupOnError(ref, () => {
      expectAppFiles([...ref.appFiles, '/.vscode/launch.json'])
      expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
      expect('/.vscode/launch.json' in global.fakeFileSystem.files()).toEqual(true)
      expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).toEqual('fakecontent')
    })
  })

  test('should restore previously existing ./vscode/launch.json.save on SIGINT', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })

    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
        expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
        expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).toEqual('fakecontentsaved')
      })
    })
  })

  test('should not remove /.vscode folder if there is something else in it (coverage)', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/readme.txt': 'treasure'
    })

    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    global.fakeFileSystem.removeKeys(['/.vscode/launch.json'])

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
        expect('/.vscode/launch.json' in global.fakeFileSystem.files()).toEqual(false)
        expect('/.vscode/readme.txt' in global.fakeFileSystem.files()).toEqual(true)
      })
    })
  })

  test('should restore previously existing ./vscode/launch.json.save on error', async () => {
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })

    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    await testCleanupOnError(ref, () => {
      expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
      expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).toEqual('fakecontentsaved')
    })
  })

  test('should not build and deploy actions if skipActions is set', async () => {
    const options = { skipActions: true, devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    // build & deploy constructor have been called once to init the scripts
    // here we make sure run has not been called
    expect(BuildActions).toHaveBeenCalledTimes(0)
    expect(DeployActions).toHaveBeenCalledTimes(0)
  })

  test('should not set vscode config for actions if skipActions is set', async () => {
    const options = { skipActions: true, devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect(global.fakeFileSystem.files()['/.vscode/launch.json'].toString()).not.toEqual(expect.stringContaining('wskdebug'))
  })
}

/** @private */
function runCommonWithBackendTests (ref) {
  test('should log actions url or name when actions are deployed', async () => {
    DeployActions.mockResolvedValue({
      actions: [
        { name: 'pkg/action', url: 'https://fake.com/action' },
        { name: 'pkg/actionNoUrl' }
      ]
    })
    const log = jest.fn()
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options, log)

    expect(log).toHaveBeenCalledWith(expect.stringContaining('https://fake.com/action'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('pkg/actionNoUrl'))
  })
}

/** @private */
function runCommonRemoteTests (ref) {
  test('should build and deploy actions to remote', async () => {
    const log = jest.fn()
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options, log)
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
    expect(DeployActions).toHaveBeenCalledTimes(2)
  })

  test('should not start the local openwhisk stack', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect(execa).not.toHaveBeenCalledWith(...EXECA_LOCAL_OW_ARGS)
  })

  test('should not generate a /dist/.env.local file with the remote credentials', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect('/dist/.env.local' in global.fakeFileSystem.files()).toEqual(false)
  })
}

/** @private */
function runCommonBackendOnlyTests (ref) {
  test('should not start a ui server', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect(Bundler.mockConstructor).toHaveBeenCalledTimes(0)
  })

  test('should generate a vscode config for actions only', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    const isLocal = !ref.devRemote
    expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
      configurations: [
        getExpectedActionVSCodeDebugConfig(isLocal, 'sample-app-1.0.0/action'),
        getExpectedActionVSCodeDebugConfig(isLocal, 'sample-app-1.0.0/action-zip')
        // fails if ui config
      ]
    }))
  })
}

/** @private */
function runCommonWithFrontendTests (ref) {
  test('should start a ui server', async () => {
    const options = { devRemote: ref.devRemote }
    const fakeMiddleware = Symbol('fake middleware')
    Bundler.mockMiddleware.mockReturnValue(fakeMiddleware)
    await runDev([], ref.config, options)
    expectUIServer(fakeMiddleware, 9080)
  })

  test('should use https cert/key if passed', async () => {
    const options = {
      parcel: {
        https: {
          cert: 'cert.cert',
          key: 'key.key'
        }
      },
      devRemote: ref.devRemote
    }
    process.env.PORT = 8888
    await runDev([], ref.config, options)
    expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(process.env.PORT))
    expect(https.createServer).toHaveBeenCalledWith(options.parcel.https)
    delete process.env.PORT
  })

  test('should cleanup ui server on SIGINT', async () => {
    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
        expect(Bundler.mockStop).toHaveBeenCalledTimes(1)
        expect(mockUIServerInstance.close).toBeCalledTimes(0) // should not be called directly, b/c terminator does
        expect(mockTerminatorInstance.terminate).toBeCalledTimes(1)
        expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
          server: mockHttpsServerInstance
        })
      })
    })
  })

  test('should cleanup ui server on error', async () => {
    await testCleanupOnError(ref, () => {
      expect(Bundler.mockStop).toHaveBeenCalledTimes(1)
      expect(mockUIServerInstance.close).toBeCalledTimes(0) // should not be called directly, b/c terminator does
      expect(mockTerminatorInstance.terminate).toBeCalledTimes(1)
      expect(httpTerminator.createHttpTerminator).toHaveBeenCalledWith({
        server: mockHttpsServerInstance
      })
    })
  })

  test('should exit with 1 if there is an error in cleanup', async () => {
    return new Promise(resolve => {
      const theError = new Error('theerror')
      Bundler.mockStop.mockRejectedValue(theError)
      process.removeAllListeners('SIGINT')
      process.exit.mockImplementation(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(theError)
        expect(process.exit).toHaveBeenCalledWith(1)
        resolve()
      })

      runDev([], ref.config, { devRemote: ref.devRemote })
        .then(() => {
          expect(process.exit).toHaveBeenCalledTimes(0)
          // send cleanup signal
          process.emit('SIGINT')
        // if test times out => means handler is not calling process.exit
        })
    })
  })

  test('should return another available port for the UI server if used', async () => {
    mockHttpsServerAddressInstance.port = 9999
    const options = {
      parcel: {
        https: {
          cert: 'cert.cert',
          key: 'key.key'
        }
      },
      devRemote: ref.devRemote
    }

    process.env.PORT = 8888
    const resultUrl = await runDev([], ref.config, options)
    expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(process.env.PORT))
    expect(https.createServer).toHaveBeenCalledWith(options.parcel.https)
    expect(resultUrl).toBe(`https://localhost:${mockHttpsServerAddressInstance.port}`)
    delete process.env.PORT
  })

  test('should return the used ui server port', async () => {
    const port = 8888
    mockHttpsServerAddressInstance.port = port
    const options = {
      parcel: {
        https: {
          cert: 'cert.cert',
          key: 'key.key'
        }
      },
      devRemote: ref.devRemote
    }

    process.env.PORT = port
    const resultUrl = await runDev([], ref.config, options)
    expect(mockUIServerInstance.listen).toHaveBeenCalledWith(parseInt(process.env.PORT))
    expect(https.createServer).toHaveBeenCalledWith(options.parcel.https)
    expect(resultUrl).toBe(`https://localhost:${process.env.PORT}`)
    delete process.env.PORT
  })
}

describe('with remote actions and no frontend', () => {
  const ref = {}
  beforeEach(async () => {
    // remove '/web-src/index.html' file = no ui
    ref.devRemote = true
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm, ['/web-src/index.html'])
    ref.appFiles = ['/manifest.yml', '/package.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']
  })

  runCommonTests(ref)
  runCommonWithBackendTests(ref)
  runCommonRemoteTests(ref)
  runCommonBackendOnlyTests(ref)

  test('should start a dummy node background process to wait1 on sigint', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    expect(execa).toHaveBeenCalledWith('node')
  })

  test('should kill dummy node background process on sigint', async () => {
    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    const mockKill = jest.fn()
    execa.mockReturnValue({ kill: mockKill })
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
        expect(mockKill).toHaveBeenCalledTimes(1)
      })
    })
  })

  test('should kill dummy node background process on error', async () => {
    const mockKill = jest.fn()
    execa.mockReturnValue({ kill: mockKill })
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    await testCleanupOnError(ref, () => {
      expect(mockKill).toHaveBeenCalledTimes(1)
    })
  })
})

describe('with remote actions and frontend', () => {
  const ref = {}
  beforeEach(async () => {
    ref.devRemote = true
    ref.config = await loadEnvScripts('sample-app', global.fakeConfig.tvm)
    ref.appFiles = ['/manifest.yml', '/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']
  })

  runCommonTests(ref)
  runCommonRemoteTests(ref)
  runCommonWithBackendTests(ref)
  runCommonWithFrontendTests(ref)

  test('should generate a vscode debug config for actions and web-src', async () => {
    mockHttpsServerAddressInstance.port = 9999
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
    const isLocal = !ref.devRemote
    expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
      configurations: [
        getExpectedActionVSCodeDebugConfig(isLocal, 'sample-app-1.0.0/action'),
        getExpectedActionVSCodeDebugConfig(isLocal, 'sample-app-1.0.0/action-zip'),
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
    const options = { devRemote: ref.devRemote }
    await runDev([], ref.config, options)
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
    mockHttpsServerAddressInstance.port = 9999
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

  test('should not run parcel serve', async () => {
    await runDev([], ref.config, { skipServe: true })
    expect(Bundler.mockServe).not.toHaveBeenCalled()
  })
})

// Note: these tests can be safely deleted once the require-adobe-auth is
// natively supported in Adobe I/O Runtime.
test('vscode wskdebug config with require-adobe-auth annotation && apihost=https://adobeioruntime.net', async () => {
  // create test app
  global.addSampleAppFiles()
  global.fakeFileSystem.removeKeys(['/web-src/index.html'])
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  const devRemote = true
  const config = loadConfig()
  // avoid recreating a new fixture
  config.manifest.package.actions.action.annotations = { 'require-adobe-auth': true }
  config.ow.apihost = 'https://adobeioruntime.net'
  const options = { devRemote }
  await runDev([], config, options)

  expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
    configurations: expect.arrayContaining([
      expect.objectContaining({
        type: 'pwa-node',
        request: 'launch',
        name: 'Action:' + 'sample-app-1.0.0/action',
        attachSimplePort: 0,
        runtimeExecutable: path.resolve('/node_modules/.bin/wskdebug'),
        runtimeArgs: [
          'sample-app-1.0.0/__secured_action',
          path.resolve('actions/action.js'),
          '-v',
          '--kind',
          'nodejs:12'
        ],
        envFile: path.join('${workspaceFolder}', '.env'), // eslint-disable-line no-template-curly-in-string
        localRoot: path.resolve('/'),
        remoteRoot: '/code'
      })
    ])
  }))
})

test('vscode wskdebug config with require-adobe-auth annotation && apihost!=https://adobeioruntime.net', async () => {
  // create test app
  global.addSampleAppFiles()
  global.fakeFileSystem.removeKeys(['/web-src/index.html'])
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  const devRemote = true
  const config = loadConfig()
  // avoid recreating a new fixture
  config.manifest.package.actions.action.annotations = { 'require-adobe-auth': true }
  config.ow.apihost = 'https://notadobeioruntime.net'
  const options = { devRemote }
  await runDev([], config, options)

  expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
    configurations: expect.arrayContaining([
      expect.objectContaining({
        type: 'pwa-node',
        request: 'launch',
        name: 'Action:' + 'sample-app-1.0.0/action',
        attachSimplePort: 0,
        runtimeExecutable: path.resolve('/node_modules/.bin/wskdebug'),
        runtimeArgs: [
          'sample-app-1.0.0/action',
          path.resolve('actions/action.js'),
          '-v',
          '--kind',
          'nodejs:12'
        ],
        envFile: path.join('${workspaceFolder}', '.env'), // eslint-disable-line no-template-curly-in-string
        localRoot: path.resolve('/'),
        remoteRoot: '/code'
      })
    ])
  }))
})

test('vscode wskdebug config without runtime option', async () => {
  // create test app
  global.addSampleAppFiles()
  global.fakeFileSystem.removeKeys(['/web-src/index.html'])
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  const devRemote = true
  const config = loadConfig()
  // avoid recreating a new fixture
  delete config.manifest.package.actions.action.runtime
  const options = { devRemote }
  await runDev([], config, options)

  expect(JSON.parse(global.fakeFileSystem.files()['/.vscode/launch.json'].toString())).toEqual(expect.objectContaining({
    configurations: expect.arrayContaining([
      expect.objectContaining({
        type: 'pwa-node',
        request: 'launch',
        name: 'Action:' + 'sample-app-1.0.0/action',
        attachSimplePort: 0,
        runtimeExecutable: path.resolve('/node_modules/.bin/wskdebug'),
        runtimeArgs: [
          'sample-app-1.0.0/action',
          path.resolve('actions/action.js'),
          '-v'
          // no kind
        ],
        envFile: path.join('${workspaceFolder}', '.env'), // eslint-disable-line no-template-curly-in-string
        localRoot: path.resolve('/'),
        remoteRoot: '/code'
      })
    ])
  }))
})
