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
const { bundle } = require('@adobe/aio-lib-web')
const bundleServe = require('./bundle-serve')
const { defaultHttpServerPort: SERVER_DEFAULT_PORT } = require('./defaults')
const serve = require('./serve')
const Cleanup = require('./cleanup')
const runLocalRuntime = require('./run-local-runtime')

const buildActions = require('./build-actions')
const deployActions = require('./deploy-actions')
const actionsWatcher = require('./actions-watcher')

const utils = require('./app-helper')
const { run: logPoller } = require('./log-poller')
const getPort = require('get-port')

/** @private */
async function runDev (config, options = {}, log = () => {}) {
  /* parcel bundle options */
  const bundleOptions = {
    shouldDisableCache: true,
    shouldContentHash: true,
    shouldOptimize: false,
    ...options.parcel
  }
  /* skip actions */
  const skipActions = !!options.skipActions
  /* fetch logs for actions option */
  const fetchLogs = options.fetchLogs || false

  // control variables
  const hasFrontend = config.app.hasFrontend
  const withBackend = config.app.hasBackend && !skipActions
  const isLocal = !options.devRemote // applies only for backend
  const portToUse = parseInt(process.env.PORT) || SERVER_DEFAULT_PORT
  const uiPort = await getPort({ port: portToUse })
  if (uiPort !== portToUse) {
    log(`Could not use port:${portToUse}, using port:${uiPort} instead`)
  }
  aioLogger.debug(`hasFrontend ${hasFrontend}`)
  aioLogger.debug(`withBackend ${withBackend}`)
  aioLogger.debug(`isLocal ${isLocal}`)

  let frontEndUrl

  // state
  let devConfig = config // config will be different if local or remote
  devConfig.envFile = '.env'

  const cleanup = new Cleanup()
  let defaultBundler = null

  try {
    // Build Phase - actions
    if (withBackend) {
      if (isLocal) {
        const { config: localConfig, cleanup: localCleanup } = await runLocalRuntime(config, log, options.verbose)
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

    // Build Phase - Web Assets, build, inject action url json
    if (hasFrontend) {
      let urls = {}
      if (config.app.hasBackend) {
        // inject backend urls into ui
        // note the condition: we still write backend urls EVEN if skipActions is set
        // the urls will always point to remotely deployed actions if skipActions is set
        log('injecting backend urls into frontend config')
        urls = rtLibUtils.getActionUrls(devConfig, true, isLocal && !skipActions)
      }
      utils.writeConfig(devConfig.web.injectedConfig, urls)

      if (!options.skipServe) {
        const script = await utils.runPackageScript('build-static')
        if (!script) {
          const entryFile = config.web.src + '/index.html'
          bundleOptions.serveOptions = {
            port: uiPort,
            https: bundleOptions.https
          }
          bundleOptions.hmrOptions = {
            port: uiPort
          }
          // TODO: Move this and bundleServe to aio-lib-web so we can remove the parcel dependency
          bundleOptions.additionalReporters = [
            { packageName: '@parcel/reporter-cli', resolveFrom: __filename }
          ]
          defaultBundler = await bundle(entryFile, config.web.distDev, bundleOptions, log)
        }
      }
    }

    // Deploy Phase - deploy actions
    if (withBackend) {
      log('redeploying actions..')
      await deployActions(devConfig, isLocal, log)
    }

    // Deploy Phase - serve the web UI
    if (hasFrontend) {
      if (!options.skipServe) {
        const script = await utils.runPackageScript('serve-static')
        if (!script) {
          let result
          if (defaultBundler) {
            result = await bundleServe(defaultBundler, bundleOptions, log)
          } else {
            result = await serve(devConfig.web.distDev, uiPort, bundleOptions, log)
          }

          const { url, cleanup: serverCleanup } = result
          frontEndUrl = url
          cleanup.add(() => serverCleanup(), 'cleaning up serve...')
        }
      }
    }

    log('setting up vscode debug configuration files...')
    const vscodeConfig = vscode(devConfig)
    await vscodeConfig.update({ frontEndUrl })
    cleanup.add(() => vscodeConfig.cleanup(), 'cleaning up vscode debug configuration files...')

    // automatically fetch logs if there are actions
    if (config.app.hasBackend && fetchLogs) {
      const { cleanup: pollerCleanup } = await logPoller(devConfig)
      cleanup.add(() => pollerCleanup(), 'cleaning up log poller...')
    }
    cleanup.wait()
  } catch (e) {
    aioLogger.error('unexpected error, cleaning up...')
    await cleanup.run()
    throw e
  }
  log('press CTRL+C to terminate dev environment')
  return frontEndUrl
}

module.exports = runDev
