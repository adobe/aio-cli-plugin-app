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
const path = require('path')
const which = require('which')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:lib-app-helper', { provider: 'debug' })
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const fetch = require('node-fetch')
const chalk = require('chalk')
const aioConfig = require('@adobe/aio-lib-core-config')
const { AIO_CONFIG_WORKSPACE_SERVICES, AIO_CONFIG_ORG_SERVICES } = require('./defaults')
const { EOL } = require('os')
const { getCliEnv } = require('@adobe/aio-lib-env')
const yaml = require('js-yaml')

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

/** @private */
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
 * @param command
 * @param dir
 * @param cmdArgs
 */
async function runScript (command, dir, cmdArgs = []) {
  if (!command) {
    return null
  }
  if (!dir) {
    dir = process.cwd()
  }
  const fullCommand = command + cmdArgs && ' ' + cmdArgs.join(' ')
  aioLogger.debug(`running command '${fullCommand}' in dir: '${dir}'`)
  // run
  const child = execa.command(command, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    shell: true,
    cwd: dir,
    preferLocal: true
  })
  // handle IPC from possible aio-run-detached script
  child.on('message', message => {
    if (message.type === 'long-running-process') {
      const { pid, logs } = message.data
      aioLogger.debug(`Found '${fullCommand}' event hook long running process (pid: ${pid}). Registering for SIGTERM`)
      aioLogger.debug(`Log locations for ${fullCommand} event hook long-running process (stdout: ${logs.stdout} stderr: ${logs.stderr})`)
      process.on('exit', () => {
        try {
          aioLogger.debug(`Killing ${fullCommand} event hook long-running process (pid: ${pid})`)
          process.kill(pid, 'SIGTERM')
        } catch (_) {
          // do nothing if pid not found
        }
      })
    }
  })
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

/** @private */
async function getCliInfo () {
  await context.setCli({ 'cli.bare-output': true }, false) // set this globally

  const env = getCliEnv()

  aioLogger.debug(`Retrieving CLI Token using env=${env}`)
  const accessToken = await getToken(CLI)

  return { accessToken, env }
}

