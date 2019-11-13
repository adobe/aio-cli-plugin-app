/**
 * Main action
 *
 * You can invoke this function via:
 *     aio rt:action:invoke <action_path> -p tenant '<tenant_id>' -p apiKey '<api_key>' -p token '<access_token>'
 *
 * To find your <action_path>, run this command:
 *     aio rt:ls
 *
 * To show debug logging for this function, you can add the LOG_LEVEL parameter as well:
 *     aio rt:action:invoke <action_path> -p tenant '<tenant_id>' -p apiKey '<api_key>' -p token '<access_token>' -p LOG_LEVEL '<log_level>'
 * ... where LOG_LEVEL can be one of [ error, warn, info, verbose, debug, silly ]
 * 
 * Then, you can view your app logs:
 *     aio app:logs
 */

const { Core, CampaignStandard } = require('@adobe/aio-sdk')

async function main (params) {
  // create a Logger
  const myAppLogger = Core.Logger('MyApp', { level: params.LOG_LEVEL })
  // 'info' is the default level if not set
  myAppLogger.info('Calling the main action')

  // log levels are cumulative: 'debug' will include 'info' as well (levels are in order of verbosity: error, warn, info, verbose, debug, silly)
  myAppLogger.debug(`params: ${JSON.stringify(params, null, 2)}`)

  try {
    // initialize the sdk
    const campaignClient = await CampaignStandard.init(params.tenant, params.apiKey, params.token)

    // get profiles from Campaign Standard
    const profiles = await campaignClient.getAllProfiles()
    myAppLogger.debug(`profiles = ${JSON.stringify(profiles, null, 2)}`)

    return profiles
  } catch (error) {
    myAppLogger.error(error)
  }
}

exports.main = main
