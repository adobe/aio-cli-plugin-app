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
  AIO_CONFIG_IMS_ORG_ID,
  stageAppHostname
} = require('./defaults')

const {
  getCliEnv, /* function */
  STAGE_ENV /* string */
} = require('@adobe/aio-lib-env')

const USER_CONFIG_FILE = 'app.config.yaml'
const LEGACY_RUNTIME_MANIFEST = 'manifest.yml'
const INCLUDE_DIRECTIVE = '$include'

/**
 * loading config returns following object (this config is internal, not user facing):
 *  {
 *    extensionPoints: {Manifest}
 *    extensionPointsConfig: {
 *      'aem/nui/1': {
 *        app: {
 *          name,
 *          version,
 *          hasFrontend,
 *          hasBackend,
 *          dist
 *        },
 *        ow: {
 *          apihost,
 *          apiversion,
 *          auth,
 *          namespace,
 *          package
 *        },
 *        s3: {
 *          creds || tvmUrl,
 *          credsCacheFile,
 *          folder,
 *        },
 *        web: {
 *          src,
 *          injectedConfig,
 *          distDev,
 *          distProd,
 *        },
 *        manifest: {
 *          full,
 *          package,
 *          packagePlaceholder,
 *          src,
 *        },
 *        actions: {
 *          src,
 *          dist,
 *          remote,
 *          urls
 *        }
 *      }
 *    }
 *  }
 */

module.exports = () => {
  // configuration that is shared for application and each extension config
  // holds things like ow credentials, packagejson and aioConfig
  const commonConfig = loadCommonConfig()

  // user configuration is specified in app.config.yaml and holds both standalone app and extension configuration
  // note that `$includes` directive will be resolved here
  const userConfig = loadUserConfig()

  // load the full standalone application configuration
  const all = {
    ...loadAppConfig(userConfig, commonConfig),
    ...loadExtConfigs(userConfig, commonConfig)
  }

  return {
    all,
    aio: commonConfig.aio,
    packagejson: commonConfig.packagejson,
    root: process.cwd()
  }
}

/**
 *
 */
function loadCommonConfig () {
  // load aio config (mostly runtime and console config)
  aioConfigLoader.reload()
  const aioConfig = aioConfigLoader.get() || {}

  if (aioConfig.cna !== undefined || aioConfig.app !== undefined) {
    aioLogger.warn(chalk.redBright(chalk.bold('Setting application configuration in the \'.aio\' file has been deprecated. Please move your \'.aio.app\' or \'.aio.cna\' to \'app.config.yaml\'.')))
    aioConfig.app = { ...aioConfig.app, ...aioConfig.cna }
  }

  const packagejson = loadPackageJson()

  // defaults
  packagejson.name = getModuleName(packagejson) || 'unnamed-app'
  packagejson.version = packagejson.version || '0.1.0'

  const owConfig = aioConfig.runtime || {}
  owConfig.defaultApihost = defaultOwApihost
  owConfig.apihost = owConfig.apihost || defaultOwApihost // set by user
  owConfig.apiversion = owConfig.apiversion || 'v1'
  // default package name replacing __APP_PACKAGE__ placeholder
  owConfig.package = `${packagejson.name}-${packagejson.version}`

  return {
    packagejson,
    ow: owConfig,
    aio: aioConfig,
    // soon not needed anymore (for old headless validator)
    imsOrgId: aioConfigLoader.get(AIO_CONFIG_IMS_ORG_ID)
  }
}

/**
 *
 */
function loadUserConfig () {
  // TODO includes need to convert relative paths in included config !!!!

  if (!fs.existsSync(USER_CONFIG_FILE)) {
    // no error, support for legacy configuration
    return {}
  }

  const config = yaml.safeLoad(fs.readFileSync(USER_CONFIG_FILE, 'utf8'))

  // this code is traversing app.config.yaml recursively to resolve $includes directives
  const configCache = {}
  // alreadyIncluded is used for cycle detection
  const buildStackEntries = (obj, alreadyIncluded, filterKeys = null) =>
    Object.keys(obj)
      // only add filter keys if filter is defined
      .filter(key => !filterKeys || filterKeys.includes(key))
      .map(key => ({ parentObj: obj, alreadyIncluded, key }))
  const traverseStack = buildStackEntries(config, [USER_CONFIG_FILE])

  while (traverseStack.length > 0) {
    const { parentObj, key, alreadyIncluded } = traverseStack.pop()
    const value = parentObj[key]
    if (typeof value === 'object') {
      // value is object or array
      traverseStack.push(...buildStackEntries(value, alreadyIncluded))
      continue
    }
    if (key === INCLUDE_DIRECTIVE) {
      // $include: 'configFile', value is string pointing to config file
      const configFile = value
      // 1. check for include cycles
      if (alreadyIncluded.includes(configFile)) {
        throw new Error(`Detected '${INCLUDE_DIRECTIVE}' cycle: '${[...alreadyIncluded, configFile].toString()}', please make sure that your configuration has no cycles.`)
      }
      // 2. check if file exists
      if (!configCache[configFile] && !fs.existsSync(configFile)) {
        throw new Error(`${INCLUDE_DIRECTIVE}: ${configFile} cannot be resolved, please make sure the file exists.`)
      }
      // 3. delete the $include directive to be replaced
      delete parentObj[key]
      // 4. load the included file
      // Note the included file can in turn also have includes
      const loadedConfig = configCache[configFile] || yaml.safeLoad(fs.readFileSync(configFile, 'utf8'))
      if (Array.isArray(loadedConfig) || typeof loadedConfig !== 'object') {
        throw new Error(`'${INCLUDE_DIRECTIVE}: ${configFile}' does not resolve to an object. Including an array or primitive type config is not supported.`)
      }
      // 5. merge and set the configuration, fields defined in parentObj take precedence
      const resolvedObject = { ...loadedConfig, ...parentObj }
      Object.entries(resolvedObject).forEach(([k, v]) => { parentObj[k] = v })
      // 6. set the cache to avoid reading the file twice
      configCache[configFile] = loadedConfig
      // 7. add included to cycle detection, note the alreadyIncluded array should not be modified
      const newAlreadyIncluded = alreadyIncluded.concat(configFile)
      // 8. set new loop entries, only include new once
      traverseStack.push(...buildStackEntries(parentObj, newAlreadyIncluded, Object.keys(loadedConfig)))
    }
    // else primitive types: do nothing
  }
  return config
}

