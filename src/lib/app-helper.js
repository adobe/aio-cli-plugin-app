/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const execa = require('execa')
const fs = require('fs-extra')
const path = require('node:path')
const which = require('which')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:lib-app-helper', { provider: 'debug' })
const chalk = require('chalk')
const aioConfig = require('@adobe/aio-lib-core-config')
const { AIO_CONFIG_WORKSPACE_SERVICES, AIO_CONFIG_ORG_SERVICES } = require('./defaults')
const { EOL } = require('os')
const yaml = require('js-yaml')
const RuntimeLib = require('@adobe/aio-lib-runtime')

/** @private */
function isNpmInstalled () {
  const result = which.sync('npm', { nothrow: true })
  return result !== null
}

/** @private */
function isGitInstalled () {
  return which.sync('git', { nothrow: true }) !== null
}

/** @private */
async function installPackages (dir, options = { spinner: null, verbose: false }) {
  // todo support for ctrl + c handler to "install later"

  if (options.spinner && !options.verbose) {
    options.spinner.start('Installing packages...')
  }
  aioLogger.debug(`running npm install : ${dir}`)

  if (!(fs.statSync(dir).isDirectory())) {
    aioLogger.debug(`${dir} is not a directory`)
    throw new Error(`${dir} is not a directory`)
  }
  if (!fs.readdirSync(dir).includes('package.json')) {
    aioLogger.debug(`${dir} does not contain a package.json file.`)
    throw new Error(`${dir} does not contain a package.json file.`)
  }
  const execaOptions = { cwd: dir }
  if (options.verbose) {
    execaOptions.stderr = 'inherit'
    execaOptions.stdout = 'inherit'
  }
  // npm install
  const ret = await execa('npm', ['install'], execaOptions)
  if (options.spinner && !options.verbose) {
    options.spinner.stop(chalk.green('Packages installed!'))
  }
  return ret
}

// Is this still used? it is exported, but there are no references to it -jm
/**
 * @param {string} scriptName  npm script name
 * @param {string} dir directory to run npm script in
 * @param {string[]} cmdArgs args to pass to npm script
 * @returns {object} the child process
 */
async function runPackageScript (scriptName, dir, cmdArgs = []) {
  aioLogger.debug(`running npm run-script ${scriptName} in dir: ${dir}`)
  const pkg = await fs.readJSON(path.join(dir, 'package.json'))
  if (pkg && pkg.scripts && pkg.scripts[scriptName]) {
    const command = pkg.scripts[scriptName]
    const child = runScript(command, dir, cmdArgs)
    return child
  } else {
    aioLogger.debug(`${dir} does not contain a package.json or it does not contain a script named ${scriptName}`)
  }
}

/**
 * @param {string} hookPath to be require()'d and run. Should export an async function that takes a config object as its only argument
 * @param {object} config which will be passed to the hook
 * @returns {Promise<*>} whatever the hook returns
 */
async function runInProcess (hookPath, config) {
  if (hookPath) {
    try {
      const hook = require(path.resolve(hookPath))
      aioLogger.debug('runInProcess: running project hook in process')
      return hook(config)
    } catch (e) {
      aioLogger.debug('runInProcess: error running project hook in process, running as package script instead')
      return runScript(hookPath)
    }
  } else {
    aioLogger.debug('runInProcess: undefined hookPath')
  }
}

/**
 * @typedef ChildProcess
 */

/**
 * Runs a package script in a child process
 *
 * @param {string} command to run
 * @param {string} dir to run command in
 * @param {string[]} cmdArgs args to pass to command
 * @returns {Promise<ChildProcess>} child process
 */
async function runScript (command, dir, cmdArgs = []) {
  if (!command) {
    return null
  }
  if (!dir) {
    dir = process.cwd()
  }

  if (cmdArgs.length) {
    command = `${command} ${cmdArgs.join(' ')}`
  }

  // we have to disable IPC for Windows (see link in debug line below)
  const isWindows = process.platform === 'win32'
  const ipc = isWindows ? null : 'ipc'

  const child = execa.command(command, {
    stdio: ['inherit', 'inherit', 'inherit', ipc],
    shell: true,
    cwd: dir,
    preferLocal: true
  })

  if (isWindows) {
    aioLogger.debug(`os is Windows, so we can't use ipc when running ${command}`)
    aioLogger.debug('see: https://github.com/adobe/aio-cli-plugin-app/issues/372')
  } else {
    // handle IPC from possible aio-run-detached script
    child.on('message', message => {
      if (message.type === 'long-running-process') {
        const { pid, logs } = message.data
        aioLogger.debug(`Found ${command} event hook long running process (pid: ${pid}). Registering for SIGTERM`)
        aioLogger.debug(`Log locations for ${command} event hook long-running process (stdout: ${logs.stdout} stderr: ${logs.stderr})`)
        process.on('exit', () => {
          try {
            aioLogger.debug(`Killing ${command} event hook long-running process (pid: ${pid})`)
            process.kill(pid, 'SIGTERM')
          } catch (_) {
            // do nothing if pid not found
          }
        })
      }
    })
  }

  return child
}

