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

const path = require('path')
const yaml = require('js-yaml')
const fs = require('fs-extra')
const chalk = require('chalk')
const utils = require('./app-helper')
const aioConfigLoader = require('@adobe/aio-lib-core-config')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:config-loader', { provider: 'debug' })

// defaults
const {
  defaultAppHostname,
  defaultTvmUrl,
  defaultOwApihost,
  defaultHTMLCacheDuration,
  defaultJSCacheDuration,
  defaultCSSCacheDuration,
  defaultImageCacheDuration,
  AIO_CONFIG_IMS_ORG_ID
} = require('./defaults')

/**
 * loading config returns following object (this config is internal, not user facing):
 *  {
 *    app: {
 *      name,
 *      version,
 *      hasFrontend,
 *      hasBackend,
 *      dist
 *    },
 *    ow: {
 *      apihost,
 *      apiversion,
 *      auth,
 *      namespace,
 *      package
 *    },
 *    s3: {
 *      creds || tvmUrl,
 *      credsCacheFile,
 *      folder,
 *    },
 *    web: {
 *      src,
 *      injectedConfig,
 *      distDev,
 *      distProd,
 *    },
 *    manifest: {
 *      full,
 *      package,
 *      packagePlaceholder,
 *      src,
 *    },
 *    actions: {
 *      src,
 *      dist,
 *      remote,
 *      urls
 *    }
 *  }
 */

module.exports = () => {
  // init internal config
  const config = {}
  config.app = {}
  config.ow = {}
  config.s3 = {}
  config.web = {}
  config.manifest = {}
  config.actions = {}
  config.root = process.cwd()

  const _abs = (p) => path.join(config.root, p)
  // load aio config
  aioConfigLoader.reload()
  const aioConfig = aioConfigLoader.get() || {}

  // reads .aio.app and app.config.yml
  const userConfig = loadUserConfig(aioConfig)

  config.imsOrgId = aioConfigLoader.get(AIO_CONFIG_IMS_ORG_ID)

  // paths
  // defaults
  const actions = path.normalize(userConfig.actions || 'actions')
  const dist = path.normalize(userConfig.dist || 'dist')
  const web = path.normalize(userConfig.web || 'web-src')
  // set config paths
  config.actions.src = _abs(actions) // todo this should be linked with manifest.yml paths
  config.actions.dist = _abs(path.join(dist, actions))

  config.web.src = _abs(web)
  config.web.distDev = _abs(path.join(dist, `${web}-dev`))
  config.web.distProd = _abs(path.join(dist, `${web}-prod`))
  config.web.injectedConfig = _abs(path.join(web, 'src', 'config.json'))

  config.s3.credsCacheFile = _abs('.aws.tmp.creds.json')

  // load runtime manifest config, either from manifest.yml or app.config.runtime
  config.manifest = loadRuntimeManifest(userConfig)

  // load extension manifest
  config.extension = loadExtensionEndpoints(userConfig)

  // set s3 creds if specified
  if (userConfig.awsaccesskeyid &&
    userConfig.awssecretaccesskey &&
    userConfig.s3bucket) {
    config.s3.creds = {
      accessKeyId: userConfig.awsaccesskeyid,
      secretAccessKey: userConfig.awssecretaccesskey,
      params: { Bucket: userConfig.s3bucket }
    }
  }

  // set for general build artifacts
  config.app.dist = dist
  // check if the app has a frontend, for now enforce index.html to be there
  // todo we shouldn't have any config.web config if !hasFrontend
  config.app.hasFrontend = fs.existsSync(config.web.src)
  // check if the app has a backend by checking presence of a runtime manifest config
  config.app.hasBackend = !!config.manifest.full

  // check needed files
  aioLogger.debug('checking package.json existence')
  utils.checkFile(_abs('package.json'))

  // load app config from package.json
  const packagejson = JSON.parse(fs.readFileSync(_abs('package.json')))
  // semver starts at 0.1.0
  config.app.version = packagejson.version || '0.1.0'
  config.app.name = getModuleName(packagejson) || 'unnamed-app'

  // deployment config
  config.ow = aioConfig.runtime || {}
  config.ow.defaultApihost = defaultOwApihost
  config.ow.apihost = config.ow.apihost || defaultOwApihost // set by user
  config.ow.apiversion = config.ow.apiversion || 'v1'
  config.ow.package = `${config.app.name}-${config.app.version}`
  // S3 static files deployment config
  config.s3.folder = config.ow.namespace // this becomes the root only /
  // Legacy applications set the defaultTvmUrl in .env, so we need to ignore it to not
  // consider it as custom. The default will be set downstream by aio-lib-core-tvm.
  if (userConfig.tvmurl !== defaultTvmUrl) {
    config.s3.tvmUrl = userConfig.tvmurl
  }
  // set hostname for backend actions && UI
  config.app.defaultHostname = defaultAppHostname
  config.app.hostname = userConfig.hostname || defaultAppHostname
  // cache control config
  config.app.htmlCacheDuration = userConfig.htmlcacheduration || defaultHTMLCacheDuration
  config.app.jsCacheDuration = userConfig.jscacheduration || defaultJSCacheDuration
  config.app.cssCacheDuration = userConfig.csscacheduration || defaultCSSCacheDuration
  config.app.imageCacheDuration = userConfig.imagecacheduration || defaultImageCacheDuration

  // TODO remove those two debugging lines
  console.log(JSON.stringify(config, null, 2))
  process.exit()

  return config
}

