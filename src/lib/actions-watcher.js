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
const upath = require('upath')
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

  log(`watching action files at ${config.actions.src} ...`)
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
 * @param {Array<string>} filterActions add filters to deploy only specified OpenWhisk actions
 */
async function buildAndDeploy (watcherOptions, filterActions) {
  const { config, isLocal, log, inprocHook } = watcherOptions
  await buildActions(config, filterActions)
  await deployActions(config, isLocal, log, filterActions, inprocHook)
}

/**
 * Create the onchange handler for the watcher.
 *
 * @param {WatcherOptions} watcherOptions the options for the watcher
 * @returns {Function} the onchange handler for the watcher
 */
function createChangeHandler (watcherOptions) {
  const { watcher, log } = watcherOptions

  let deploymentInProgress = false
  let fileChanged = false
  let undeployedFile = ''

  return async (filePath) => {
    aioLogger.debug('Code change triggered...')
    if (deploymentInProgress) {
      aioLogger.debug(`${filePath} has changed. Deploy in progress. This change will be deployed after completion of current deployment.`)
      undeployedFile = filePath
      fileChanged = true
      return
    }
    deploymentInProgress = true
    try {
      aioLogger.debug(`${filePath} has changed. Redeploying actions.`)
      const filterActions = getActionNameFromPath(filePath, watcherOptions)
      // this is happening, but its not showing up because verbose is usually off
      // this might be more important and worthy of signalling to the user
      if (!filterActions.length) {
        log('  -> A non-action file was changed, restart is required to deploy...')
      } else {
        await buildAndDeploy(watcherOptions, filterActions)
        aioLogger.debug('Deployment successful')
      }
    } catch (err) {
      log('  -> Error encountered while deploying actions. Stopping auto refresh.')
      aioLogger.debug(err)
      await watcher.close()
    }
    if (fileChanged) {
      aioLogger.debug('Code changed during deployment. Triggering deploy again.')
      fileChanged = deploymentInProgress = false
      await createChangeHandler(watcherOptions)(undeployedFile)
    }
    deploymentInProgress = false
  }
}

/**
 * Util function which returns the actionName from the filePath.
 *
 * @param {string} filePath  path of the file
 * @param {WatcherOptions} watcherOptions the options for the watcher
 * @returns {Array<string>}  All of the actions which match the modified path
 */
function getActionNameFromPath (filePath, watcherOptions) {
  // note: this check only happens during aio app run
  // before the watcher is started, all actions are built and deployed and hashes updated
  // this code is missing 2 cases:
  // 1. if the action is a folder with a package.json and the changed file is in the folder
  // 2. if the changed file is in the folder with the action, but not the action file itself
  // we need to be careful with these cases, because we could cause a recursive loop
  // for now we continue to error on the cautious side, and output a message suggesting a restart
  const actionNames = []
  const unixFilePath = upath.toUnix(filePath)
  const { config } = watcherOptions
  Object.entries(config.manifest.full.packages).forEach(([, pkg]) => {
    if (pkg.actions) {
      Object.entries(pkg.actions).forEach(([actionName, action]) => {
        const unixActionFunction = upath.toUnix(action.function)
        // since action could be a folder, and changed file could be in the folder
        // we need to compare both ways
        // there are 2 additional cases listed above
        if (unixActionFunction.includes(unixFilePath) || unixFilePath.includes(unixActionFunction)) {
          actionNames.push(actionName)
        }
      })
    }
  })
  return actionNames
}
