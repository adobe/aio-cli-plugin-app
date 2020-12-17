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

const path = require('path')
const Bundler = require('parcel-bundler')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:bundle', { provider: 'debug' })

/**
 * @typedef {object} BundleWebObject
 * @property {object} the Parcel bundler object
 * @property {Function} cleanup callback function to cleanup available resources
 */

/**
 * Bundles the web source via Parcel.
 *
 * @param {object} config the app config (see src/lib/config-loader.js)
 * @param {Function} [log] the app logger
 * @param {object} [options] the Parcel bundler options
 * @returns {BundleWebObject} the BundleWebObject
 */
module.exports = async (config, log = () => {}, options = {}) => {
  log('starting local frontend server ..')
  const entryFile = path.join(config.web.src, 'index.html')

  const parcelBundleOptions = {
    cache: false,
    outDir: config.web.distDev,
    contentHash: false,
    watch: true,
    minify: false,
    logLevel: 1,
    ...options
  }

  const bundler = new Bundler(entryFile, parcelBundleOptions)

  await bundler.bundle()
  const cleanup = () => {
    aioLogger.debug('stopping parcel watcher...')
    bundler.stop()
  }

  return {
    bundler,
    cleanup
  }
}
