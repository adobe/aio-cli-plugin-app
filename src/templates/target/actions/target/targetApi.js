/**
 * main action
 */

const sdk = require('@adobe/aio-lib-target')
const util = require('util')
require('dotenv').config()

async function sdkTest () {
  // initialize sdk
  const tenant = process.env['TARGET_TENANT']
  const apiKey = process.env['TARGET_APIKEY']
  const token = process.env['TARGET_TOKEN']
  const targetClient = await sdk.init(tenant, apiKey, token)

  // get activities
  const activities = await targetClient.getActivities({ limit: 5, offset: 0 })
  console.log(util.inspect(activities))
}
sdkTest()
