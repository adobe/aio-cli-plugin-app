/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const rtLib = require('@adobe/aio-lib-runtime')
const { writeAio, writeEnv } = require('./import')
const crypto = require('crypto')
const fs = require('fs-extra')

const SECRET_FIELD_TYPE = 'password'
const CHECKSUM_FILE = 'log-forwarding-config.sha256'

class LogForwarding {
  constructor (aioConfig) {
    this.aioConfig = aioConfig
  }

  async init () {
    rtLib.utils.checkOpenWhiskCredentials({ ow: this.aioConfig.runtime })
    this.logForwarding = await getRTLogForwarding(this.aioConfig.runtime)
    return this
  }

  getLocalConfig () {
    const config = this.aioConfig.project.workspace.log_forwarding
    try {
      return convertToConfigObject(config)
    } catch (e) {
      throw new Error('Incorrect local log forwarding configuration. ' + e.message)
    }
  }

  getLocalConfigWithSecrets () {
    const config = this.getLocalConfig()
    const destination = config.getDestination()
    const settings = config.getSettings()
    if (config.isDefined()) {
      const destinationSettings = this.logForwarding.getDestinationSettings(destination)
      const missingSecrets = []
      destinationSettings.forEach(e => {
        if (e.type === SECRET_FIELD_TYPE) {
          const secretVarName = getSecretVarName(destination, e.name)
          if (process.env[secretVarName] !== undefined) {
            settings[e.name] = process.env[secretVarName]
          } else {
            missingSecrets.push(secretVarName)
          }
        }
      })
      if (missingSecrets.length > 0) {
        throw new Error('Required secrets are missing in environment variables: ' + missingSecrets.join(', ') + '. ' +
          'Make sure these variables are set in .env file')
      }
    }
    return new LogForwardingConfig(destination, settings)
  }

  async getServerConfig () {
    try {
      return convertToConfigObject(await this.logForwarding.get())
    } catch (e) {
      throw new Error('Incorrect log forwarding configuration on server. ' + e.message)
    }
  }

  getSupportedDestinations () {
    return this.logForwarding.getSupportedDestinations()
  }

  getSettingsConfig (destination) {
    return this.logForwarding.getDestinationSettings(destination)
  }

  async updateLocalConfig (lfConfig) {
    const destination = lfConfig.getDestination()
    const destinationSettings = this.logForwarding.getDestinationSettings(destination)
    const projectConfig = {
      project: this.aioConfig.project
    }

    const nonSecretSettings = {}
    const secretSettings = {}

    const settings = lfConfig.getSettings()
    Object.keys(settings).forEach(k => {
      const destFieldSettings = destinationSettings.find(i => i.name === k)
      if (destFieldSettings.type === SECRET_FIELD_TYPE) {
        secretSettings[getSecretVarName(destination, k)] = settings[k]
      } else {
        nonSecretSettings[k] = settings[k]
      }
    })

    projectConfig.project.workspace.log_forwarding = {
      [destination]: nonSecretSettings
    }
    const interactive = false
    const merge = true
    await writeAio(projectConfig, process.cwd(), { interactive, merge })
    await writeEnv({}, process.cwd(), { interactive, merge }, secretSettings)
  }

  isLocalConfigChanged () {
    if (fs.pathExistsSync(process.cwd() + '/tmp/' + CHECKSUM_FILE)) {
      const oldChecksum = fs.readFileSync(process.cwd() + '/tmp/' + CHECKSUM_FILE).toString()
      const config = this.getLocalConfigWithSecrets()
      const newChecksum = getChecksum(config)
      return oldChecksum !== newChecksum
    } else {
      return true
    }
  }

  async updateServerConfig (lfConfig) {
    await this.logForwarding.setDestination(lfConfig.getDestination(), lfConfig.getSettings())
    const checksum = getChecksum(lfConfig)
    fs.ensureDirSync(process.cwd() + '/tmp')
    fs.writeFile(process.cwd() + '/tmp/' + CHECKSUM_FILE, checksum, { flags: 'w' })
  }
}

class LogForwardingConfig {
  constructor (destination, settings) {
    this.destination = destination
    this.settings = settings
  }

  getDestination () {
    return this.destination
  }

  getSettings () {
    return this.settings
  }

  isDefined () {
    return this.destination !== undefined
  }

  isDefault () {
    return !this.isDefined() || this.getDestination() === 'adobe_io_runtime'
  }

  isEqual (config) {
    return (this.isDefault() && config.isDefault()) ||
      (this.destination === config.getDestination() && shallowEqual(this.settings, config.settings))
  }
}

/**
 * Init Log Forwarding
 *
 * @param {object} aioConfig aio Config
 * @returns {Promise<LogForwarding>} Log Forwarding
 */
async function init (aioConfig) {
  const lf = new LogForwarding(aioConfig)
  return await lf.init()
}

/**
 * Get Runtime Log Forwarding
 *
 * @param {object} rtConfig Runtime config
 * @returns {Promise<LogForwarding>} Log Forwarding
 */
async function getRTLogForwarding (rtConfig) {
  const rt = await rtLib.init({
    ...rtConfig,
    api_key: rtConfig.auth
  })
  return rt.logForwarding
}

/**
 * Compare to log forwarding configs
 *
 * @param {LogForwardingConfig} config1 Config
 * @param {LogForwardingConfig} config2 Config
 * @returns {boolean} Are configs equal
 */
function shallowEqual (config1, config2) {
  // updated_at exists on server only and does not impact actual configuration
  const keys1 = Object.keys(config1).filter(e => e !== 'updated_at')
  const keys2 = Object.keys(config2).filter(e => e !== 'updated_at')
  if (keys1.length !== keys2.length) {
    return false
  }
  for (const key of keys1) {
    if (config1[key] !== config2[key]) {
      return false
    }
  }
  return true
}

/**
 * Convert JSON config to Log Forwarding object
 *
 * @param {string} configJson Config in JSON format
 * @returns {LogForwardingConfig} Config
 */
function convertToConfigObject (configJson) {
  let destination
  let settings

  if (configJson !== undefined) {
    const destinations = Object.keys(configJson)
    if (destinations.length === 1) {
      destination = destinations[0]
      settings = configJson[destination]
    } else {
      throw new Error(`Configuration has ${destinations.length} destinations. Exactly one must be defined.`)
    }
  }
  return new LogForwardingConfig(destination, settings)
}

/**
 * Get secret variable name for the given destination and settings field
 *
 * @param {string} destination Destination
 * @param {string} fieldName Field name
 * @returns {string} Variable name
 */
function getSecretVarName (destination, fieldName) {
  return destination.toUpperCase() + '__' + fieldName.toUpperCase()
}

/**
 * Generate checksum for the config
 *
 * @param {LogForwardingConfig} config Config
 * @returns {string} Checksum
 */
function getChecksum (config) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(config))
    .digest('hex')
}

module.exports = {
  init,
  LogForwardingConfig
}
