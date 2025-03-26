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

const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { getCliEnv } = require('@adobe/aio-lib-env')
const defaultRuntimeUrl = 'https://adobeioruntime.net'

/**
 * For use with the openwhisk client js library to send a bearer token instead of basic
 * auth to the openwhisk service. Set this to the auth_handler option when initializing
 */
const bearerAuthHandler = {
  getAuthHeader: async () => {
    await context.setCli({ 'cli.bare-output': true }, false) // set this globally

    const env = getCliEnv()

    console.debug(`Retrieving CLI Token using env=${env}`)
    const accessToken = await getToken(CLI)

    return `Bearer ${accessToken}`
  }
}

const setRuntimeApiHostAndAuthHandler = (config) => {
  // TODO: remove this check once the deploy service is enabled by default
  if (process.env.IS_DEPLOY_SERVICE_ENABLED === 'true') {
    const aioConfig = (config && 'runtime' in config) ? config : null
    if (aioConfig) {
      aioConfig.runtime.apihost = process.env.AIO_RUNTIME_APIHOST ?? defaultRuntimeUrl
      aioConfig.runtime.auth_handler = bearerAuthHandler
      return aioConfig
    }
    const owConfig = (config && 'ow' in config) ? config : null
    if (owConfig) {
      owConfig.ow.apihost = process.env.AIO_RUNTIME_APIHOST ?? defaultRuntimeUrl
      owConfig.ow.auth_handler = bearerAuthHandler
      return owConfig
    }
  } else {
    if (config && config.runtime) {
      config.runtime.apihost = process.env.AIO_RUNTIME_APIHOST ?? defaultRuntimeUrl
    }
    if (config && config.ow) {
      config.ow.apihost = process.env.AIO_RUNTIME_APIHOST ?? defaultRuntimeUrl
    }
  }
  return config
}

module.exports = {
  bearerAuthHandler,
  setRuntimeApiHostAndAuthHandler
}
