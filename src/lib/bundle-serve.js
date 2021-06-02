/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:bundle-serve', { provider: 'debug' })

/**
 * @typedef {object} BundleWebObject
 * @property {object} the Parcel bundler object
 * @property {Function} cleanup callback function to cleanup available resources
 */

/**
 * Serves the bundled web source via Parcel.
 *
 * @param {object} bundler the Parcel bundler object
 * @param {object} [options] the Parcel bundler options
 * @param {Function} [log] the app logger
 * @returns {BundleWebObject} the BundleWebObject
 */
module.exports = async (bundler, options, log = () => {}) => {
  log('serving front-end using bundler serve...')

  const { unsubscribe } = await bundler.watch((err) => {
    if (err) {
      log(err)
    }
  })
  const url = `${options.serveOptions.https ? 'https:' : 'http:'}//localhost:${options.serveOptions.port}`
  log(`local frontend server running at ${url}`)

  const cleanup = async () => {
    aioLogger.debug('cleanup bundle-serve...')
    await unsubscribe()
  }

  return {
    url,
    cleanup
  }
}