/** @private */
function wrapError (err) {
  let message = 'Unknown error'

  if (err) {
    if (err instanceof Error) {
      return err
    }

    message = err.stack || err.message || err
  }

  return new Error(message)
}

/**
 * Joins url path parts
 *
 * @param {...string} args url parts
 * @returns {string} joined url
 */
function urlJoin (...args) {
  let start = ''
  if (args[0] && args[0].startsWith('/')) {
    start = '/'
  }
  return start + args.map(a => a && a.replace(/(^\/|\/$)/g, ''))
    .filter(a => a) // remove empty strings / nulls
    .join('/')
}

/**
 * Removes the protocol prefix from a URL string
 *
 * @param {string} url the input url string
 * @returns {string} the url without the protocol prefix
 */
function removeProtocolFromURL (url) {
  // will replace strings like '<protocol>://hello.com' and  '//hello.com' with
  // 'hello.com'
  return url.replace(/(^\w+:|^)\/\//, '')
}

/**
 * Tests that a file exists, if not throws an error
 *
 * @param {string} filePath path to a file
 */
function checkFile (filePath) {
  // note lstatSync will throw if file doesn't exist
  if (!fs.lstatSync(filePath).isFile()) {
    throw Error(`${filePath} is not a valid file`)
  }
}

/**
 * Writes an object to a file
 *
 * @param {string} file path
 * @param {object} config object to write
 */
function writeConfig (file, config) {
  fs.ensureDirSync(path.dirname(file))
  // for now only action URLs
  fs.writeFileSync(
    file,
    JSON.stringify(config), { encoding: 'utf-8' }
  )
}

/**
 *
 *Converts a service array to an input string that can be consumed by generator-aio-app
 *
 * @param {Array} services array of services [{ code: 'xxx', name: 'xxx' }, ...]
 * @returns {string} 'code1,code2,code3'
 */
function servicesToGeneratorInput (services) {
  return services.map(s => s.code).filter(s => s).join(',')
}

/**
 * Log a warning when overwriting services in the Production Workspace
 *
 * @param {string} projectName project name, needed for warning message
 * @param {string} workspaceName workspace name
 */
function warnIfOverwriteServicesInProductionWorkspace (projectName, workspaceName) {
  if (workspaceName === 'Production') {
    console.error(chalk.bold(chalk.yellow(
      `⚠ Warning: you are authorizing to overwrite Services in your *Production* Workspace in Project '${projectName}'.` +
      `${EOL}This may break any Applications that currently use existing Service subscriptions in this Production Workspace.`
    )))
  }
}

/**
 * Set the services attached to the current workspace in the .aio config
 *
 * @param {Array} serviceProperties service properties obtained via LibConsoleCLI.prototype.getServicePropertiesFromWorkspace
 */
function setWorkspaceServicesConfig (serviceProperties) {
  const serviceConfig = serviceProperties.map(s => ({
    name: s.name,
    code: s.sdkCode
  }))
  aioConfig.set(AIO_CONFIG_WORKSPACE_SERVICES, serviceConfig, true)
  aioLogger.debug(`set aio config ${AIO_CONFIG_WORKSPACE_SERVICES}: ${JSON.stringify(serviceConfig, null, 2)}`)
}

/**
 * Set the services supported by the organization in the .aio config
 *
 * @param {Array} supportedServices org services obtained via LibConsoleCLI.prototype.getEnabledServicesForOrg
 */
function setOrgServicesConfig (supportedServices) {
  const orgServiceConfig = supportedServices.map(s => ({
    name: s.name,
    code: s.code,
    type: s.type
  }))
  aioConfig.set(AIO_CONFIG_ORG_SERVICES, orgServiceConfig, true)
  aioLogger.debug(`set aio config ${AIO_CONFIG_ORG_SERVICES}: ${JSON.stringify(orgServiceConfig, null, 2)}`)
}

/**
 * Gets fresh service list from Console Workspace and builds metadata to be associated with the view operation for dx/excshell/1 extensions
 *
 * @param {object} libConsoleCLI an instance of LibConsoleCli to get latest services, the user must be logged in
 * @param {object} aioConfig loaded aio config
 * @returns {object} op['view'] metadata OR null
 */
async function buildExcShellViewExtensionMetadata (libConsoleCLI, aioConfig) {
  let serviceProperties
  let services
  if (aioConfig.project.workspace.details) {
    serviceProperties = aioConfig.project.workspace.details.services
  }
  if (serviceProperties) {
    services = (Array.isArray(serviceProperties)) ? serviceProperties : JSON.parse(serviceProperties)
  } else {
    serviceProperties = await libConsoleCLI.getServicePropertiesFromWorkspace(
      aioConfig.project.org.id,
      aioConfig.project.id,
      aioConfig.project.workspace
    )
    services = serviceProperties.map(s => ({
      name: s.name,
      code: s.sdkCode
    }))
  }
  return {
    services: Object.assign([], services),
    profile: {
      client_id: 'firefly-app',
      scope: 'ab.manage,additional_info.job_function,additional_info.projectedProductContext,additional_info.roles,additional_info,AdobeID,adobeio_api,adobeio.appregistry.read,audiencemanager_api,creative_cloud,mps,openid,read_organizations,read_pc.acp,read_pc.dma_tartan,read_pc,session'
    }
  }
}

/**
 * Build extension points payload from configuration all extension configurations
 *
 * @param {Array} extConfigs array resulting from BaseCommand.getAppExtConfigs
 * @returns {object} extension registry payload
 */
function buildExtensionPointPayloadWoMetadata (extConfigs) {
  // Example input:
  //   application: {...}
  //   dx/excshell/1:
  //     operations:
  //       view:
  //         impl: index.html
  //         type: web
  //   dx/asset-compute/worker/1:
  //     operations:
  //       workerProcess:
  //         impl: aem-nui-v1/ps-worker
  //         type: action
  //
  // Example output:
  // endpoints:
  //   dx/excshell/1:
  //    operations:
  //      view:
  //        href: https://namespace.adobeio-static.net/index.html # todo support for multi UI with a extname-opcode-subfolder
  //   dx/asset-compute/worker/1:
  //    operations:
  //      workerProcess:
  //        href: https://namespace.adobeioruntime.net/api/v1/web/aem-nui-v1/ps-worker

  const endpointsPayload = {}
  // iterate over all configuration to deploy
  Object.entries(extConfigs)
    // filter out the standalone application config, we want to publish extension points
    .filter(([k, v]) => k !== 'application')
    .forEach(([extPointName, extPointConfig]) => {
      endpointsPayload[extPointName] = {}
      let actionUrls = {}
      if (extPointConfig.app.hasBackend) {
        // note: 3rd arg, _isLocalDev is not used in RuntimeLib
        // there is no such thing as --local anymore
        actionUrls = RuntimeLib.utils.getActionUrls(extPointConfig, false, false)
      }
      Object.entries(extPointConfig.operations)
        .forEach(([opName, opList]) => {
          // replace operations impl and type with a href, either for an action or for a UI
          endpointsPayload[extPointName][opName] = opList.map(op => {
            if (op.type === 'action') {
              const actionAndPkgName = op.impl
              const actionName = actionAndPkgName.split('/')[1]
              // Note: if the package is the first package in the url getActionUrls will return actionName as key
              // this should be fixed in runtime lib: https://github.com/adobe/aio-lib-runtime/issues/64
              const href = actionUrls[actionName] || actionUrls[actionAndPkgName]
              return { href, ...op.params }
            } else if (op.type === 'web') {
              // todo support for multi UI with a extname-opcode-subfolder
              return {
                href: `https://${extPointConfig.ow.namespace}.${extPointConfig.app.hostname}/${op.impl}`,
                ...op.params
              }
            } else {
              throw new Error(`unexpected op.type encountered => '${op.type}'`)
            }
          })
        })
    })
  return { endpoints: endpointsPayload }
}

/** @private */
function atLeastOne (input) {
  if (input.length === 0) {
    return 'please choose at least one option'
  }
  return true
}

/** @private */
function deleteUserConfig (configData) {
  const phyConfig = yaml.load(fs.readFileSync(configData.file))
  const interKeys = configData.key.split('.')
  const phyActionConfigParent = interKeys.slice(0, -1).reduce((obj, k) => obj && obj[k], phyConfig)
  // like delete configFile.runtimeManifest.packages.actions.theaction
  delete phyActionConfigParent[interKeys.slice(-1)]
  fs.writeFileSync(configData.file, yaml.dump(phyConfig))
}

/** @private */
const createWebExportFilter = (filterValue) => {
  return (action) => {
    if (!action) {
      return false
    }

    // if no annotations, its as if web-export = false
    const webExportValue = action.annotations?.['web-export'] ?? false
    return String(!!webExportValue) === String(filterValue)
  }
}

/**
 * Get property from object with case insensitivity.
 *
 * @param {object} obj the object to wrap
 * @param {string} key the key
 * @private
 */
function getObjectProp (obj, key) {
  return obj[Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase())]
}

