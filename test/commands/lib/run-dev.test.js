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
const runLocalRuntime = require('../../../src/lib/run-local-runtime')
const loadConfig = require('../../../src/lib/config-loader')
const defaults = require('../../../src/lib/defaults')
const cloneDeep = require('lodash.clonedeep')
const path = require('path')
const mockAIOConfig = require('@adobe/aio-lib-core-config')
const util = require('util')
const sleep = util.promisify(setTimeout)
// const bundle = require('../../../src/lib/bundle')
const { bundle } = require('@adobe/aio-lib-web')
const bundleServe = require('../../../src/lib/bundle-serve')
const serve = require('../../../src/lib/serve')
const buildActions = require('../../../src/lib/build-actions')
const deployActions = require('../../../src/lib/deploy-actions')
const mockRuntimeLib = require('@adobe/aio-lib-runtime')
const mockLogger = require('@adobe/aio-lib-core-logging')
const logPoller = require('../../../src/lib/log-poller')
const appHelper = require('../../../src/lib/app-helper')
const execa = require('execa')
const yeoman = require('yeoman-environment')
const fs = require('fs-extra')
const getPort = require('get-port')

const mockYeomanRegister = jest.fn()
const mockYeomanRun = jest.fn()
yeoman.createEnv.mockReturnValue({
  register: mockYeomanRegister,
  run: mockYeomanRun
})

jest.mock('yeoman-environment')
jest.mock('execa')
jest.mock('node-fetch')
jest.mock('../../../src/lib/run-local-runtime')
jest.mock('../../../src/lib/bundle-serve')
jest.mock('../../../src/lib/serve')
jest.mock('../../../src/lib/build-actions')
jest.mock('../../../src/lib/deploy-actions')
jest.mock('../../../src/lib/log-poller')
jest.mock('@adobe/aio-lib-env')
jest.mock('get-port')
getPort.mockImplementation(() => {
  return defaults.defaultHttpServerPort
})

jest.mock('../../../src/lib/app-helper', () => {
  const moduleMock = jest.requireActual('../../../src/lib/app-helper')
  return {
    ...moduleMock,
    runPackageScript: jest.fn()
  }
})

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

process.exit = jest.fn()

const now = Date.now
let time

/** @private */
function jestTimerWorkaround () {
  // workaround for timers and elapsed time
  // to replace when https://github.com/facebook/jest/issues/5165 is closed
  // NOTE: the patch is in Jest 26 (opt-in): https://jestjs.io/blog/2020/05/05/jest-26#new-fake-timers

  Date.now = jest.fn()
  global.setTimeout = jest.fn()
  time = now()
  Date.now.mockImplementation(() => time)
  global.setTimeout.mockImplementation((fn, d) => { time = time + d; fn() })
}

const mockCleanup = {
  logPoller: jest.fn(),
  serve: jest.fn(),
  bundle: jest.fn()
}

beforeEach(() => {
  global.fakeFileSystem.reset()

  bundle.mockReset()
  serve.mockReset()
  bundleServe.mockReset()
  buildActions.mockReset()
  deployActions.mockReset()
  runLocalRuntime.mockReset()
  logPoller.run.mockReset()
  appHelper.runPackageScript.mockReset()

  mockCleanup.logPoller.mockReset()
  mockCleanup.serve.mockReset()
  mockCleanup.bundle.mockReset()

  mockYeomanRun.mockReset()
  mockYeomanRegister.mockReset()

  logPoller.run.mockImplementation(() => ({
    poller: {},
    cleanup: mockCleanup.logPoller
  }))
  bundle.mockImplementation(() => ({
    bundler: {},
    cleanup: mockCleanup.bundle
  }))
  serve.mockImplementation(() => ({
    url: '',
    cleanup: mockCleanup.serve
  }))
  bundleServe.mockImplementation(() => ({
    url: '',
    cleanup: mockCleanup.serve
  }))
  execa.mockImplementation(() => ({
    kill: jest.fn()
  }))

  execa.mockReset()
  mockLogger.mockReset()

  process.exit.mockReset()
  process.removeAllListeners('SIGINT')

  jestTimerWorkaround()
})

/* ****************** Consts ******************* */

const localOWCredentials = {
  ...global.fakeConfig.local.runtime
}

