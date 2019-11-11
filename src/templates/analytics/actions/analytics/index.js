/**
 * main action
 */

const Analytics = require('@adobe/aio-lib-analytics')

async function main (params) {
  // Analytics example
  const analyticsClient = await Analytics.init(params.companyId, params.apiKey, params.token)
  const collections = await analyticsClient.getCollections({ limit: 5, page: 0 })
  console.log('collections=', collections)
  return collections
}

exports.main = main
