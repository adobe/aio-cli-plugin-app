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

const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:vscode', { provider: 'debug' })
const rtLibUtils = require('@adobe/aio-lib-runtime').utils
const fs = require('fs-extra')
const path = require('path')
const yeoman = require('yeoman-environment')
const generators = require('@adobe/generator-aio-app')

const LAUNCH_JSON_FILE = '.vscode/launch.json'
const LAUNCH_JSON_FILE_BACKUP = '.vscode/launch.json.save'

/** @private */
function files (config) {
  return {
    backupFile: rtLibUtils._absApp(config.root, LAUNCH_JSON_FILE_BACKUP),
    mainFile: rtLibUtils._absApp(config.root, LAUNCH_JSON_FILE)
  }
}

/** @private */
function update (config) {
  return async (props) => {
    const { backupFile, mainFile } = files(config)

    fs.ensureDirSync(path.dirname(mainFile))
    if (fs.existsSync(mainFile)) {
      if (!fs.existsSync(backupFile)) {
        fs.moveSync(mainFile, backupFile)
      }
    }

    const env = yeoman.createEnv()
    const gen = env.instantiate(generators['add-vscode-config'], {
      'app-config': config,
      'env-file': config.envFile,
      'frontend-url': props.frontEndUrl,
      'skip-prompt': true
    })
    await env.runGenerator(gen)
  }
}

/** @private */
function cleanup (config) {
  return () => {
    const { backupFile, mainFile } = files(config)

    if (fs.existsSync(mainFile) && !fs.existsSync(backupFile)) {
      aioLogger.debug(`removing ${mainFile}...`)
      const vscodeDir = path.dirname(mainFile)
      fs.unlinkSync(mainFile)
      if (fs.readdirSync(vscodeDir).length === 0) {
        fs.rmdirSync(vscodeDir)
      }
    }

    if (fs.existsSync(backupFile)) {
      aioLogger.debug(`restoring previous ${mainFile}`)
      fs.moveSync(backupFile, mainFile, { overwrite: true })
    }
  }
}

module.exports = (config) => ({
  update: update(config),
  cleanup: cleanup(config)
})
