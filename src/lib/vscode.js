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
const cloneDeep = require('lodash.clonedeep')

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
function processPackageActionConfigs (appConfig, packageName, pkg) {
  const { ow, root, envFile } = appConfig

  const actionConfigNames = []
  const actionConfigs = Object.keys(pkg.actions).map(an => {
    const name = `Action:${packageName}/${an}`
    actionConfigNames.push(name)
    const action = pkg.actions[an]
    const actionPath = rtLibUtils._absApp(root, action.function)

    const config = {
      type: 'pwa-node',
      request: 'launch',
      name: name,
      runtimeExecutable: rtLibUtils._absApp(root, './node_modules/.bin/wskdebug'),
      envFile: path.join('${workspaceFolder}', envFile), // eslint-disable-line no-template-curly-in-string
      timeout: 30000,
      // replaces remoteRoot with localRoot to get src files
      localRoot: rtLibUtils._absApp(root, '.'),
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
    if (action.annotations && action.annotations['require-adobe-auth'] && ow.apihost === 'https://adobeioruntime.net') {
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

  return [actionConfigNames, actionConfigs]
}

/** @private */
async function generateConfig (appConfig, props) {
  const { web } = appConfig
  const { hasFrontend, withBackend, frontEndUrl } = props

  let actionConfigNames = []
  let actionConfigs = []

  if (withBackend) {
    const modifiedConfig = cloneDeep(appConfig)
    const packages = modifiedConfig.manifest.full.packages
    const packagePlaceholder = modifiedConfig.manifest.packagePlaceholder
    if (packages[packagePlaceholder]) {
      packages[modifiedConfig.ow.package] = packages[packagePlaceholder]
      delete packages[packagePlaceholder]
    }

    Object.keys(packages).forEach(pkg => {
      const packageConfigs = processPackageActionConfigs(modifiedConfig, pkg, packages[pkg])
      // merge the arrays
      actionConfigNames = [...actionConfigNames, ...packageConfigs[0]]
      actionConfigs = [...actionConfigs, ...packageConfigs[1]]
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
      webRoot: web.src,
      breakOnLoad: true,
      sourceMapPathOverrides: {
        '*': path.join(web.distDev, '*')
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
