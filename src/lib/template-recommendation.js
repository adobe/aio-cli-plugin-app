/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:template-recommendation', { provider: 'debug' })
const { TEMPLATE_RECOMMENDATION_API_ENDPOINTS } = require('./defaults')
const { getCliEnv } = require('@adobe/aio-lib-env')

/**
 * Calls the template recommendation API to get AI-based template suggestions
 * @param {string} prompt - User's natural language description of what they want to build
 * @param {string} [apiUrl] - Optional API URL (defaults to env var TEMPLATE_RECOMMENDATION_API or environment-based URL)
 * @returns {Promise<object>} Template recommendation from the API
 * @throws {Error} If API call fails
 */
async function getAIRecommendation (prompt, apiUrl) {
  // Select URL based on environment (same pattern as aio-lib-state)
  const env = getCliEnv()
  const url = apiUrl || process.env.TEMPLATE_RECOMMENDATION_API || TEMPLATE_RECOMMENDATION_API_ENDPOINTS[env]
  aioLogger.debug(`Calling template recommendation API: ${url} (env: ${env})`)
  aioLogger.debug(`Prompt: ${prompt}`)

  const payload = { prompt }
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    const errorText = await response.text()
    aioLogger.error(`API returned status ${response.status}: ${errorText}`)
    throw new Error(`API returned status ${response.status}`)
  }

  const data = await response.json()
  aioLogger.debug(`API response: ${JSON.stringify(data)}`)
  return data.body || data
}

module.exports = {
  getAIRecommendation
}
