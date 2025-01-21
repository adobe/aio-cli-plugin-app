/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { runInProcess } = require('./app-helper')
const { deployActions } = require('@adobe/aio-lib-runtime')
const logActions = require('./log-actions')

/**
 * Deploys actions.
 *
 * @private
 * @param {object} options
 * @param {object} options.config see src/lib/config-loader.js
 * @param {object} [options.deployConfig] see https://github.com/adobe/aio-lib-runtime/blob/master/README.md#typedefs
 * @param {Function} [options.log] a log function
 * @param {Function} [options.inprocHook] a hook function
 */
module.exports = async ({
  config,
  deployConfig = {},
  log = () => {},
  inprocHook
}) => {
  await runInProcess(config.hooks['pre-app-deploy'], config)

  const hookFilterEntities = Array.isArray(deployConfig.filterEntities?.actions) ? deployConfig.filterEntities.actions : []
  const hookData = {
    appConfig: config,
    filterEntities: hookFilterEntities,
    isLocalDev: deployConfig.isLocalDev
  }

  let entities
  const script = await runInProcess(config.hooks['deploy-actions'], hookData)
  if (!script) {
    if (inprocHook) {
      const hookResults = await inprocHook('deploy-actions', hookData)
      if (hookResults?.failures?.length > 0) {
        // output should be "Error : <plugin-name> : <error-message>\n" for each failure
        log('Error: ' + hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '))
        throw new Error(`Hook 'deploy-actions' failed with ${hookResults.failures[0].error}`)
      }
    }

    entities = await deployActions(config, deployConfig, log)
    await logActions({ entities, log })
  }

  await runInProcess(config.hooks['post-app-deploy'], config)

  return { script, entities }
}
