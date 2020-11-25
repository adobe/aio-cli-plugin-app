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
const utils = require('./app-helper')
const aioConfig = require('@adobe/aio-lib-core-config')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:config-loader', { provider: 'debug' })

// defaults
const {
  defaultAioHostname,
  defaultTvmUrl,
  defaultOwApiHost,
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
  aioConfig.reload()
  const userConfig = aioConfig.get() || {}
  userConfig.cna = userConfig.cna || {}
  config.imsOrgId = aioConfig.get(AIO_CONFIG_IMS_ORG_ID)

  // 1. paths
  // 1.a defaults
  const actions = path.normalize(userConfig.cna.actions || 'actions')
  const dist = path.normalize(userConfig.cna.dist || 'dist')
  const web = path.normalize(userConfig.cna.web || 'web-src')
  // 1.b set config paths
  config.actions.src = _abs(actions) // todo this should be linked with manifest.yml paths
  config.actions.dist = _abs(path.join(dist, actions))

  config.web.src = _abs(web)
  config.web.distDev = _abs(path.join(dist, `${web}-dev`))
  config.web.distProd = _abs(path.join(dist, `${web}-prod`))
  config.web.injectedConfig = _abs(path.join(web, 'src', 'config.json'))

  config.s3.credsCacheFile = _abs('.aws.tmp.creds.json')
  config.manifest.src = _abs('manifest.yml')

  // set s3 creds if specified
  config.s3.creds = (typeof userConfig.cna === 'object') &&
    (userConfig.cna.awsaccesskeyid &&
     userConfig.cna.awssecretaccesskey &&
     userConfig.cna.s3bucket) && {
    accessKeyId: userConfig.cna.awsaccesskeyid,
    secretAccessKey: userConfig.cna.awssecretaccesskey,
    params: { Bucket: userConfig.cna.s3bucket }
  }

  // set for general build artifacts
  config.app.dist = dist

  // check if the app has a frontend, for now enforce index.html to be there
  // todo we shouldn't have any config.web config if !hasFrontend
  config.app.hasFrontend = fs.existsSync(config.web.src)

  // check if the app has a backend by checking presence of manifest.yml file
  config.app.hasBackend = fs.existsSync(config.manifest.src)

  // 2. check needed files
  aioLogger.debug('checking package.json existence')
  utils.checkFile(_abs('package.json'))

  // 3. load app config from package.json
  const packagejson = JSON.parse(fs.readFileSync(_abs('package.json')))
  // semver starts at 0.1.0
  config.app.version = packagejson.version || '0.1.0'
  config.app.name = getModuleName(packagejson) || 'unnamed-cna'

  // 4. Load manifest config
  if (config.app.hasBackend) {
    config.manifest.packagePlaceholder = '__APP_PACKAGE__'
    config.manifest.full = yaml.safeLoad(fs.readFileSync(config.manifest.src, 'utf8'))
    config.manifest.package = config.manifest.full.packages[config.manifest.packagePlaceholder]
    if (config.manifest.package) {
      aioLogger.debug(`Use of ${config.manifest.packagePlaceholder} in manifest.yml.`)
    }
    // Note: we should probably set the config.manifest.package also if it's not using a placeholder
  }

  // 5. deployment config
  config.ow = userConfig.runtime || {}
  config.ow.apihost = config.ow.apihost || defaultOwApiHost
  config.ow.apiversion = config.ow.apiversion || 'v1'
  config.ow.package = `${config.app.name}-${config.app.version}`
  config.s3.folder = config.ow.namespace // this becomes the root only /
  config.s3.tvmUrl = userConfig.cna.tvmurl || defaultTvmUrl
  // only provide a hostname if it was given or if the app uses the tvm
  config.app.hostname = userConfig.cna.hostname || defaultAioHostname
  // cache control config
  config.app.htmlCacheDuration = userConfig.cna.htmlcacheduration || defaultHTMLCacheDuration
  config.app.jsCacheDuration = userConfig.cna.jscacheduration || defaultJSCacheDuration
  config.app.cssCacheDuration = userConfig.cna.csscacheduration || defaultCSSCacheDuration
  config.app.imageCacheDuration = userConfig.cna.imagecacheduration || defaultImageCacheDuration

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
