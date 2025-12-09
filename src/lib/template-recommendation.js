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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:template-recommendation', { provider: 'debug' })

/**
 * Calls the template recommendation API to get AI-based template suggestions
 * 
 * @param {string} prompt - User's natural language description of what they want to build
 * @param {string} [apiUrl] - Optional API URL (defaults to env var or hardcoded URL)
 * @returns {Promise<object>} Template recommendation from the API
 * @throws {Error} If API call fails
 */
async function getAIRecommendation (prompt, apiUrl) {
  const url = apiUrl || process.env.TEMPLATE_RECOMMENDATION_API || 'https://268550-garageweektest.adobeio-static.net/api/v1/web/recommend-template'
  
  aioLogger.debug(`Calling template recommendation API: ${url}`)
  aioLogger.debug(`Prompt: ${prompt}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  })

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

