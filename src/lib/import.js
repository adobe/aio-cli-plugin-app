const { loadAndValidateConfigFile, importConfigJson } = require('./import-helper')
const { SERVICE_API_KEY_ENV } = require('./defaults')

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
  let interactive = true

  if (overwrite || merge) {
    interactive = false
  }

  // before importing the config, first extract the service api key id
  const { values: config } = loadAndValidateConfigFile(consoleConfigFileOrBuffer)
  const project = config.project
  const jwtConfig = project.workspace.details.credentials && project.workspace.details.credentials.find(c => c.jwt)
  const serviceClientId = (jwtConfig && jwtConfig.jwt.client_id) || ''
  const extraEnvVars = { [SERVICE_API_KEY_ENV]: serviceClientId }

  await importConfigJson(consoleConfigFileOrBuffer, process.cwd(), { interactive, overwrite, merge }, extraEnvVars)
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