/** @private */
function getModuleName (packagejson) {
  if (packagejson && packagejson.name) {
    // turn "@company/myaction" into "myaction"
    // OpenWhisk does not allow `@` or `/` in an entity name
    return packagejson.name.split('/').pop()
  }
}

/**
 * @param aioConfig
 * @param appConfig
 */
function loadUserConfig (aioConfig) {
  // TODO there should be a function in aio-lib-core-config that allows to load a file by its name to support both yaml and hjson
  const CONFIG_FILE = 'app.config.yaml'
  let appConfig = null
  if (fs.existsSync(CONFIG_FILE)) {
    appConfig = yaml.safeLoad(fs.readFileSync(CONFIG_FILE, 'utf8'))
  }
  // aioConfig.cna deprecation warning
  if (aioConfig.cna !== undefined) {
    aioLogger.warn(chalk.redBright(chalk.bold('The config variable \'cna\' has been deprecated. Please update it with \'app\' instead in your .aio configuration file.')))
    Object.assign(aioConfig.app, aioConfig.cna)
  }

  return { ...aioConfig.app, ...appConfig }
}

/**
 * @param userConfig
 */
function loadRuntimeManifest (userConfig) {
  const manifestConfig = { src: 'manifest.yml' }
  if (userConfig.runtimeManifest) {
    manifestConfig.full = userConfig.runtimeManifest
  } else if (fs.existsSync(manifestConfig.src)) {
    manifestConfig.full = yaml.safeLoad(fs.readFileSync(manifestConfig.src, 'utf8'))
  } else {
    // no backend
    return manifestConfig
  }
  manifestConfig.packagePlaceholder = '__APP_PACKAGE__'
  manifestConfig.package = manifestConfig.full.packages[manifestConfig.packagePlaceholder]
  if (manifestConfig.package) {
    aioLogger.debug(`Use of ${manifestConfig.packagePlaceholder} in manifest.yml.`)
  }
  // Note: we should set the config.manifest.package also if it's not using a placeholder
  return manifestConfig
}

/**
 * @param userConfig
 */
function loadExtensionEndpoints (userConfig) {
  // Example config:
  // {
  // THIS PART OF THE MANIFEST IS SET BY THE CONSOLE API
  //   "name": "1234-SleepyBear-stage",
  //   "title": "LUMA News Realtime Analytics",
  //   "description": "This dashboard visualizes real-time visitor traffic from LUMA News website.",
  //   "icon": "https://ioexchange-cdn.azureedge.net/jgr/104272/70d960c5-b692-486b-95e7-4f57fca228f9.jpg",
  //   "publisherName": "Adobe Firefly",
  // NOTE THIS IS THE ONLY PART OF THE MANIFEST THAT IS REQUIRED
  //   "endpoints": {
  //     "firefly/excshell/1": {
  //       "view": {
  //         "href": "https://53444-lumareport.adobeio-static.net/"
  //       }
  //     }
  //   }
  // }
  // TODO warning/error on missing/bad fields

  return userConfig.extensionEndpoints
}
