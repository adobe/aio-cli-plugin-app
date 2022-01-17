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

const utils = require('./app-helper')
const { deployActions } = require('@adobe/aio-lib-runtime')

/**
 * Deploys actions.
 *
 * @param {object} config see src/lib/config-loader.js
 * @param {boolean} isLocalDev=false set to true if it's a local deploy
 * @param {Function} [log] a log function
 * @param {boolean} filter true if a filter by built actions is desired.
 */
/** @private */
module.exports = async (config, isLocalDev = false, log = () => {}, filter = false) => {
  utils.runScript(config.hooks['pre-app-deploy'])
  const script = await utils.runScript(config.hooks['deploy-actions'])
  if (!script) {
    const deployConfig = {
      isLocalDev,
      filterEntities: {
        byBuiltActions: filter
      }
    }
    const entities = await deployActions(config, deployConfig, log)
    if (entities.actions) {
      const web = entities.actions.filter(utils.createWebExportFilter(true))
      const nonWeb = entities.actions.filter(utils.createWebExportFilter(false))

      if (web.length > 0) {
        log('web actions:')
        web.forEach(a => {
          log(`  -> ${a.url || a.name}`)
        })
      }

      if (nonWeb.length > 0) {
        log('non-web actions:')
        nonWeb.forEach(a => {
          log(`  -> ${a.url || a.name}`)
        })
      }
    }
  }
  utils.runScript(config.hooks['post-app-deploy'])
}