/**
 * Get a value in an object by dot notation.
 *
 * @param {object} obj the object to wrap
 * @param {string} key the key
 * @returns {object} the value
 */
function getObjectValue (obj, key) {
  const keys = (key || '').toString().split('.')
  return keys.filter(o => o.trim()).reduce((o, i) => o && getObjectProp(o, i), obj)
}

/**
 * Counts files by extension in a directory
 *
 * @param {string} directory Path to assets directory
 * @returns {Array<string>} Array of formatted log messages
 */
function getFilesCountWithExtension (directory) {
  const log = []

  if (!fs.existsSync(directory)) {
    throw new Error(`Error: Directory ${directory} does not exist.`)
  }

  const files = fs.readdirSync(directory, { recursive: true })
  if (files.length === 0) {
    throw new Error(`Error: No files found in directory ${directory}.`)
  }

  const fileTypeCounts = {}
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase() || 'no extension'
    if (fileTypeCounts[ext]) {
      fileTypeCounts[ext]++
    } else {
      fileTypeCounts[ext] = 1
    }
  })

  Object.keys(fileTypeCounts).forEach(ext => {
    const count = fileTypeCounts[ext]
    let description
    switch (ext) {
      case '.js':
        description = 'Javascript file(s)'
        break
      case '.css':
        description = 'CSS file(s)'
        break
      case '.html':
        description = 'HTML page(s)'
        break
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
      case '.webp':
        description = `${ext} image(s)`
        break
      case 'no extension':
        description = 'file(s) without extension'
        break
      default:
        description = `${ext} file(s)`
    }
    log.push(`${count} ${description}\n`)
  })

  return log
}