const remoteOWCredentials = {
  ...global.fakeConfig.tvm.runtime,
  apihost: global.defaultOwApihost
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
async function loadEnvScripts (config, excludeFiles = [], customApp = false) {
  // create test app
  if (customApp) {
    global.addSampleAppFilesCustomPackage()
  } else {
    global.addSampleAppFiles()
  }

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
  expect(buildActions).toHaveBeenCalledTimes(1)
  expect(buildActions.mock.calls[0][0]).toEqual(expectedBuildDeployConfig)
  expect(deployActions).toHaveBeenCalledTimes(1)
  expect(deployActions.mock.calls[0][0]).toEqual(expectedBuildDeployConfig)
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
async function testCleanupNoErrors (done, ref, postCleanupChecks, options = {}) {
  // todo why do we need to remove listeners here, somehow the one in beforeEach isn't sufficient, is jest adding a listener?
  process.removeAllListeners('SIGINT')
  process.exit.mockImplementation(() => {
    postCleanupChecks()
    expect(process.exit).toHaveBeenCalledWith(1)
    done()
  })

  options.devRemote = ref.devRemote
  await runDev(ref.config, options)
  expect(process.exit).toHaveBeenCalledTimes(0)
  // make sure we have only one listener = cleanup listener after each test + no pending promises
  expect(process.listenerCount('SIGINT')).toEqual(1)
  // send cleanup signal
  process.emit('SIGINT')
  // if test times out => means handler is not calling process.exit
}

/** @private */
async function testCleanupOnError (ref, postCleanupChecks) {
  /* this test is just to see if runDev logs CTRL+C to terminate? this seems backwards */
  const error = new Error('fake')
  const logFunc = (message) => {
    console.log(' //// logFunc ', message)
    if (message.includes('CTRL+C to terminate')) {
      throw error
    } else {
      console.log(message)
    }
  }

  const options = { devRemote: ref.devRemote }
  await expect(runDev(ref.config, options, logFunc)).rejects.toBe(error)
  // postCleanupChecks()
}

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
    const config = await loadEnvScripts(tvmConfig)
    const options = { devRemote }
    await runDev(config, options)
    expect(mockRuntimeLib.utils.checkOpenWhiskCredentials).toHaveBeenCalledWith(config)
  }

  test('error before chokidar watcher gets a chance to be initialized -> codecov', async () => {
    buildActions.mockImplementationOnce(() => { throw new Error('error') })
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
    await runDev(ref.config, options)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(true)
    expect(global.fakeFileSystem.files()['/.vscode/launch.json.save'].toString()).toEqual('fakecontent')
  })

  test('should not save to .vscode/config.json.save if there is no existing .vscode/config.json file', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect('/.vscode/launch.json.save' in global.fakeFileSystem.files()).toEqual(false)
  })

  test('should not overwrite .vscode/config.json.save', async () => {
    // why? because it might be because previous restore failed
    global.fakeFileSystem.addJson({
      '.vscode/launch.json': 'fakecontent',
      '.vscode/launch.json.save': 'fakecontentsaved'
    })

    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
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
    await runDev(ref.config, options)
    // build & deploy constructor have been called once to init the scripts
    // here we make sure run has not been called
    expect(buildActions).toHaveBeenCalledTimes(0)
    expect(deployActions).toHaveBeenCalledTimes(0)
  })
}

/** @private */
function runCommonRemoteTests (ref) {
  test('should build and deploy actions to remote', async () => {
    const log = jest.fn()
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options, log)
    expectDevActionBuildAndDeploy(expectedRemoteOWConfig)

    buildActions.mockClear()
    deployActions.mockClear()

    jest.useFakeTimers()

    // First change
    deployActions.mockImplementation(async () => { await sleep(2000) })
    onChangeFunc('changed')
    deployActions.mockImplementation(async () => { throw new Error() })

    // Second change
    onChangeFunc('changed')

    await jest.runAllTimers()

    // Second change should not have resulted in build & deploy yet because first deploy would take 2 secs
    expect(buildActions).toHaveBeenCalledTimes(1)
    expect(deployActions).toHaveBeenCalledTimes(1)

    jest.runAllTimers()
    await sleep(3)

    // The second call to DeployActions will result in an error because of the second mock above
    expect(log).toHaveBeenLastCalledWith(expect.stringContaining('Stopping'))
    expect(buildActions).toHaveBeenCalledTimes(2)
    expect(deployActions).toHaveBeenCalledTimes(2)
  })

  test('should not start the local openwhisk stack', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect(execa).not.toHaveBeenCalledWith(...EXECA_LOCAL_OW_ARGS)
  })

  test('should not generate a /dist/.env.local file with the remote credentials', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect('/dist/.env.local' in global.fakeFileSystem.files()).toEqual(false)
  })
}

/** @private */
function runCommonBackendOnlyTests (ref) {
  test('fetchLogs', async () => {
    const options = { devRemote: ref.devRemote, fetchLogs: true }
    await runDev(ref.config, options)
    expect(serve).not.toHaveBeenCalled()
    expect(bundleServe).not.toHaveBeenCalled()
  })

  test('should not start a ui server', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect(serve).not.toHaveBeenCalled()
    expect(bundleServe).not.toHaveBeenCalled()
  })
}

