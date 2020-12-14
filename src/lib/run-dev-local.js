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

const path = require('path')
const fs = require('fs-extra')
const cloneDeep = require('lodash.clonedeep')
const utils = require('./app-helper')
const dedent = require('dedent-js')
const rtLib = require('@adobe/aio-lib-runtime')
const rtLibUtils = rtLib.utils
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:run-dev-local', { provider: 'debug' })

const {
  OW_CONFIG_RUNTIMES_FILE,
  OW_JAR_URL, OW_JAR_PATH,
  OW_LOCAL_APIHOST,
  OW_LOCAL_NAMESPACE,
  OW_LOCAL_AUTH,
  OW_LOCAL_LOG_FILE
} = require('../lib/owlocal')

const OW_WAIT_INIT_TIME = 2000
const OW_WAIT_PERIOD_TIME = 500
const OW_TIMEOUT = 60000

/**
 * @typedef {object} RunDevLocalObject
 * @property {string} config the modified dev config
 * @property {Function} cleanup callback function to cleanup available resources
 */

/**
 * Checks the system for pre-requisites to run local Openwhisk, then runs it.
 *
 * @param {object} config the app config
 * @param {Function} [log] function to log application logs
 * @param {boolean} [verbose=false] set to true to have verbose logging (openwhisk)
 * @returns {RunDevLocalObject} the RunDevLocalObject
 */
async function runDevLocal (config, log = () => undefined, verbose = false) {
  const devConfig = cloneDeep(config)
  devConfig.envFile = path.join(config.app.dist, '.env.local')
  const owJarFile = path.join(config.cli.dataDir, OW_JAR_PATH)

  // take following steps only when we have a backend
  log('checking if java is installed...')
  if (!await utils.hasJavaCLI()) {
    throw new Error('could not find java CLI, please make sure java is installed')
  }

  log('checking if docker is installed...')
  if (!await utils.hasDockerCLI()) {
    throw new Error('could not find docker CLI, please make sure docker is installed')
  }

  log('checking if docker is running...')
  if (!await utils.isDockerRunning()) {
    throw new Error('docker is not running, please make sure to start docker')
  }

  if (!fs.existsSync(owJarFile)) {
    log(`downloading OpenWhisk standalone jar from ${OW_JAR_URL} to ${owJarFile}, this might take a while... (to be done only once!)`)
    await utils.downloadOWJar(OW_JAR_URL, owJarFile)
  }

  log('starting local OpenWhisk stack...')
  const owLocalLogFile = OW_LOCAL_LOG_FILE || path.join(config.app.dist, 'openwhisk-local.log.txt')
  const owExecaOptions = {
    stdio: [
      null, // stdin
      verbose ? fs.openSync(owLocalLogFile, 'w') : null, // stdout
      'inherit' // stderr
    ]
  }
  const res = await utils.runOpenWhiskJar(owJarFile, OW_CONFIG_RUNTIMES_FILE, OW_LOCAL_APIHOST, OW_WAIT_INIT_TIME, OW_WAIT_PERIOD_TIME, OW_TIMEOUT, owExecaOptions)

  log('setting local openwhisk credentials...')
  const runtime = {
    namespace: OW_LOCAL_NAMESPACE,
    auth: OW_LOCAL_AUTH,
    apihost: OW_LOCAL_APIHOST
  }
  devConfig.ow = { ...devConfig.ow, ...runtime }

  // delete potentially conflicting env vars
  delete process.env.AIO_RUNTIME_APIHOST
  delete process.env.AIO_RUNTIME_NAMESPACE
  delete process.env.AIO_RUNTIME_AUTH

  log(`writing credentials to tmp wskdebug config '${devConfig.envFile}'`)
  // prepare wskprops for wskdebug
  fs.ensureDirSync(config.app.dist)
  const envFile = rtLibUtils._absApp(devConfig.root, devConfig.envFile)
  await fs.outputFile(envFile, dedent(`
  # This file is auto-generated, do not edit.
  # The items below are temporary credentials for local debugging
  OW_NAMESPACE=${devConfig.ow.namespace}
  OW_AUTH=${devConfig.ow.auth}
  OW_APIHOST=${devConfig.ow.apihost}
  `))

  const cleanup = () => {
    aioLogger.debug('stopping local OpenWhisk stack...')
    res.proc.kill()

    aioLogger.debug('removing wskdebug tmp .env file...')
    if (fs.existsSync(devConfig.envFile)) {
      fs.unlinkSync(devConfig.envFile)
    }
  }

  return {
    config: devConfig,
    cleanup
  }
}

module.exports = runDevLocal
