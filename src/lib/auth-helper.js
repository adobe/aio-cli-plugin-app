/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { getToken, context, getTokenData: getImsTokenData } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { getCliEnv } = require('@adobe/aio-lib-env')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:auth-helper', { provider: 'debug' })

const DEPLOY_SERVICE_ENDPOINTS = {
  stage: 'https://deploy-service.stg.app-builder.adp.adobe.io',
  prod: 'https://deploy-service.app-builder.adp.adobe.io'
}

/**
 * Retrieves an access token for Adobe I/O CLI authentication.
 * This function handles both CLI and custom contexts, setting up the appropriate
 * authentication context and retrieving the corresponding access token.
 *
 * @async
 * @function getAccessToken
 * @param {object} [options] - Options for token retrieval
 * @param {boolean} [options.useCachedToken=false] - Whether to use a cached token instead of requesting a new one
 * @returns {Promise<{accessToken: string|null, env: string}>} An object containing:
 *   - accessToken: The retrieved access token for authentication, or null if token retrieval failed
 *   - env: The current CLI environment (e.g. 'prod', 'stage')
 * @throws {Error} If token retrieval fails or context setup fails
 */
async function getAccessToken ({ useCachedToken = false } = {}) {
  const env = getCliEnv()
  aioLogger.debug(`Retrieving CLI Token using env=${env}`)

  let contextName = CLI // default
  const currentContext = await context.getCurrent() // potential override
  if (currentContext && currentContext !== CLI) {
    contextName = currentContext
  } else {
    await context.setCli({ 'cli.bare-output': true }, false) // set this globally
  }

  let accessToken = null
  if (useCachedToken) {
    const { data } = await context.get(contextName)
    accessToken = data?.access_token?.token
  } else {
    accessToken = await getToken(contextName)
  }

  return { accessToken, env }
}

/**
 * For use with the openwhisk client js library to send a bearer token instead of basic
 * auth to the openwhisk service. Set this to the auth_handler option when initializing
 */
const bearerAuthHandler = {
  getAuthHeader: async () => {
    const { accessToken } = await getAccessToken()

    return `Bearer ${accessToken}`
  }
}

const setRuntimeApiHostAndAuthHandler = (_config) => {
  const env = getCliEnv()
  let apiEndpoint = DEPLOY_SERVICE_ENDPOINTS[env] ?? DEPLOY_SERVICE_ENDPOINTS.prod
  if (process.env.AIO_DEPLOY_SERVICE_URL) {
    apiEndpoint = process.env.AIO_DEPLOY_SERVICE_URL
  }

  const config = structuredClone(_config)
  const aioConfig = (config && 'runtime' in config) ? config : null
  if (aioConfig) {
    aioConfig.runtime.apihost = `${apiEndpoint}/runtime`
    aioConfig.runtime.auth_handler = bearerAuthHandler
    return aioConfig
  }
  const owConfig = (config && 'ow' in config) ? config : null
  if (owConfig) {
    owConfig.ow.apihost = `${apiEndpoint}/runtime`
    owConfig.ow.auth_handler = bearerAuthHandler
    return owConfig
  }
}

/**
 * Decodes a JWT token and returns its payload as a JavaScript object.
 *
 * @function getTokenData
 * @param {string} token - The JWT token to decode
 * @returns {object|null} The decoded payload of the JWT token or null if the token is invalid or cannot be decoded
 */
const getTokenData = (token) => {
  if (typeof token !== 'string') {
    aioLogger.error('Invalid token provided to getTokenData :: not a string')
    return null
  }
  try {
    return getImsTokenData(token)
  } catch (e) {
    aioLogger.error('Error decoding token payload in getTokenData ::', e)
    return null
  }
}

module.exports = {
  getAccessToken,
  getTokenData,
  bearerAuthHandler,
  setRuntimeApiHostAndAuthHandler
}