/**
 * Rewrites action URLs in deployed runtime entities using URLs from the manifest configuration.
 *
 * This function takes deployed runtime entities and updates the URL property of each action
 * with the corresponding URL from the runtime manifest configuration. It creates a deep copy
 * of the entities to avoid mutating the original object.
 *
 * @param {object} params - Parameters object
 * @param {object} params.entities - The deployed runtime entities object
 * @param {object} params.config - The application configuration object containing runtime manifest
 * @returns {Promise<object>} A promise that resolves to a deep copy of the entities object with updated action URLs
 * @example
 * const entities = {
 *   actions: [
 *     { name: 'my-action', url: 'old-url' },
 *     { name: 'another-action', url: 'another-old-url' }
 *   ]
 * }
 * const config = {
 *   actions: { devRemote: false },
 *   // ... other config properties
 * }
 *
 * const rewrittenEntities = await rewriteActionUrlInEntities({ entities, config })
 * // rewrittenEntities.actions will have updated URLs from the manifest
 */
async function rewriteActionUrlInEntities ({ entities, config }) {
  const actionUrlsFromManifest = RuntimeLib.utils.getActionUrls(config, config.actions.devRemote)
  const rewrittenEntities = structuredClone(entities)

  rewrittenEntities.actions = rewrittenEntities.actions?.map(action => {
    const retAction = structuredClone(action)
    const url = actionUrlsFromManifest[action.name]
    if (url) {
      retAction.url = url
    }
    return retAction
  })
  return rewrittenEntities
}

module.exports = {
  rewriteActionUrlInEntities,
  getObjectValue,
  getObjectProp,
  createWebExportFilter,
  isNpmInstalled,
  isGitInstalled,
  installPackages,
  runScript,
  runInProcess,
  runPackageScript,
  wrapError,
  removeProtocolFromURL,
  urlJoin,
  checkFile,
  writeConfig,
  servicesToGeneratorInput,
  warnIfOverwriteServicesInProductionWorkspace,
  setOrgServicesConfig,
  setWorkspaceServicesConfig,
  buildExtensionPointPayloadWoMetadata,
  buildExcShellViewExtensionMetadata,
  atLeastOne,
  deleteUserConfig,
  getFilesCountWithExtension
}
