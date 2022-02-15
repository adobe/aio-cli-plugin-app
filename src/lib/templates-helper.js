/*
 * Copyright 2020 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const fetch = require('node-fetch')
const fs = require('fs')
const inquirer = require('inquirer')
const path = require('path')

/**
 * Processes the npmPackageSpec, returns the value expected for the package name key in
 * the `dependencies` property of package.json
 *
 * The npmPackageSpec can be in the form:
 * - https://github.com/org/repo
 * - git+https://github.com/org/repo
 * - ssh://github.com/org/repo
 * - git+ssh://github.com/org/repo
 * - ../relative/path/to/template/folder
 * - /absolute/path/to/template/folder
 * - npm-package-name
 * - npm-package-name@tagOrVersion
 * - @scope/npm-package-name
 * - @scope/npm-package-name@tagOrVersion
 *
 * @param {string} npmPackageSpec the npm package spec. See above.
 * @param {string} dir the directory to calculate relative paths from
 * @returns {object} returns an object with properties url, name, tagOrVersion (if applicable)
 */
function processNpmPackageSpec (npmPackageSpec, dir = process.cwd()) {
  let url, name, tagOrVersion
  const spec = npmPackageSpec.trim()

  if (
    spec.startsWith('https://') ||
    spec.startsWith('http://') ||
    spec.startsWith('ssh://')) {
    url = `git+${spec}`
    if (!url.endsWith('.git')) {
      url = `${url}.git`
    }
  } else if (
    spec.startsWith('git+https://') ||
    spec.startsWith('git+http://') ||
    spec.startsWith('git+ssh://')) {
    url = spec
  } else if (spec.includes('@')) {
    // separate tag/version, if any. also, it could be a scope
    if (spec.startsWith('@')) {
      [, name, tagOrVersion] = spec.split('@')
      name = `@${name}`
    } else {
      [name, tagOrVersion] = spec.split('@')
    }

    if (!tagOrVersion) {
      tagOrVersion = 'latest'
    }
  } else if (spec.startsWith('file:') || spec.includes('/')) { // process file paths
    const fileProtocol = 'file:'
    let filePath = spec.startsWith(fileProtocol) ? spec.substring(fileProtocol.length) : spec

    // all absolute paths need to be converted to relative paths
    if (path.isAbsolute(filePath)) {
      filePath = path.relative(dir, filePath)
    }

    url = `file:${filePath}`
  } else { // it's a plain package name
    name = spec
    tagOrVersion = 'latest'
  }

  return { url, name, tagOrVersion }
}

/**
 * Sort array values according to the sort order and/or sort-field.
 *
 * Note that this will use the Javascript sort() function, thus the values will
 * be sorted in-place.
 *
 * @param {Array<object>} values array of objects (with fields to sort by)
 * @param {object} [options] sort options to pass
 * @param {boolean} [options.descending] true by default, sort order
 * @param {string} [options.field] 'date' by default, sort field ('name', 'date' options)
 * @returns {Array<object>} the sorted values array (input values array sorted in place)
 */
function sortValues (values, { descending = true, field = 'date' } = {}) {
  const supportedFields = ['name', 'date']
  if (!supportedFields.includes(field)) { // unknown field, we just return the array
    return values
  }

  values.sort((left, right) => {
    const d1 = left[field]
    const d2 = right[field]

    if (descending) {
      return (d1 > d2) ? -1 : (d1 < d2) ? 1 : 0
    } else {
      return (d1 > d2) ? 1 : (d1 < d2) ? -1 : 0
    }
  })
  return values
}

/**
 * Gets the latest version of a plugin from npm.
 *
 * @param {string} npmPackageName the npm package name of the plugin
 * @returns {string} the latest version of the plugin from the npm registry
 */
async function getNpmLatestVersion (npmPackageName) {
  const res = await fetch(`https://registry.npmjs.com/${npmPackageName}`)
  const { 'dist-tags': distTags } = await res.json()
  return distTags && distTags.latest
}

/**
 * Gets the npm package version of an npm package installed in the cli.
 *
 * @param {string} cliRoot the root path of the cli
 * @param {string} npmPackageName the npm package name
 * @returns {string} the version of the package from the cli node_modules
 */
async function getNpmLocalVersion (cliRoot, npmPackageName) {
  const pjsonPath = `${cliRoot}/node_modules/${npmPackageName}/package.json`
  const pjson = JSON.parse(fs.readFileSync(pjsonPath))

  return pjson.version
}

/**
 * Prompt for confirmation.
 *
 * @param {string} [message=Confirm?] the message to show
 * @param {boolean} [defaultValue=false] the default value if the user presses 'Enter'
 * @returns {boolean} true or false chosen for the confirmation
 */
async function prompt (message = 'Confirm?', defaultValue = false) {
  return inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message,
    default: defaultValue
  }).then(function (answers) {
    return answers.confirm
  })
}

/**
 * Hide NPM Warnings by intercepting process.stderr.write stream
 *
 */
function hideNPMWarnings () {
  const fn = process.stderr.write

  /**
   * Function to override the process.stderr.write and hide npm warnings
   *
   * @private
   */
  function write () {
    const msg = Buffer.isBuffer(arguments[0]) ? arguments[0].toString() : arguments[0]
    if (!msg.startsWith('warning')) {
      fn.apply(process.stderr, arguments)
    }
    return true
  }
  process.stderr.write = write
}

module.exports = {
  processNpmPackageSpec,
  prompt,
  sortValues,
  getNpmLatestVersion,
  getNpmLocalVersion,
  hideNPMWarnings
}
