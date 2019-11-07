/**
 * main action
 */

const sdk = require('@adobe/aio-lib-campaign-standard')
const util = require('util')
require('dotenv').config()

async function sdkTest () {
  // initialize sdk
  const tenant = process.env['CAMPAIGN_STANDARD_TENANT']
  const apiKey = process.env['CAMPAIGN_STANDARD_APIKEY']
  const token = process.env['CAMPAIGN_STANDARD_TOKEN']
  const targetClient = await sdk.init(tenant, apiKey, token)

  // get profiles
  const profiles = await targetClient.getAllProfiles()
  console.log(util.inspect(profiles))
}
sdkTest()