/** @private */
function runCommonWithFrontendTests (ref) {
  test('should start a ui server', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect(serve).not.toHaveBeenCalled()
    expect(bundleServe).toHaveBeenCalled()
  })

  test('should start a ui server : find available port', async () => {
    const options = { devRemote: ref.devRemote }
    getPort.mockImplementationOnce(() => 12345)
    await runDev(ref.config, options)
    expect(serve).not.toHaveBeenCalled()
    expect(bundleServe).toHaveBeenCalled()
    expect(bundleServe).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ serveOptions: { https: undefined, port: 12345 } }), expect.anything())
  })

  test('should cleanup ui server on SIGINT', async () => {
    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    const mockServeCleanup = jest.fn()
    bundleServe.mockImplementation(() => ({
      url: '',
      cleanup: mockServeCleanup
    }))

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
        expect(mockServeCleanup).toHaveBeenCalledTimes(1)
      })
    })
  })

  test('should cleanup ui server on error', async () => {
    const mockServeCleanup = jest.fn()
    bundleServe.mockImplementation(() => ({
      url: '',
      cleanup: mockServeCleanup
    }))

    await testCleanupOnError(ref, () => {
      expect(mockServeCleanup).toHaveBeenCalledTimes(1)
    })
  })

  test('should exit with 1 if there is an error in cleanup', async () => {
    const mockServeCleanup = jest.fn()
    bundleServe.mockImplementation(() => ({
      url: '',
      cleanup: mockServeCleanup
    }))

    return new Promise(resolve => {
      const theError = new Error('theerror')
      mockServeCleanup.mockRejectedValue(theError)
      process.removeAllListeners('SIGINT')
      process.exit.mockImplementation(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(theError)
        expect(process.exit).toHaveBeenCalledWith(1)
        resolve()
      })

      runDev(ref.config, { devRemote: ref.devRemote })
        .then(() => {
          expect(process.exit).toHaveBeenCalledTimes(0)
          // send cleanup signal
          process.emit('SIGINT')
        // if test times out => means handler is not calling process.exit
        })
    })
  })
}

describe('with local actions and frontend', () => {
  const ref = {}
  const mockRunDevLocalCleanup = jest.fn()

  beforeEach(async () => {
    ref.devRemote = false
    ref.config = await loadEnvScripts(global.fakeConfig.tvm)
    ref.appFiles = ['/manifest.yml', '/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']

    mockRunDevLocalCleanup.mockReset()
    runLocalRuntime.mockImplementation(() => ({
      config: ref.config,
      cleanup: mockRunDevLocalCleanup
    }))

    mockYeomanRun.mockImplementation(() => {
      fs.writeFileSync('.vscode/launch.json', '')
    })
  })

  runCommonTests(ref)
  runCommonWithFrontendTests(ref)

  test('should inject REMOTE action urls into the UI if skipActions is set', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApihost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev(ref.config, { skipActions: true })
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })

  test('skip serve and fetch logs (coverage)', async () => {
    const options = { devRemote: ref.devRemote, skipServe: true, fetchLogs: true }

    const url = await runDev(ref.config, options)
    expect(url).toBeUndefined()
    expect(runLocalRuntime).toHaveBeenCalledTimes(1)
    expect(logPoller.run).toHaveBeenCalledTimes(1)
    expect(appHelper.runPackageScript).not.toHaveBeenCalled()

    return new Promise(resolve => {
      testCleanupNoErrors(resolve, ref, () => {
        expect(mockCleanup.serve).toHaveBeenCalledTimes(0)
        expect(mockRunDevLocalCleanup).toHaveBeenCalledTimes(1)
        expect(mockCleanup.logPoller).toHaveBeenCalledTimes(1)
      }, options)
    })
  })
})

describe('with remote actions and no frontend (custom package)', () => {
  const ref = {}

  beforeEach(async () => {
    // remove '/web-src/index.html' file = no ui
    ref.devRemote = true
    ref.config = await loadEnvScripts(global.fakeConfig.tvm, ['/web-src/index.html'], /* custom package in manifest */ true)
    ref.appFiles = ['/manifest.yml', '/package.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']

    mockYeomanRun.mockImplementation(() => {
      fs.writeFileSync('.vscode/launch.json', '')
    })
  })

  runCommonTests(ref)
  runCommonRemoteTests(ref)
  runCommonBackendOnlyTests(ref)
})

