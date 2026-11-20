/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { runInProcess, isEnvEnabledForHook } = require('./app-helper')

/**
 * Runs a project hook. By default a hook error is only logged. If AIO_FAIL_ON_HOOK_ERROR
 * is enabled for this hook (see isEnvEnabledForHook), the error is rethrown with the hook name so the command fails.
 *
 * @param {string} hookName name of the hook, e.g. 'pre-app-build'
 * @param {string} hookPath see runInProcess in app-helper
 * @param {object} config passed to the hook
 * @param {Function} log called with the error when not failing
 * @returns {Promise<*>} whatever the hook returns
 */
async function runHookOrLog (hookName, hookPath, config, log) {
  try {
    return await runInProcess(hookPath, config)
  } catch (err) {
    if (isEnvEnabledForHook('AIO_FAIL_ON_HOOK_ERROR', hookName)) {
      throw new Error(`Hook '${hookName}' failed: ${err.message}`, { cause: err })
    }
    log(err)
  }
}

module.exports = { runHookOrLog }
