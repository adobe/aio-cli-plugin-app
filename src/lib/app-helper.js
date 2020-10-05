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
const dotenv = require('dotenv')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:lib-app-helper', { provider: 'debug' })
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const RuntimeLib = require('@adobe/aio-lib-runtime')
const fetch = require('node-fetch')

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
    const command = pkg.scripts[scriptName].split(' ')
    const child = execa(command[0], command.slice(1).concat(cmdArgs), {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      cwd: dir,
      preferLocal: true
    })
    // handle IPC from possible aio-run-detached script
    child.on('message', message => {
      if (message.type === 'long-running-process') {
        const pid = message.data.pid
        aioLogger.debug(`long running process (pid: ${pid}) found. Registering for SIGTERM`)
        process.on('exit', () => {
          try {
            process.kill(pid, 'SIGTERM')
          } catch (_) {
            // do nothing if pid not found
          }
        })
      }
    })
    return child
  } else {
    throw new Error(`${dir} does not contain a package.json or it does not contain a script named ${scriptName}`)
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
  const { env = 'prod' } = await context.getCli() || {}
  await context.setCli({ 'cli.bare-output': true }, false) // set this globally

  aioLogger.debug('Retrieving CLI Token')
  const accessToken = await getToken(CLI)

  return { accessToken, env }
}

/** @private */
async function getLogs (config, limit, logger, startTime = 0) {
  // check for runtime credentials
  RuntimeLib.utils.checkOpenWhiskCredentials(config)
  const runtime = await RuntimeLib.init({
    // todo make this.config.ow compatible with Openwhisk config
    apihost: config.ow.apihost,
    apiversion: config.ow.apiversion,
    api_key: config.ow.auth,
    namespace: config.ow.namespace
  })

  // get activations
  const listOptions = { limit: limit, skip: 0 }
  const logFunc = logger || console.log
  const activations = await runtime.activations.list(listOptions)
  let lastActivationTime = 0
  // console.log('activations = ', activations)
  for (let i = (activations.length - 1); i >= 0; i--) {
    const activation = activations[i]
    lastActivationTime = activation.start
    if (lastActivationTime > startTime) {
      const results = await runtime.activations.logs({ activationId: activation.activationId })
      // console.log('results = ', results)
      // send fetched logs to console
      if (results.logs.length > 0) {
        logFunc(activation.name + ':' + activation.activationId)
        results.logs.forEach(function (log) {
          logFunc(log)
        })
        logFunc()
      }
    }
  }
  return { lastActivationTime }
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
    aioLogger.debug('java version : ' + result.stdout)
    return true
  } catch (error) {
    aioLogger.debug('Error spawning java info: ' + error)
  }
  return false
}
// async function hasWskDebugInstalled () {
//   // todo should test for local install as well
//   try {
//     const result = await execa('wskdebug', ['--version'])
//     debug('wskdebug version : ' + result.stdout)
//     return true
//   } catch (error) {
//     debug('Error spawning wskdebug info: ' + error)
//   }
//   return false
// }

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
async function runOpenWhiskJar (jarFile, runtimeConfigFile, apihost, waitInitTime, waitPeriodTime, timeout, /* istanbul ignore next */ execaOptions = {}) {
  aioLogger.debug(`runOpenWhiskJar - jarFile: ${jarFile} runtimeConfigFile ${runtimeConfigFile} apihost: ${apihost} waitInitTime: ${waitInitTime} waitPeriodTime: ${waitPeriodTime} timeout: ${timeout}`)
  const proc = execa('java', ['-jar', '-Dwhisk.concurrency-limit.max=10', jarFile, '-m', runtimeConfigFile, '--no-ui'], execaOptions)
  await waitForOpenWhiskReadiness(apihost, waitInitTime, waitPeriodTime, timeout)
  // must wrap in an object as execa return value is awaitable
  return { proc }

  /** @private */
  async function waitForOpenWhiskReadiness (host, initialWait, period, timeout) {
    const endTime = Date.now() + timeout
    await waitFor(initialWait)
    await _waitForOpenWhiskReadiness(host, endTime)

    /** @private */
    async function _waitForOpenWhiskReadiness (host, endTime) {
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
        await waitFor(period)
        return _waitForOpenWhiskReadiness(host, endTime)
      }
    }

    /** @private */
    function waitFor (t) {
      return new Promise(resolve => setTimeout(resolve, t))
    }
  }
}

/** @private */
function saveAndReplaceDotEnvCredentials (dotenvFile, saveFile, apihost, namespace, auth) {
  if (fs.existsSync(saveFile)) throw new Error(`cannot save .env, please make sure to restore and delete ${saveFile}`) // todo make saveFile relative
  fs.moveSync(dotenvFile, saveFile)
  // Only override needed env vars and preserve other vars in .env
  const env = dotenv.parse(fs.readFileSync(saveFile))
  const newCredentials = {
    RUNTIME_NAMESPACE: namespace,
    RUNTIME_AUTH: auth,
    RUNTIME_APIHOST: apihost
  }

  // remove old keys (match by normalized key name)
  for (const key in env) {
    // match AIO_ or AIO__ since they map to the same key
    // see https://github.com/adobe/aio-lib-core-config/issues/49
    const match = key.match(/^AIO__(.+)/i) || key.match(/^AIO_(.+)/i)
    if (match) {
      for (const newCredential in newCredentials) {
        if (newCredential.toLowerCase() === match[1].toLowerCase()) {
          delete env[key]
        }
      }
    }
  }

  // set the new keys
  for (const key in newCredentials) {
    env[`AIO_${key}`] = newCredentials[key]
  }

  const envContent = Object.keys(env).reduce((content, k) => content + `${k}=${env[k]}\n`, '')

  fs.writeFileSync(dotenvFile, envContent)
}

module.exports = {
  isNpmInstalled,
  isGitInstalled,
  installPackage,
  runPackageScript,
  wrapError,
  getCliInfo,
  getActionUrls,
  getLogs,
  removeProtocolFromURL,
  urlJoin,
  checkFile,
  hasDockerCLI,
  hasJavaCLI,
  isDockerRunning,
  writeConfig,
  downloadOWJar,
  runOpenWhiskJar,
  saveAndReplaceDotEnvCredentials
}
