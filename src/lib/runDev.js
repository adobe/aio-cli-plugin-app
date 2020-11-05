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
/* eslint-disable no-template-curly-in-string */
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:runDev', { provider: 'debug' })
const rtLib = require('@adobe/aio-lib-runtime')
const rtLibUtils = rtLib.utils
const path = require('path')
const fs = require('fs-extra')
const cloneDeep = require('lodash.clonedeep')
const vscode = require('./vscode')
const Cleanup = require('./cleanup')
const dedent = require('dedent-js')

const httpTerminator = require('http-terminator')
const BuildActions = require('@adobe/aio-lib-runtime').buildActions
const DeployActions = require('@adobe/aio-lib-runtime').deployActions
// const ActionLogs = require('../commands/app/logs')
const utils = require('./app-helper')
const EventPoller = require('../lib/poller')
const { OW_CONFIG_RUNTIMES_FILE, OW_JAR_URL, OW_LOCAL_APIHOST, OW_LOCAL_NAMESPACE, OW_LOCAL_AUTH } = require('../lib/owlocal')
const execa = require('execa')
const Bundler = require('parcel-bundler')
const chokidar = require('chokidar')
let running = false
let changed = false

const owWaitInitTime = 2000
const owWaitPeriodTime = 500
const owTimeout = 60000
const fetchLogInterval = 10000
const logOptions = {}
const eventPoller = new EventPoller(fetchLogInterval)

/** @private */
async function runDevLocal (config, cleanup, log) {
  const devConfig = cloneDeep(config)
  devConfig.envFile = path.join(config.app.dist, '.env.local')
  const owJarFile = path.join(config.app.cliConfig.dataDir, 'openwhisk', 'openwhisk-standalone.jar')

  // take following steps only when we have a backend
  log('checking if java is installed...')
  if (!await utils.hasJavaCLI()) {
    throw new Error('could not find java CLI, please make sure java is installed')
  }

  log('checking if docker is installed...')
  if (!await utils.hasDockerCLI()) {
    throw new Error('could not find docker CLI, please make sure docker is installed')
  }

  log('checking if docker is running...')
  if (!await utils.isDockerRunning()) {
    throw new Error('docker is not running, please make sure to start docker')
  }

  if (!fs.existsSync(owJarFile)) {
    log(`downloading OpenWhisk standalone jar from ${OW_JAR_URL} to ${owJarFile}, this might take a while... (to be done only once!)`)
    await utils.downloadOWJar(OW_JAR_URL, owJarFile)
  }

  log('starting local OpenWhisk stack...')
  const res = await utils.runOpenWhiskJar(owJarFile, OW_CONFIG_RUNTIMES_FILE, OW_LOCAL_APIHOST, owWaitInitTime, owWaitPeriodTime, owTimeout, { stderr: 'inherit' })
  cleanup.add(() => res.proc.kill(), 'stopping local OpenWhisk stack...')

  log('setting local openwhisk credentials...')
  const runtime = {
    namespace: OW_LOCAL_NAMESPACE,
    auth: OW_LOCAL_AUTH,
    apihost: OW_LOCAL_APIHOST
  }
  devConfig.ow = { ...devConfig.ow, ...runtime }

  // delete potentially conflicting env vars
  delete process.env.AIO_RUNTIME_APIHOST
  delete process.env.AIO_RUNTIME_NAMESPACE
  delete process.env.AIO_RUNTIME_AUTH

  log(`writing credentials to tmp wskdebug config '${devConfig.envFile}'`)
  // prepare wskprops for wskdebug
  fs.ensureDirSync(config.app.dist)
  const envFile = rtLibUtils._absApp(devConfig.root, devConfig.envFile)
  await fs.outputFile(envFile, dedent(`
  # This file is auto-generated, do not edit.
  # The items below are temporary credentials for local debugging
  OW_NAMESPACE=${devConfig.ow.namespace}
  OW_AUTH=${devConfig.ow.auth}
  OW_APIHOST=${devConfig.ow.apihost}
  `))

  cleanup.add(() => {
    if (fs.existsSync(devConfig.envFile)) {
      fs.unlinkSync(devConfig.envFile)
    }
  }, 'removing wskdebug tmp .env file...')

  return devConfig
}

