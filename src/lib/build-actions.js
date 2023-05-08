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

const { runInProcess } = require('./app-helper')
const { buildActions } = require('@adobe/aio-lib-runtime')

/**
 * Builds actions.
 *
 * @param {object} config see src/lib/config-loader.js
 * @param {Array<string>} filterActions add filters to deploy only specified OpenWhisk actions
 * @param {boolean} [forceBuild=false] force a build (skip file changed hash check)
 */
module.exports = async (config, filterActions, forceBuild = false) => {
  runInProcess(config.hooks['pre-app-build'], config)
  const script = await runInProcess(config.hooks['build-actions'], { config, options: { filterActions, forceBuild } })
  if (!script) {
    await buildActions(config, filterActions, forceBuild)
  }
  runInProcess(config.hooks['post-app-build'], config)
}
