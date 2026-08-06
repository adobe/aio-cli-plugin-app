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
 * Loads the local (per-app) org/project/workspace configuration, as set by `aio app use`.
 *
 * @returns {object} { org, project, workspace }
 */
function loadCurrentConfiguration () {
  const projectConfig = config.get('project') || {}
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
 * Checks whether a local `.aio` file (as written by `aio app use`) defines the
 * project configuration, as opposed to it only being present in the global config.
 *
 * @returns {boolean} true if a local `.aio` file defines the project configuration
 */
function hasLocalConfiguration () {
  return !!config.get('project', 'local')
}

module.exports = {
  loadCurrentConfiguration,
  configString,
  isCompleteConfig,
  hasLocalConfiguration
}
