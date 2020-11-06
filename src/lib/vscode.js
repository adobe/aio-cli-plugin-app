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
    fs.writeJSONSync(mainFile, await generateConfig(config, props), { spaces: 2 })
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

/** @private */
async function generateConfig (appConfig, props) {
  const { hasFrontend, withBackend, frontEndUrl } = props
  const actionConfigNames = []
  let actionConfigs = []

  if (withBackend) {
    const packageName = appConfig.ow.package
    const manifestActions = appConfig.manifest.package.actions

    actionConfigs = Object.keys(manifestActions).map(an => {
      const name = `Action:${packageName}/${an}`
      actionConfigNames.push(name)
      const action = manifestActions[an]
      const actionPath = rtLibUtils._absApp(appConfig.root, action.function)

      const config = {
        type: 'pwa-node',
        request: 'launch',
        name: name,
        runtimeExecutable: rtLibUtils._absApp(appConfig.root, './node_modules/.bin/wskdebug'),
        envFile: path.join('${workspaceFolder}', appConfig.envFile), // eslint-disable-line no-template-curly-in-string
        timeout: 30000,
        // replaces remoteRoot with localRoot to get src files
        localRoot: rtLibUtils._absApp(appConfig.root, '.'),
        remoteRoot: '/code',
        outputCapture: 'std',
        attachSimplePort: 0
      }

      const actionFileStats = fs.lstatSync(actionPath)
      if (actionFileStats.isFile()) {
        // why is this condition here?
      }
      config.runtimeArgs = [
          `${packageName}/${an}`,
          actionPath,
          '-v'
      ]
      if (actionFileStats.isDirectory()) {
        // take package.json.main or 'index.js'
        const zipMain = rtLibUtils.getActionEntryFile(path.join(actionPath, 'package.json'))
        config.runtimeArgs[1] = path.join(actionPath, zipMain)
      }
      if (action.annotations && action.annotations['require-adobe-auth'] && appConfig.ow.apihost === 'https://adobeioruntime.net') {
        // NOTE: The require-adobe-auth annotation is a feature implemented in the
        // runtime plugin. The current implementation replaces the action by a sequence
        // and renames the action to __secured_<action>. The annotation will soon be
        // natively supported in Adobe I/O Runtime, at which point this condition won't
        // be needed anymore.
        /* instanbul ignore next */
        config.runtimeArgs[0] = `${packageName}/__secured_${an}`
      }
      if (action.runtime) {
        config.runtimeArgs.push('--kind')
        config.runtimeArgs.push(action.runtime)
      }
      return config
    })
  }

  const debugConfig = {
    configurations: actionConfigs,
    compounds: [{
      name: 'Actions',
      configurations: actionConfigNames
    }]
  }

  if (hasFrontend) {
    debugConfig.configurations.push({
      type: 'chrome',
      request: 'launch',
      name: 'Web',
      url: frontEndUrl,
      webRoot: appConfig.web.src,
      breakOnLoad: true,
      sourceMapPathOverrides: {
        '*': path.join(appConfig.web.distDev, '*')
      }
    })
    debugConfig.compounds.push({
      name: 'WebAndActions',
      configurations: ['Web'].concat(actionConfigNames)
    })
  }

  return debugConfig
}

module.exports = (config) => ({
  update: update(config),
  cleanup: cleanup(config)
})
