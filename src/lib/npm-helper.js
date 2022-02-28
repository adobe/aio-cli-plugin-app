/*
 * Copyright 2022 Adobe Inc. All rights reserved.
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
const fs = require('fs-extra')
const path = require('path')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:lib-npm-helper', { provider: 'debug' })

const TEMPLATE_NPM_KEYWORD = 'ecosystem:aio-app-builder-template'
const TEMPLATE_PACKAGE_JSON_KEY = 'aio-app-builder-templates'

/**
 * Do an npm text search
 *
 * @param {string} text the text to search for (see https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md)
 * @returns {Promise} the json
 */
async function npmTextSearch (text) {
  const url = `https://registry.npmjs.org/-/v1/search?text=${text}`
  aioLogger.debug(`npmTextSearch url: ${url}`)

  const response = await fetch(url)
  return response.json()
}

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

/** @private */
async function readPackageJson (dir = process.cwd()) {
  const filePath = path.join(dir, 'package.json')
  return fs.readJson(filePath)
}

/** @private */
async function writeObjectToPackageJson (obj, dir = process.cwd()) {
  const filePath = path.join(dir, 'package.json')
  const pkgJson = await fs.readJson(filePath)

  return fs.writeJson(
    filePath,
    { ...pkgJson, ...obj },
    { spaces: 2 }
  )
}

/** @private */
async function getNpmDependency ({ packageName, urlSpec }, dir = process.cwd()) {
  // go through package.json and find the key for the urlSpec
  const packageJson = await readPackageJson(dir)
  aioLogger.debug(`getNpmPackageName package.json: ${JSON.stringify(packageJson, null, 2)}`)

  if (packageName) {
    return Object.entries(packageJson.dependencies || {})
      .find(([key, value]) => {
        aioLogger.debug(`k,v: ${key}, ${value}`)
        return key === packageName
      })
  } else if (urlSpec) {
    return Object.entries(packageJson.dependencies || {})
      .find(([key, value]) => {
        aioLogger.debug(`k,v: ${key}, ${value}`)
        return value === urlSpec
      })
  }

  throw new Error('Either packageName or urlSpec must be set')
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
 * @param {string} npmPackageName the npm package name
 * @param {string} dir the root path of where node_modules is
 * @returns {string} the version of the package from the cli node_modules
 */
async function getNpmLocalVersion (npmPackageName, dir = process.cwd()) {
  const pjsonPath = `${dir}/node_modules/${npmPackageName}/package.json`
  const pjson = JSON.parse(fs.readFileSync(pjsonPath))

  return pjson.version
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
  TEMPLATE_NPM_KEYWORD,
  TEMPLATE_PACKAGE_JSON_KEY,
  npmTextSearch,
  processNpmPackageSpec,
  readPackageJson,
  writeObjectToPackageJson,
  getNpmDependency,
  getNpmLatestVersion,
  getNpmLocalVersion,
  hideNPMWarnings
}
