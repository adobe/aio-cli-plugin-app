/**
 * main action
 * @param args
 * @returns {{body: string}}
 */

const {Core, State, Files, Analytics} = require('@adobe/aio-sdk')

function main (args) {

  // init when env vars __OW_API_KEY and __OW_NAMESPACE are set (e.g. when running in an OpenWhisk action)
  const state = await State.init()
  // get a value from the state store
  const { value, expiration } = await state.get('key')

  // Files example
  // init when env vars __OW_API_KEY and __OW_NAMESPACE are set (e.g. when running in an OpenWhisk action)
  const files = await Files.init()
  // write private file
  await files.write('mydir/myfile.txt', 'some private content')

  // Analytics example
  const analyticsClient = await Analytics.init('<companyID>', 'x-api-key', '<valid auth token>')
  const collections = await analyticsClient.getCollections({limit:5, page:0})

}

exports.main = main
