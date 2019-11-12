/**
 * main action
 */

const CampaignStandard = require('@adobe/aio-lib-campaign-standard')

async function main (params) {
  // initialize sdk
  const campaignClient = await CampaignStandard.init(params.tenant, params.apiKey, params.token)
  // get profiles
  const profiles = await campaignClient.getAllProfiles()
  console.log('profiles = ', profiles)
  return profiles
}

exports.main = main
