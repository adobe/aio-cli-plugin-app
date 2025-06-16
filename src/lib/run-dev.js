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
const { bundle } = require('@adobe/aio-lib-web')
const bundleServe = require('./bundle-serve')
const { defaultHttpServerPort: SERVER_DEFAULT_PORT } = require('./defaults')
const serve = require('./serve')
const Cleanup = require('./cleanup')

const buildActions = require('./build-actions')
const deployActions = require('./deploy-actions')
const actionsWatcher = require('./actions-watcher')

const utils = require('./app-helper')
const { run: logPoller } = require('./log-poller')
const getPort = require('get-port')

/** @private */
async function runDev (config, dataDir, options = {}, log = () => {}, inprocHook) {
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
  const portToUse = parseInt(process.env.PORT) || SERVER_DEFAULT_PORT

  const uiPort = await getPort({ port: portToUse })
  if (uiPort !== portToUse) {
    log(`Could not use port:${portToUse}, using port:${uiPort} instead`)
  }
  aioLogger.debug(`hasFrontend ${hasFrontend}`)
  aioLogger.debug(`withBackend ${withBackend}`)

  let frontEndUrl

  // state
  const devConfig = config // config will be different if local or remote
  devConfig.envFile = '.env'

  const cleanup = new Cleanup()
  let defaultBundler = null

  try {
    // Build Phase - actions
    if (withBackend) {
      // check credentials
      rtLibUtils.checkOpenWhiskCredentials(devConfig)
      log('using remote actions')

      // build and deploy actions
      log('building actions..')
      await buildActions(devConfig, null, false /* force build */)
      const { cleanup: watcherCleanup } = await actionsWatcher({ config: devConfig, log, inprocHook })
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
        // note: 3rd arg, _isLocalDev is not used in RuntimeLib
        // there is no such thing as --local anymore
        urls = rtLibUtils.getActionUrls(devConfig, false, false, true)
      }
      utils.writeConfig(devConfig.web.injectedConfig, urls)

      if (!options.skipServe) {
        const script = await utils.runScript(config.hooks['build-static'])
        if (!script) {
          const entries = config.web.src + '/**/*.html'
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
          defaultBundler = await bundle(entries, config.web.distDev, bundleOptions, log)
        }
      }
    }

    // Deploy Phase - deploy actions
    if (withBackend) {
      log('redeploying actions..')
      const deployConfig = {
        filterEntities: {
          byBuiltActions: true
        }
      }
      await deployActions({
        config: devConfig,
        deployConfig,
        log,
        inprocHook
      })
    }

    // Deploy Phase - serve the web UI
    if (hasFrontend) {
      if (!options.skipServe) {
        const script = await utils.runScript(config.hooks['serve-static'])
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

    // if there is no frontEndUrl, this is because the hook serve-static was set
    // since there is no way for us to know what serve-static does (to possibly get the front-end url from it),
    // we treat this effectively as there is no front end, for the vscode config generator
    if (!frontEndUrl) {
      devConfig.app.hasFrontend = false
    }

    // todo: remove vscode config swapping, dev command uses a persistent file so we don't need this.
    // also there was a latent issue with projects that defined an action src as a folder with an index.js file.
    // it looks explicitly for package.json and fails if it does not find it.
    // regarless, we don't need it, and when we actually remove --local we can be rid of this.

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