/**
 * @param userConfig
 * @param commonConfig
 */
function loadExtConfigs (userConfig, commonConfig) {
  const configs = {}
  if (userConfig.extension) {
    Object.entries(userConfig.extension).forEach(([extName, singleUserConfig]) => {
      const extTag = extName.replace(/\//g, '-') // used as folder in dist
      configs[extName] = loadSingleConfig(extTag, singleUserConfig, commonConfig)
      // extensions have an extra operations field
      configs[extName].operations = singleUserConfig.operations
      if (!configs[extName].operations) {
        throw new Error(`Missing 'operations' config field for extension point ${extName}`)
      }
    })
  }
  return configs
}

/**
 * @param userConfig
 * @param commonConfig
 */
function loadAppConfig (userConfig, commonConfig) {
  // legacy user app config: manifest.yaml, package.json, .aio.app
  const legacyAppConfig = loadLegacyUserAppConfig(commonConfig)
  userConfig.application = mergeUserAppConfigs(userConfig.application, legacyAppConfig)
  const fullAppConfig = loadSingleConfig('application', userConfig.application, commonConfig)
  if (!fullAppConfig.hasBackend && !fullAppConfig.hasFrontend) {
    // only set application config if there is an actuall app, meaning either some backend or frontend
    return {}
  }
  return { application: fullAppConfig }
}

/**
 * @param commonConfig
 */
function loadLegacyUserAppConfig (commonConfig) {
  // load legacy user app config from manifest.yaml, package.json, .aio.app

  // 1. load .aio.app config
  const appConfig = { ...commonConfig.aio.app }

  // 2. load legacy manifest.yaml
  appConfig.runtimeManifest = fs.existsSync(LEGACY_RUNTIME_MANIFEST) && yaml.safeLoad(fs.readFileSync(LEGACY_RUNTIME_MANIFEST, 'utf8'))

  // 3. load legacy hooks
  const pkgjsonscripts = commonConfig.packagejson.scripts
  if (pkgjsonscripts) {
    const hooks = {}
    // https://www.adobe.io/apis/experienceplatform/project-firefly/docs.html#!AdobeDocs/project-firefly/master/guides/app-hooks.md
    hooks['pre-app-build'] = pkgjsonscripts['pre-app-build']
    hooks['post-app-build'] = pkgjsonscripts['post-app-build']
    hooks['build-actions'] = pkgjsonscripts['build-actions']
    hooks['build-static'] = pkgjsonscripts['build-static']
    hooks['pre-app-deploy'] = pkgjsonscripts['pre-app-deploy']
    hooks['post-app-deploy'] = pkgjsonscripts['post-app-deploy']
    hooks['deploy-actions'] = pkgjsonscripts['deploy-actions']
    hooks['deploy-static'] = pkgjsonscripts['deploy-static']
    hooks['pre-app-undeploy'] = pkgjsonscripts['pre-app-undeploy']
    hooks['post-app-undeploy'] = pkgjsonscripts['post-app-undeploy']
    hooks['undeploy-actions'] = pkgjsonscripts['undeploy-actions']
    hooks['undeploy-static'] = pkgjsonscripts['undeploy-static']
    hooks['pre-app-run'] = pkgjsonscripts['pre-app-build']
    hooks['post-app-run'] = pkgjsonscripts['post-app-build']
    hooks['serve-static'] = pkgjsonscripts['serve-static']
    appConfig.hooks = hooks
  }

  return appConfig
}

/**
 * @param appConfig
 * @param legacyAppConfig
 */
function mergeUserAppConfigs (appConfig, legacyAppConfig) {
  if (!appConfig && !legacyAppConfig) {
    return null
  }

  // merge 1 level config fields, such as 'actions': 'path/to/actions', precedence for new config
  const merged = { ...legacyAppConfig, ...appConfig }

  // special cases if both are defined
  if (legacyAppConfig && appConfig) {
    // for simplicity runtimeManifest is not merged, it's one or the other
    if (legacyAppConfig.runtimeManifest && appConfig.runtimeManifest) {
      console.error(chalk.yellow('Warning: manifest.yml is ignored in favor of app.config.yaml \'runtimeManifest\' field.'))
    }
    // hooks are merged
    if (legacyAppConfig.hooks && appConfig.hooks) {
      merged.hooks = { ...legacyAppConfig.hooks, ...appConfig.hooks }
    }
  }

  return merged
}

/**
 * @param userConfig
 * @param configTag
 * @param singleUserConfig
 * @param commonConfig
 * @param preConfig
 */
function loadSingleConfig (configTag, singleUserConfig, commonConfig) {
  const absRoot = p => path.join(process.cwd(), p)
  // todo handle default path for config root ?

  const config = {
    app: {},
    ow: {},
    s3: {},
    web: {},
    manifest: {},
    actions: {},
    // root of the app folder
    root: process.cwd()
    // todo config root ?
  }

  const actions = path.normalize(singleUserConfig.actions || 'actions')
  const web = path.normalize(singleUserConfig.web || 'web-src')
  const dist = path.normalize(singleUserConfig.dist || 'dist')
  const manifest = singleUserConfig.runtimeManifest

  config.app.hasBackend = !!manifest
  config.app.hasFrontend = fs.existsSync(web)
  config.app.dist = dist

  // actions
  if (config.app.hasBackend) {
    config.actions.src = absRoot(actions)
    config.actions.dist = absRoot(path.join(dist, configTag, 'actions'))
    config.manifest = { src: 'manifest.yml' } // even if a legacy config path, it is required for runtime sync
    config.manifest.full = manifest
    config.manifest.packagePlaceholder = '__APP_PACKAGE__'
    config.manifest.package = config.manifest.full.packages[config.manifest.packagePlaceholder]
    if (config.manifest.package) {
      aioLogger.debug(`Use of ${config.manifest.packagePlaceholder} in manifest.yml.`)
    }
    // Note: we should set the config.manifest.package also if it's not using a placeholder
  }

  // web
  if (config.app.hasFrontend) {
    config.web.src = absRoot(web)
    config.web.injectedConfig = absRoot(path.join(web, 'src', 'config.json'))
    config.web.distDev = absRoot(path.join(dist, configTag, 'web-dev'))
    config.web.distProd = absRoot(path.join(dist, configTag, 'web-prod'))
    config.s3.credsCacheFile = absRoot('.aws.tmp.creds.json')
    config.s3.folder = commonConfig.ow.namespace

    if (singleUserConfig.awsaccesskeyid &&
      singleUserConfig.awssecretaccesskey &&
      singleUserConfig.s3bucket) {
      config.s3.creds = {
        accessKeyId: singleUserConfig.awsaccesskeyid,
        secretAccessKey: singleUserConfig.awssecretaccesskey,
        params: { Bucket: singleUserConfig.s3bucket }
      }
    }
    if (singleUserConfig.tvmurl !== defaultTvmUrl) {
      // Legacy applications set the defaultTvmUrl in .env, so we need to ignore it to not
      // consider it as custom. The default will be set downstream by aio-lib-core-tvm.
      config.s3.tvmUrl = singleUserConfig.tvmurl
    }
  }

  config.ow = commonConfig.ow
  config.app.defaultHostname = getCliEnv() === STAGE_ENV ? stageAppHostname : defaultAppHostname
  config.app.hostname = singleUserConfig.hostname || defaultAppHostname
  config.app.htmlCacheDuration = singleUserConfig.htmlcacheduration || defaultHTMLCacheDuration
  config.app.jsCacheDuration = singleUserConfig.jscacheduration || defaultJSCacheDuration
  config.app.cssCacheDuration = singleUserConfig.csscacheduration || defaultCSSCacheDuration
  config.app.imageCacheDuration = singleUserConfig.imagecacheduration || defaultImageCacheDuration
  config.hooks = singleUserConfig.hooks || {}

  config.imsOrgId = commonConfig.imsOrgId
  config.app.name = commonConfig.packagejson.name
  config.app.version = commonConfig.packagejson.version

  return config
}

/**
 *
 */
function loadPackageJson () {
  aioLogger.debug('checking package.json existence')
  utils.checkFile('package.json')
  return JSON.parse(fs.readFileSync('package.json'))
}

/** @private */
function getModuleName (packagejson) {
  if (packagejson && packagejson.name) {
    // turn "@company/myaction" into "myaction"
    // OpenWhisk does not allow `@` or `/` in an entity name
    return packagejson.name.split('/').pop()
  }
}
