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

const fs = require('fs-extra')
const path = require('path')
const httpTerminator = require('http-terminator')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:serve', { provider: 'debug' })
const pureHTTP = require('pure-http')
const sirv = require('serve-static')
const https = require('https')
const { defaultHttpServerPort: SERVER_DEFAULT_PORT } = require('./defaults')

/**
 * @typedef {object} ServeWebObject
 * @property {string} url the front end url
 * @property {Function} cleanup callback function to cleanup available resources
 */

/**
 * Serves the web source via a http server.
 *
 * @param {string} webRoot the path to the web root
 * @param {number} uiPort the port number for the http server
 * @param {object} [options] the Parcel bundler options
 * @param {Function} [log] the app logger
 * @returns {ServeWebObject} the ServeWebObject
 */
module.exports = async (webRoot, uiPort = SERVER_DEFAULT_PORT, options = {}, log = () => {}) => {
  let actualPort = uiPort
  log('starting local frontend server ..')

  aioLogger.debug(`serve uiPort: ${uiPort}`)
  aioLogger.debug(`serve options: ${JSON.stringify(options, null, 2)}`)
  aioLogger.debug(`serve webRoot: ${JSON.stringify(webRoot, null, 2)}`)

  let httpsOptions = {}
  if (options.https) {
    httpsOptions = {
      cert: (await fs.readFile(options.https.cert)).toString(),
      key: (await fs.readFile(options.https.key)).toString()
    }
  }

  aioLogger.debug(`serve httpsOptions: ${JSON.stringify(httpsOptions, null, 2)}`)

  const server = https.createServer(httpsOptions)
  const app = pureHTTP({ server })

  app.use('/', sirv(path.resolve(webRoot)))
  app.listen(uiPort)

  const terminator = httpTerminator.createHttpTerminator({ server })
  actualPort = server.address().port
  if (actualPort !== uiPort) {
    log(`Could not use port:${uiPort}, using port:${actualPort} instead`)
  }

  const url = `${options.https ? 'https:' : 'http:'}//localhost:${actualPort}`
  log(`local frontend server running at ${url}`)

  const cleanup = async () => {
    aioLogger.debug('stopping ui server...')
    await terminator.terminate()
  }

  return {
    url,
    cleanup
  }
}
