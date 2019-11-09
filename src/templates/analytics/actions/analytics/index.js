/**
 * main action
 * @param args
 * @returns {{body: string}}
 */

const { Analytics } = require('@adobe/aio-sdk')

async function main (args) {
  // Analytics example
  const analyticsClient = await Analytics.init('<companyID>', 'x-api-key', '<valid auth token>')
  const collections = await analyticsClient.getCollections({ limit: 5, page: 0 })
  console.log('collections=', collections)
}

exports.main = main