/** @private */
async function runDev (args = [], config, options = {}, log = () => {}) {
  // note: args are considered perfect here because this function is only ever called by the `app run` command

  /* parcel bundle options */
  const bundleOptions = options.parcel || {}
  /* skip actions */
  const skipActions = !!options.skipActions
  /* fetch logs for actions option */
  const fetchLogs = options.fetchLogs || false

  // control variables
  const hasFrontend = config.app.hasFrontend
  const withBackend = config.app.hasBackend && !skipActions
  const isLocal = !config.actions.devRemote // applies only for backend

  // port for UI
  const uiPort = parseInt(args[0]) || parseInt(process.env.PORT) || 9080

  let frontEndUrl

  // state
  let devConfig = config // config will be different if local or remote
  devConfig.envFile = '.env'

  const cleanup = new Cleanup()

  // bind cleanup function
  process.on('SIGINT', async () => {
    // in case app-scripts are eventually turned into a lib:
    // - don't exit the process, just make sure we get out of waiting
    // - unregister sigint and return properly (e.g. not waiting on stdin.resume anymore)
    try {
      await cleanup.run()
      log('exiting!')
      process.exit(0) // eslint-disable-line no-process-exit
    } catch (e) {
      aioLogger.error('unexpected error while cleaning up!')
      aioLogger.error(e)
      process.exit(1) // eslint-disable-line no-process-exit
    }
  })

  try {
    // TODO: Is there a chance of using run cmd on actions from plugin-runtime in future?
    // In that case this backend stuff might have to go to lib-runtime ?
    if (withBackend) {
      if (isLocal) {
        devConfig = await runDevLocal(config, cleanup, log)
      } else {
        // check credentials
        rtLibUtils.checkOpenWhiskCredentials(config)
        log('using remote actions')
      }

      // build and deploy actions
      log('redeploying actions..')
      await _buildAndDeploy(devConfig, isLocal, log)

      const watcher = chokidar.watch(devConfig.actions.src)
      watcher.on('change', _getActionChangeHandler(devConfig, isLocal, log, watcher))
      cleanup.add(() => watcher.close(), 'stopping action watcher...')
    }

    if (hasFrontend) {
      let urls = {}
      if (config.app.hasBackend) {
        // inject backend urls into ui
        // note the condition: we still write backend urls EVEN if skipActions is set
        // the urls will always point to remotely deployed actions if skipActions is set
        log('injecting backend urls into frontend config')
        urls = await rtLibUtils.getActionUrls(devConfig, true, isLocal && !skipActions)
      }
      await utils.writeConfig(devConfig.web.injectedConfig, urls)

      log('starting local frontend server ..')
      const entryFile = path.join(devConfig.web.src, 'index.html')

      // our defaults here can be overridden by the bundleOptions passed in
      // bundleOptions.https are also passed to bundler.serve
      const parcelBundleOptions = {
        cache: false,
        outDir: devConfig.web.distDev,
        contentHash: false,
        watch: true,
        minify: false,
        logLevel: 1,
        ...bundleOptions
      }

      let actualPort = uiPort
      const uiBundler = new Bundler(entryFile, parcelBundleOptions)
      cleanup.add(() => uiBundler.stop(), 'stopping parcel watcher...')
      const uiServer = await uiBundler.serve(uiPort, bundleOptions.https)
      actualPort = uiServer.address().port
      const uiServerTerminator = httpTerminator.createHttpTerminator({
        server: uiServer
      })
      cleanup.add(() => uiServerTerminator.terminate(), 'stopping ui server...')

      if (actualPort !== uiPort) {
        log(`Could not use port:${uiPort}, using port:${actualPort} instead`)
      }

      frontEndUrl = `${bundleOptions.https ? 'https:' : 'http:'}//localhost:${actualPort}`
      log(`local frontend server running at ${frontEndUrl}`)
    }

    log('setting up vscode debug configuration files...')
    const vscodeConfig = vscode(devConfig)
    await vscodeConfig.update({ hasFrontend, withBackend, frontEndUrl })
    cleanup.add(() => vscodeConfig.cleanup(), 'cleaning up vscode debug configuration files...')

    if (!isLocal && !hasFrontend) {
      // not local + ow is not running => need to explicitely wait for CTRL+C
      // trick to avoid termination
      const dummyProc = execa('node')
      cleanup.add(() => dummyProc.kill(), 'stopping sigint waiter...')
    }
    log('press CTRL+C to terminate dev environment')

    if (config.app.hasBackend && fetchLogs) {
      // fetch action logs
      eventPoller.onPoll(logListener)
      eventPoller.start({ config: devConfig })
      cleanup.add(() => eventPoller.stop(), 'stopping event poller...')
    }
  } catch (e) {
    aioLogger.error('unexpected error, cleaning up...')
    await cleanup.run()
    throw e
  }
  return frontEndUrl
}

/** @private */
async function logListener (args) {
  try {
    // TODO : Is is better to just tail ?
    const ret = await rtLib.printActionLogs(args.config, console.log, logOptions.limit || 1, [], false, false, undefined, logOptions.startTime)
    logOptions.limit = 30
    logOptions.startTime = ret.lastActivationTime
  } catch (e) {
    aioLogger.error('Error while fetching action logs ' + e)
  } finally {
    eventPoller.start(args)
  }
}

/** @private */
function _getActionChangeHandler (devConfig, isLocalDev, logFunc, watcher) {
  return async (filePath) => {
    if (running) {
      aioLogger.debug(`${filePath} has changed. Deploy in progress. This change will be deployed after completion of current deployment.`)
      changed = true
      return
    }
    running = true
    try {
      aioLogger.debug(`${filePath} has changed. Redeploying actions.`)
      await _buildAndDeploy(devConfig, isLocalDev, logFunc)
      aioLogger.debug('Deployment successful.')
    } catch (err) {
      logFunc('  -> Error encountered while deploying actions. Stopping auto refresh.')
      aioLogger.debug(err)
      await watcher.close()
    }
    if (changed) {
      aioLogger.debug('Code changed during deployment. Triggering deploy again.')
      changed = running = false
      await _getActionChangeHandler(devConfig, isLocalDev, logFunc, watcher)(devConfig.actions.src)
    }
    running = false
  }
}

/** @private */
async function _buildAndDeploy (devConfig, isLocalDev, logFunc) {
  await BuildActions(devConfig)
  const entities = await DeployActions(devConfig, { isLocalDev })
  if (entities.actions) {
    entities.actions.forEach(a => {
      logFunc(`  -> ${a.url || a.name}`)
    })
  }
}

module.exports = runDev
