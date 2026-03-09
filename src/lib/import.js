const { loadAndValidateConfigFile, importConfigJson, loadConfigFile, getServiceApiKey, getOAuthS2SCredential } = require('./import-helper')
const { SERVICE_API_KEY_ENV, IMS_OAUTH_S2S_ENV } = require('./defaults')

/**
 * Imports the project's console config to the local environment.
 *
 * @param {string | Buffer} consoleConfigFileOrBuffer Name of config file to import or a buffer to write into
 * @param {object} flags Flags for file writing
 * @returns {Promise} Console config
 */
async function importConsoleConfig (consoleConfigFileOrBuffer, flags) {
  const overwrite = flags.overwrite
  const merge = flags.merge
  const skipValidation = flags.skipValidation
  const useJwt = flags['use-jwt'] // for migration purposes
  let interactive = true

  if (overwrite || merge) {
    interactive = false
  }

  const loadFunc = skipValidation ? loadConfigFile : loadAndValidateConfigFile
  const config = loadFunc(consoleConfigFileOrBuffer).values

  const serviceClientId = getServiceApiKey(config, useJwt) // = client_id, legacy
  const oauthS2SCredential = getOAuthS2SCredential(config)

  let extraEnvVars
  if (typeof oauthS2SCredential === 'object') {
    // unpack oauthS2S json into IMS_OAUTH_S2S_* env vars
    const oauthS2SEnv = Object.entries(oauthS2SCredential).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        value = JSON.stringify(value) // stringify arrays e.g. scopes to be consistent with AIO_* vars behavior
      }
      acc[`${IMS_OAUTH_S2S_ENV}_${key.toUpperCase()}`] = value
      return acc
    }, {})

    extraEnvVars = { [SERVICE_API_KEY_ENV]: serviceClientId, ...oauthS2SEnv }
  } else {
    extraEnvVars = { [SERVICE_API_KEY_ENV]: serviceClientId }
  }

  await importConfigJson(consoleConfigFileOrBuffer, process.cwd(), { interactive, overwrite, merge, useJwt }, extraEnvVars)
  return config
}

/**
 * Downloads the project's console config, returns it in a buffer
 *
 * @param {object} consoleCLI Instance of the Console CLI sdk
 * @param {object} config Global config
 * @param {Array} supportedServices List of org supported services
 * @returns {Promise<Buffer>} Project console config
 */
async function downloadConsoleConfigToBuffer (consoleCLI, config, supportedServices) {
  const workspaceConfig = await consoleCLI.getWorkspaceConfig(
    config.org.id,
    config.project.id,
    config.workspace.id,
    supportedServices
  )
  return Buffer.from(JSON.stringify(workspaceConfig))
}

module.exports = {
  importConsoleConfig,
  downloadConsoleConfigToBuffer
}