describe('with remote actions and no frontend', () => {
  const ref = {}

  beforeEach(async () => {
    // remove '/web-src/index.html' file = no ui
    ref.devRemote = true
    ref.config = await loadEnvScripts(global.fakeConfig.tvm, ['/web-src/index.html'])
    ref.appFiles = ['/manifest.yml', '/package.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']

    mockYeomanRun.mockImplementation(() => {
      fs.writeFileSync('.vscode/launch.json', '')
    })
  })

  runCommonTests(ref)
  runCommonRemoteTests(ref)
  runCommonBackendOnlyTests(ref)

  test('should start a dummy node background process to wait1 on sigint', async () => {
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect(execa).toHaveBeenCalledWith('node')
  })

  test('should kill dummy node background process on sigint', async () => {
    execa.mockImplementation(() => ({
      kill: jest.fn()
    }))

    const mockKill = jest.fn()
    execa.mockReturnValue({ kill: mockKill })
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
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
    await runDev(ref.config, options)
    await testCleanupOnError(ref, () => {
      expect(mockKill).toHaveBeenCalledTimes(1)
    })
  })
})

describe('with remote actions and frontend', () => {
  const ref = {}
  beforeEach(async () => {
    ref.devRemote = true
    ref.config = await loadEnvScripts(global.fakeConfig.tvm)
    ref.appFiles = ['/manifest.yml', '/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js']

    mockYeomanRun.mockImplementation(() => {
      fs.writeFileSync('.vscode/launch.json', '')
    })
  })

  runCommonTests(ref)
  runCommonRemoteTests(ref)
  runCommonWithFrontendTests(ref)

  test('should inject remote action urls into the UI', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApihost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })

  test('should still inject remote action urls into the UI if skipActions is set', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApihost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev(ref.config, { skipActions: true })
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })

  test('should inject local action urls into the UI', async () => {
    const baseUrl = localOWCredentials.apihost + '/api/v1/web/' + localOWCredentials.namespace + '/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    const options = { devRemote: ref.devRemote }
    await runDev(ref.config, options)
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })

  test('should inject REMOTE action urls into the UI if skipActions is set', async () => {
    const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApihost.split('https://')[1] + '/api/v1/web/sample-app-1.0.0/'
    const retVal = {
      action: baseUrl + 'action',
      'action-zip': baseUrl + 'action-zip',
      'action-sequence': baseUrl + 'action-sequence'
    }
    mockRuntimeLib.utils.getActionUrls.mockReturnValueOnce(retVal)
    await runDev(ref.config, { skipActions: true })
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual(retVal)
  })
})

describe('with frontend only', () => {
  const ref = {}
  beforeEach(async () => {
    // exclude manifest file = backend only (should we make a fixture app without actions/ as well?)
    ref.config = await loadEnvScripts(global.fakeConfig.tvm, ['/manifest.yml'])
    ref.appFiles = ['/package.json', '/web-src/index.html', '/web-src/src/config.json', '/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action.js'] // still have actions cause we only delete manifest.yml

    mockYeomanRun.mockImplementation(() => {
      fs.writeFileSync('.vscode/launch.json', '')
    })
  })

  runCommonTests(ref)
  runCommonWithFrontendTests(ref)

  test('custom deploy and build scripts (coverage)', async () => {
    appHelper.runPackageScript.mockResolvedValue({})
    await runDev(ref.config)
    expect(appHelper.runPackageScript).toHaveBeenCalled()
  })

  test('only build-static hook set (coverage for lib/serve.js)', async () => {
    appHelper.runPackageScript.mockImplementation((scriptName) => {
      // when build-static hook is set, we don't use our parcel bundler
      // when we don't use our parcel bundler, we don't use the http serving
      // capabilities of the parcel bundler, and use our own static-serve (lib/serve.js)
      if (scriptName === 'build-static') {
        return {}
      }
    })
    await runDev(ref.config)
    expect(serve).toHaveBeenCalled()
    expect(bundleServe).not.toHaveBeenCalled()
  })

  test('should set hasBackend=false', async () => {
    expect(ref.config.app.hasBackend).toBe(false)
  })

  test('should start a ui server', async () => {
    await runDev(ref.config)
    expect(serve).not.toHaveBeenCalled()
    expect(bundleServe).toHaveBeenCalled()
  })

  test('should not call build and deploy', async () => {
    await runDev(ref.config)
    // build & deploy constructor have been called once to init the scripts
    // here we make sure run has not been calle
    expect(buildActions).toHaveBeenCalledTimes(0)
    expect(deployActions).toHaveBeenCalledTimes(0)
  })

  test('should create config.json = {}', async () => {
    await runDev(ref.config)
    expect('/web-src/src/config.json' in global.fakeFileSystem.files()).toEqual(true)
    expect(JSON.parse(global.fakeFileSystem.files()['/web-src/src/config.json'].toString())).toEqual({})
  })

  test('should not run serve', async () => {
    await runDev(ref.config, { skipServe: true })
    expect(serve).not.toHaveBeenCalled()
    expect(bundleServe).not.toHaveBeenCalled()
  })
})
