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

/**
 * yeoman-environment 4+ is ESM-only (no require() entry). Load it lazily so CommonJS
 * commands can still run on Node 20+.
 *
 * @param {Record<string, unknown>} [options] constructor options (e.g. skipInstall)
 * @returns {Promise<object>} a yeoman-environment instance (createEnv result)
 */
async function createYeomanEnvironment (options) {
  const { createEnv } = await import('yeoman-environment')
  return createEnv(options)
}

export { createYeomanEnvironment }
