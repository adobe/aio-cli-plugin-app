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
  const url = apiUrl || process.env.TEMPLATE_RECOMMENDATION_API || 'https://development-918-aiappinit-stage.adobeioruntime.net/api/v1/web/recommend-api/recommend-template'
  
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