/** @private */
function getActionUrls (config, isRemoteDev = false, isLocalDev = false) {
  // set action urls
  // action urls {name: url}, if !LocalDev subdomain uses namespace
  return Object.entries({ ...config.manifest.package.actions, ...(config.manifest.package.sequences || {}) }).reduce((obj, [name, action]) => {
    const webArg = action['web-export'] || action.web
    const webUri = (webArg && webArg !== 'no' && webArg !== 'false') ? 'web' : ''
    if (isLocalDev) {
      // http://localhost:3233/api/v1/web/<ns>/<package>/<action>
      obj[name] = urlJoin(config.ow.apihost, 'api', config.ow.apiversion, webUri, config.ow.namespace, config.ow.package, name)
    } else if (isRemoteDev || !webUri || !config.app.hasFrontend) {
      // - if remote dev we don't care about same domain as the UI runs on localhost
      // - if action is non web it cannot be called from the UI and we can point directly to ApiHost domain
      // - if action has no UI no need to use the CDN url
      // NOTE this will not work for apihosts that do not support <ns>.apihost url
      // https://<ns>.adobeioruntime.net/api/v1/web/<package>/<action>
      obj[name] = urlJoin('https://' + config.ow.namespace + '.' + removeProtocolFromURL(config.ow.apihost), 'api', config.ow.apiversion, webUri, config.ow.package, name)
    } else {
      // https://<ns>.adobe-static.net/api/v1/web/<package>/<action>
      obj[name] = urlJoin('https://' + config.ow.namespace + '.' + removeProtocolFromURL(config.app.hostname), 'api', config.ow.apiversion, webUri, config.ow.package, name)
    }
    return obj
  }, {})
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

/** @private */
async function isDockerRunning () {
  // todo more checks
  const args = ['info']
  try {
    await execa('docker', args)
    return true
  } catch (error) {
    aioLogger.debug('Error spawning docker info: ' + error)
  }
  return false
}

/** @private */
async function hasDockerCLI () {
  // todo check min version
  try {
    const result = await execa('docker', ['-v'])
    aioLogger.debug('docker version : ' + result.stdout)
    return true
  } catch (error) {
    aioLogger.debug('Error spawning docker info: ' + error)
  }
  return false
}

/** @private */
async function hasJavaCLI () {
  // todo check min version
  try {
    const result = await execa('java', ['-version'])
    // stderr is where the version is printed out for
    aioLogger.debug('java version : ' + result.stderr)
    return true
  } catch (error) {
    aioLogger.debug('Error spawning java info: ' + error)
  }
  return false
}

/** @private */
async function downloadOWJar (url, outFile) {
  aioLogger.debug(`downloadOWJar - url: ${url} outFile: ${outFile}`)
  let response
  try {
    response = await fetch(url)
  } catch (e) {
    aioLogger.debug(`connection error while downloading '${url}'`, e)
    throw new Error(`connection error while downloading '${url}', are you online?`)
  }
  if (!response.ok) throw new Error(`unexpected response while downloading '${url}': ${response.statusText}`)
  fs.ensureDirSync(path.dirname(outFile))
  const fstream = fs.createWriteStream(outFile)

  return new Promise((resolve, reject) => {
    response.body.pipe(fstream)
    response.body.on('error', (err) => {
      reject(err)
    })
    fstream.on('finish', () => {
      resolve()
    })
  })
}

/** @private */
async function waitForOpenWhiskReadiness (host, endTime, period, timeout, waitFunc) {
  if (Date.now() > endTime) {
    throw new Error(`local openwhisk stack startup timed out: ${timeout}ms`)
  }

  let ok

  try {
    const response = await fetch(host + '/api/v1')
    ok = response.ok
  } catch (e) {
    ok = false
  }

  if (!ok) {
    await waitFunc(period)
    return waitForOpenWhiskReadiness(host, endTime, period, timeout, waitFunc)
  }
}

/** @private */
function waitFor (t) {
  return new Promise(resolve => setTimeout(resolve, t))
}

/** @private */
async function runOpenWhiskJar (jarFile, runtimeConfigFile, apihost, waitInitTime, waitPeriodTime, timeout, /* istanbul ignore next */ execaOptions = {}) {
  aioLogger.debug(`runOpenWhiskJar - jarFile: ${jarFile} runtimeConfigFile ${runtimeConfigFile} apihost: ${apihost} waitInitTime: ${waitInitTime} waitPeriodTime: ${waitPeriodTime} timeout: ${timeout}`)
  const jvmConfig = aioConfig.get('ow.jvm.args')
  const jvmArgs = jvmConfig ? jvmConfig.split(' ') : []
  const proc = execa('java', ['-jar', '-Dwhisk.concurrency-limit.max=10', ...jvmArgs, jarFile, '-m', runtimeConfigFile, '--no-ui', '--disable-color-logging'], execaOptions)

  const endTime = Date.now() + timeout
  await waitFor(waitInitTime)
  await waitForOpenWhiskReadiness(apihost, endTime, waitPeriodTime, timeout, waitFor)

  // must wrap in an object as execa return value is awaitable
  return { proc }
}

/**
 *
 * Converts a service array to an input string that can be consumed by generator-aio-app
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
  const serviceProperties = await libConsoleCLI.getServicePropertiesFromWorkspace(
    aioConfig.project.org.id,
    aioConfig.project.id,
    aioConfig.project.workspace
  )
  const services = serviceProperties.map(s => ({
    name: s.name,
    code: s.sdkCode
  }))
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
  // application: {...}
  // extensions:
  //   dx/excshell/1:
  //     operations:
  //       view:
  //         impl: index.html
  //         type: web
  //   dx/asset-compute/worker/1:
  //     operations:
  //       worker:
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
  //      worker:
  //        href: https://namespace.adobeioruntime.net/api/v1/web/aem-nui-v1/ps-worker

  const endpointsPayload = {}
  // iterate over all configuration to deploy
  Object.entries(extConfigs)
    // filter out the standalone application config, we want to publish extension points
    .filter(([k, v]) => k !== 'application')
    .forEach(([extPointName, extPointConfig]) => {
      endpointsPayload[extPointName] = {}
      Object.entries(extPointConfig.operations)
        .forEach(([opName, opList]) => {
          // replace operations impl and type with a href, either for an action or for a UI
          endpointsPayload[extPointName][opName] = opList.map(op => {
            if (op.type === 'action') {
              // todo modularize with getActionUrls from appHelper
              const owPackage = op.impl.split('/')[0]
              const owAction = op.impl.split('/')[1]
              const manifestAction = extPointConfig.manifest.full.packages[owPackage].actions[owAction]
              const webArg = manifestAction['web-export'] || manifestAction.web
              const webUri = (webArg && webArg !== 'no' && webArg !== 'false') ? 'web' : ''
              const packageWithAction = op.impl
              // todo non runtime apihost do not support namespace as subdomain
              const href = urlJoin('https://' + extPointConfig.ow.namespace + '.' + removeProtocolFromURL(extPointConfig.ow.apihost), 'api', extPointConfig.ow.apiversion, webUri, packageWithAction)
              return { href, ...op.params }
            } else if (op.type === 'web') {
              // todo support for multi UI with a extname-opcode-subfolder
              return {
                href: `https://${extPointConfig.ow.namespace}.${extPointConfig.app.hostname}/${op.impl}`,
                ...op.params
              }
            } else {
              throw new Error(`unexpected op.type encountered => ${op.type}`)
            }
          })
        })
    })
  return { endpoints: endpointsPayload }
}

/**
 * @param input
 */
function atLeastOne (input) {
  if (input.length === 0) {
    return 'please choose at least one option'
  }
  return true
}

/**
 * @param configData
 */
function deleteUserConfig (configData) {
  const phyConfig = yaml.safeLoad(fs.readFileSync(configData.file))
  const interKeys = configData.key.split('.')
  const phyActionConfigParent = interKeys.slice(0, -1).reduce((obj, k) => obj && obj[k], phyConfig)
  // like delete configFile.runtimeManifest.packages.actions.theaction
  delete phyActionConfigParent[interKeys.slice(-1)]
  fs.writeFileSync(configData.file, yaml.safeDump(phyConfig))
}

module.exports = {
  isNpmInstalled,
  isGitInstalled,
  installPackages,
  runScript,
  runPackageScript,
  wrapError,
  getCliInfo,
  getActionUrls,
  removeProtocolFromURL,
  urlJoin,
  checkFile,
  hasDockerCLI,
  hasJavaCLI,
  isDockerRunning,
  writeConfig,
  downloadOWJar,
  runOpenWhiskJar,
  servicesToGeneratorInput,
  waitForOpenWhiskReadiness,
  warnIfOverwriteServicesInProductionWorkspace,
  setOrgServicesConfig,
  setWorkspaceServicesConfig,
  buildExtensionPointPayloadWoMetadata,
  buildExcShellViewExtensionMetadata,
  atLeastOne,
  deleteUserConfig
}
