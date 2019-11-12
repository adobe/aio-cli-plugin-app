/**
 * main action
 */

const Target = require('@adobe/aio-lib-target')

async function main (params) {
  // initialize sdk
  const targetClient = await Target.init(params.tenant, params.apiKey, params.token)

  // get activities
  const activities = await targetClient.getActivities({ limit: 5, offset: 0 })
  console.log('activities = ', activities)
  return activities
}

exports.main = main
