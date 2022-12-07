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
const { writeAio, writeEnv } = require('./import-helper')
const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')

const SECRET_FIELD_TYPE = 'password'
const CHECKSUM_DIR = 'dist'
const CHECKSUM_FILE = 'log-forwarding-config.sha256'
const IGNORED_REMOTE_SETTINGS = ['updated_at']

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
      return this.getConfigFromJson(config)
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
      return this.getConfigFromJson(await this.logForwarding.get())
    } catch (e) {
      throw new Error('Incorrect log forwarding configuration on server. ' + e.message)
    }
  }

  /**
   * Convert JSON config to Log Forwarding object
   *
   * @param {object} configJson Config in JSON format
   * @returns {LogForwardingConfig} Config
   */
  getConfigFromJson (configJson) {
    let destination
    let settings

    if (configJson !== undefined && configJson !== null && !Array.isArray(configJson) && typeof configJson === 'object') {
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
    Object.keys(settings)
      .filter(e => !IGNORED_REMOTE_SETTINGS.includes(e))
      .forEach(k => {
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
    await writeAio(projectConfig, '', { interactive, merge })
    await writeEnv({}, '', { interactive, merge }, secretSettings)
  }

  isLocalConfigChanged () {
    if (fs.pathExistsSync(path.join(CHECKSUM_DIR, CHECKSUM_FILE))) {
      const oldChecksum = fs.readFileSync(path.join(CHECKSUM_DIR, CHECKSUM_FILE)).toString()
      const config = this.getLocalConfigWithSecrets()
      const newChecksum = getChecksum(config)
      return oldChecksum !== newChecksum
    } else {
      return true
    }
  }

  async updateServerConfig (lfConfig) {
    const res = await this.logForwarding.setDestination(lfConfig.getDestination(), lfConfig.getSettings())
    const checksum = getChecksum(lfConfig)
    fs.ensureDirSync(CHECKSUM_DIR)
    fs.writeFile(path.join(CHECKSUM_DIR, CHECKSUM_FILE), checksum, { flags: 'w' })
    return res
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

  getMergedConfig (config) {
    const newSettings = {}
    Object.keys(this.settings).forEach(k => {
      newSettings[k] = config.settings[k] !== undefined ? config.settings[k] : this.settings[k]
    })
    return new LogForwardingConfig(this.destination, newSettings)
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
  const keys1 = Object.keys(config1).filter(e => !IGNORED_REMOTE_SETTINGS.includes(e))
  const keys2 = Object.keys(config2).filter(e => !IGNORED_REMOTE_SETTINGS.includes(e))
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
