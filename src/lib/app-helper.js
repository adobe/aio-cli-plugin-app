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
async function installPackage (dir) {
  aioLogger.debug(`running npm install : ${dir}`)
  if (!(fs.statSync(dir).isDirectory())) {
    aioLogger.debug(`${dir} is not a directory`)
    throw new Error(`${dir} is not a directory`)
  }
  if (!fs.readdirSync(dir).includes('package.json')) {
    aioLogger.debug(`${dir} does not contain a package.json file.`)
    throw new Error(`${dir} does not contain a package.json file.`)
  }
  // npm install
  return execa('npm', ['install'], { cwd: dir })
}

/** @private */
async function runPackageScript (scriptName, dir, cmdArgs = []) {
  if (!dir) {
    dir = process.cwd()
  }
  aioLogger.debug(`running npm run-script ${scriptName} in dir: ${dir}`)
  const pkg = await fs.readJSON(path.join(dir, 'package.json'))
  if (pkg && pkg.scripts && pkg.scripts[scriptName]) {
    let command = pkg.scripts[scriptName]
    if (cmdArgs.length) {
      command = `${command} ${cmdArgs.join(' ')}`
    }
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
        aioLogger.debug(`Found ${scriptName} event hook long running process (pid: ${pid}). Registering for SIGTERM`)
        aioLogger.debug(`Log locations for ${scriptName} event hook long-running process (stdout: ${logs.stdout} stderr: ${logs.stderr})`)
        process.on('exit', () => {
          try {
            aioLogger.debug(`Killing ${scriptName} event hook long-running process (pid: ${pid})`)
            process.kill(pid, 'SIGTERM')
          } catch (_) {
            // do nothing if pid not found
          }
        })
      }
    })
    return child
  } else {
    aioLogger.debug(`${dir} does not contain a package.json or it does not contain a script named ${scriptName}`)
  }
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

  aioLogger.debug('Retrieving CLI Token')
  const accessToken = await getToken(CLI)

  const env = getCliEnv()
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

module.exports = {
  isNpmInstalled,
  isGitInstalled,
  installPackage,
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
  setWorkspaceServicesConfig
}
