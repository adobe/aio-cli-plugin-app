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
const vscode = require('./vscode')
const bundle = require('./bundle')
const serve = require('./serve')
const Cleanup = require('./cleanup')
const runDevLocal = require('./run-dev-local')

const buildActions = require('./build-actions')
const deployActions = require('./deploy-actions')
const actionsWatcher = require('./actions-watcher')

const utils = require('./app-helper')
const execa = require('execa')
const { run: logPoller } = require('./log-poller')

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
  const isLocal = !options.devRemote // applies only for backend

  aioLogger.debug(`hasFrontend ${hasFrontend}`)
  aioLogger.debug(`withBackend ${withBackend}`)
  aioLogger.debug(`isLocal ${isLocal}`)

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

    // Build Phase
    if (withBackend) {
      if (isLocal) {
        const { config: localConfig, cleanup: localCleanup } = await runDevLocal(config, log, options.verbose)
        devConfig = localConfig
        cleanup.add(() => localCleanup(), 'cleaning up runDevLocal')
      } else {
        // check credentials
        rtLibUtils.checkOpenWhiskCredentials(devConfig)
        log('using remote actions')
      }

      // build and deploy actions
      log('building actions..')
      await buildActions(devConfig)

      log(`watching action files at ${devConfig.actions.src}...`)
      const { cleanup: watcherCleanup } = await actionsWatcher({ config: devConfig, isLocal, log })
      cleanup.add(() => watcherCleanup(), 'stopping action watcher...')
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

      if (!options.skipServe) {
        const script = await utils.runPackageScript('build-static')
        if (!script) {
          const { cleanup: bundlerCleanup } = await bundle(devConfig, log, bundleOptions)
          cleanup.add(() => bundlerCleanup(), 'cleaning up bundle...')
        }
      }
    }

    // Deploy Phase
    if (withBackend || (hasFrontend && !options.skipServe)) {
      // deploy actions
      if (withBackend) {
        log('redeploying actions..')
        await deployActions(devConfig, isLocal, log)
      }

      // serve UI
      if (hasFrontend) {
        if (!options.skipServe) {
          const script = await utils.runPackageScript('deploy-static')
          if (!script) {
            const { url, cleanup: serverCleanup } = await serve(config, log, bundleOptions)
            frontEndUrl = url
            cleanup.add(() => serverCleanup(), 'cleaning up serve...')
          }
        }
      }
    }

    log('setting up vscode debug configuration files...')
    const vscodeConfig = vscode(devConfig)
    await vscodeConfig.update({ hasFrontend, withBackend, frontEndUrl })
    cleanup.add(() => vscodeConfig.cleanup(), 'cleaning up vscode debug configuration files...')

    if (!isLocal && !hasFrontend) {
      // not local + ow is not running => need to explicitly wait for CTRL+C
      // trick to avoid termination
      const dummyProc = execa('node')
      cleanup.add(() => dummyProc.kill(), 'stopping sigint waiter...')
    }
    log('press CTRL+C to terminate dev environment')

    if (config.app.hasBackend && fetchLogs) {
      const { cleanup: pollerCleanup } = await logPoller(devConfig)
      cleanup.add(() => pollerCleanup(), 'cleaning up log poller...')
    }
  } catch (e) {
    aioLogger.error('unexpected error, cleaning up...')
    await cleanup.run()
    throw e
  }
  return frontEndUrl
}

module.exports = runDev
