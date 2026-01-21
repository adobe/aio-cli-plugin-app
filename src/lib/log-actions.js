/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONSTJ
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { createWebExportFilter } = require('./app-helper')
const { transformActionEntities } = require('./url-transformer')

/**
 * Logs deployed action entities.
 *
 * @private
 * @param {object} options
 * @param {object} options.entities runtime entities that have been deployed
 * @param {object} [options.deployConfig] see https://github.com/adobe/aio-lib-runtime?tab=readme-ov-file#typedefs
 * @param {Function} [options.log] a log function
 */
module.exports = async ({
  entities,
  log = console.log
}) => {
  if (!entities.actions) {
    return
  }

  log('Your deployed actions:')

  const actions = transformActionEntities(entities.actions)
  const _web = actions.filter(createWebExportFilter(true))
  const _webRaw = actions.filter(createWebExportFilter('raw'))
  const web = [..._web, ..._webRaw]
  const nonWeb = actions.filter(createWebExportFilter(false))

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
