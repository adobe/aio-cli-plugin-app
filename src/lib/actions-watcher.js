/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const chokidar = require('chokidar')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:actions-watcher', { provider: 'debug' })
const buildActions = require('./build-actions')
const deployActions = require('./deploy-actions')

/**
 * @typedef {object} WatchReturnObject
 * @property {object} watcher the watcher object
 * @property {Function} cleanup callback function to cleanup available resources
 */

/**
 * @typedef {object} WatcherOptions
 * @property {object} config the app config (see src/lib/config-loader.js)
 * @property {boolean} isLocal whether the deployment is local or not
 * @property {Function} log the app logger
 * @property {object} [watcher] the watcher itself
 */

/**
 * Create a watcher.
 *
 * @param {WatcherOptions} watcherOptions the options for the watcher
 * @returns {WatchReturnObject} the WatchReturnObject
 */
module.exports = async (watcherOptions) => {
  const { config, log } = watcherOptions

  log(`watching action files at ${config.actions.src}...`)
  const watcher = chokidar.watch(config.actions.src)

  watcher.on('change', createChangeHandler({ ...watcherOptions, watcher }))

  const cleanup = async () => {
    aioLogger.debug('stopping action watcher...')
    await watcher.close()
  }

  return {
    watcher,
    cleanup
  }
}

/**
 * Builds and deploy the app.
 *
 * @param {WatcherOptions} watcherOptions the options for the watcher
 */
async function buildAndDeploy (watcherOptions) {
  const { config, isLocal, log } = watcherOptions

  await buildActions(config)
  await deployActions(config, isLocal, log)
}

/**
 * Create the onchange handler for the watcher.
 *
 * @param {WatcherOptions} watcherOptions the options for the watcher
 * @returns {Function} the onchange handler for the watcher
 */
function createChangeHandler (watcherOptions) {
  const { watcher, log } = watcherOptions

  let running = false
  let changed = false

  return async (filePath) => {
    if (running) {
      aioLogger.debug(`${filePath} has changed. Deploy in progress. This change will be deployed after completion of current deployment.`)
      changed = true
      return
    }
    running = true
    try {
      aioLogger.debug(`${filePath} has changed. Redeploying actions.`)
      await buildAndDeploy(watcherOptions)
      aioLogger.debug('Deployment successful.')
    } catch (err) {
      log('  -> Error encountered while deploying actions. Stopping auto refresh.')
      aioLogger.debug(err)
      await watcher.close()
    }
    if (changed) {
      aioLogger.debug('Code changed during deployment. Triggering deploy again.')
      changed = running = false
      await createChangeHandler(watcherOptions)(filePath)
    }
    running = false
  }
}
