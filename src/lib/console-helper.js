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

const config = require('@adobe/aio-lib-core-config')
const { EOL } = require('os')

/**
 * Loads the per-app org/project/workspace configuration, as set by `aio app use`.
 *
 * @param {string} [source] pass 'local' to only read from the local `.aio` file,
 *   bypassing the merge with the global config
 * @returns {object} { org, project, workspace }
 */
function loadCurrentConfiguration (source) {
  const projectConfig = config.get('project', source) || {}
  const org = (projectConfig.org && { id: projectConfig.org.id, name: projectConfig.org.name }) || {}
  const project = { name: projectConfig.name, id: projectConfig.id }
  const workspace = (projectConfig.workspace && { ...projectConfig.workspace }) || {}
  return { org, project, workspace }
}

/**
 * @param {object} config { org, project, workspace }
 * @param {number} spaces number of leading spaces for each line
 * @returns {string} human readable representation of the org/project/workspace configuration
 */
function configString (config, spaces = 0) {
  const { org = {}, project = {}, workspace = {} } = config
  const list = [
    `1. Org: ${org.name || '<no org selected>'}`,
    `2. Project: ${project.name || '<no project selected>'}`,
    `3. Workspace: ${workspace.name || '<no workspace selected>'}`
  ]

  return list
    .map(line => ' '.repeat(spaces) + line)
    .join(EOL)
}

/**
 * @param {object} config { org, project, workspace }
 * @returns {boolean} true if org, project, and workspace are all fully defined
 */
function isCompleteConfig (config) {
  return config &&
    config.org && config.org.id && config.org.name &&
    config.project && config.project.id && config.project.name &&
    config.workspace && config.workspace.id && config.workspace.name
}

/**
 * Checks whether a local `.aio` file (as written by `aio app use`) identifies an
 * Org and Project on its own. Workspace is intentionally not required here, as
 * an Org/Project can be locally selected before a Workspace is (e.g. via `aio app use --global`
 * flows or partial imports) - callers should treat a missing local Workspace as
 * "no workspace selected", not as "no local configuration at all".
 *
 * @returns {boolean} true if the local `.aio` file identifies an Org and Project
 */
function hasLocalConfiguration () {
  const { org, project } = loadCurrentConfiguration('local')
  return !!(org.id && org.name && project.id && project.name)
}

module.exports = {
  loadCurrentConfiguration,
  configString,
  isCompleteConfig,
  hasLocalConfiguration
}
