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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:owlocal', { provider: 'debug' })
const execa = require('execa')

const OW_LOCAL_DOCKER_PORT = 3233

function isWindowsOrMac () {
  return (
    process.platform === 'win32' ||
    process.platform === 'darwin'
  )
}

function getDockerNetworkAddress () {
  try {
    // Docker for Windows and macOS do not allow routing to the containers via
    // IP address, only port forwarding is allowed
    if (!isWindowsOrMac()) {
      const args = ['network', 'inspect', 'bridge']
      const result = execa.sync('docker', args)
      const json = JSON.parse(result.stdout)
      return `http://${json[0].IPAM.Config[0].Gateway}:${OW_LOCAL_DOCKER_PORT}`
    }
  } catch (error) {
    aioLogger.debug(`getDockerNetworkAddress ${error}`)
  }

  return `http://localhost:${OW_LOCAL_DOCKER_PORT}`
}

// gets these values if the keys are set in the environment, if not it will use the defaults set
const {
  OW_JAR_URL = 'https://dl.bintray.com/adobeio-firefly/aio/openwhisk-standalone.jar',
  // This path will be relative to this module, and not the cwd, so multiple projects can use it.
  OW_JAR_FILE = path.resolve(__dirname, '../../bin/openwhisk-standalone.jar'),
  OW_CONFIG_RUNTIMES_FILE = path.resolve(__dirname, '../../bin/openwhisk-standalone-config/runtimes.json'),
  OW_LOCAL_APIHOST = getDockerNetworkAddress(),
  OW_LOCAL_NAMESPACE = 'guest',
  OW_LOCAL_AUTH = '23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP'
} = process.env

module.exports = {
  getDockerNetworkAddress,
  OW_LOCAL_DOCKER_PORT,
  OW_JAR_URL,
  OW_JAR_FILE,
  OW_CONFIG_RUNTIMES_FILE,
  OW_LOCAL_APIHOST,
  OW_LOCAL_NAMESPACE,
  OW_LOCAL_AUTH
}
