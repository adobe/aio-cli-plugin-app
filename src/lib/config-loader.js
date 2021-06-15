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
  stageAppHostname,
  USER_CONFIG_FILE,
  LEGACY_RUNTIME_MANIFEST,
  INCLUDE_DIRECTIVE,
  LEGACY_CONFIG_REF,
  APPLICATION_CONFIG_KEY,
  EXTENSIONS_CONFIG_KEY
} = require('./defaults')

const {
  getCliEnv, /* function */
  STAGE_ENV /* string */
} = require('@adobe/aio-lib-env')

/**
 * loading config returns following object (this config is internal, not user facing):
 *  {
 *    aio: {...aioConfig...},
 *    packagejson: {...package.json...},
 *    all: {
 *      OPTIONAL:'application': {
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
 *    },
 *    OPTIONAL:'dx/asset-compute/worker/1': {
 *       ...same as above...
 *    },
 *    OPTIONAL:'dx/excshell/1': {
 *       ...same as above...
 *    },
 *  }
 */

module.exports = ({ allowNoImpl = false }) => {
  // configuration that is shared for application and each extension config
  // holds things like ow credentials, packagejson and aioConfig
  const commonConfig = loadCommonConfig()
  checkCommonConfig(commonConfig)

  // user configuration is specified in app.config.yaml and holds both standalone app and extension configuration
  // note that `$includes` directive will be resolved here
  const { config: userConfig, includeIndex } = loadUserConfig()

  // load the full standalone application and extension configurations
  const all = {
    ...loadAppConfig(userConfig, commonConfig),
    ...loadExtConfigs(userConfig, commonConfig)
  }

  const implements = Object.keys(all)
  if (!allowNoImpl && implements.length <= 0) {
    throw new Error(`Couldn't find configuration in '${process.cwd()}', make sure to add least one extension or a standalone app`)
  }

  return {
    all,
    implements, // e.g. 'dx/excshell/1', 'application'
    // includeIndex keeps a map from config keys to files that includes them and the relative key in the file.
    // e.g. 'extension.dx/excshell/1.runtimeManifest.packages' => { path: 'src/dx-excshell-1/ext.config.yaml', key: 'runtimeManifest.packages' }
    includeIndex,
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
 * @param commonConfig
 */
function checkCommonConfig (commonConfig) {
  if (!commonConfig.aio.project || !commonConfig.ow.auth) {
    throw new Error('Missing project configuration, import a valid Console configuration first via \'aio app use\'')
  }
}

/**
 *
 */
function loadUserConfig () {
  if (!fs.existsSync(USER_CONFIG_FILE)) {
    // no error, support for legacy configuration
    return {}
  }

  // this code is traversing app.config.yaml recursively to resolve all $includes directives

  // SETUP
  // the config with $includes to be resolved
  const config = yaml.safeLoad(fs.readFileSync(USER_CONFIG_FILE, 'utf8'))
  // keep an index that will map keys like 'extensions.abc.runtimeManifest' to the config file where there are defined
  const includeIndex = {}
  // keep a cache for common included files - avoid to read a same file twice
  const configCache = {}
  // stack entries to be added for new iterations
  /** @private */
  function buildStackEntries (obj, fullKeyParent, relativeFullKeyParent, includedFiles, filterKeys = null) {
    return Object.keys(obj || {})
      // include filtered keys only
      .filter(key => !filterKeys || filterKeys.includes(key))
      // parentObj will be filled with $includes files
      // includedFiles keep track of already included files, for cycle detection and building the index
      // key, if its $includes will be loaded, if array or object will be recursively followed
      // fullKey keeps track of all parents, used for building the index, relativeFullKey keeps track of the key in the included file
      .map(key => ({ parentObj: obj, includedFiles, key, fullKey: fullKeyParent.concat(`.${key}`), relativeFullKey: relativeFullKeyParent.concat(`.${key}`) }))
  }
  // start with top level object
  const traverseStack = buildStackEntries(config, '', '', [USER_CONFIG_FILE])

  // ITERATIONS
  // iterate until there are no entries
  while (traverseStack.length > 0) {
    const { parentObj, key, includedFiles, fullKey, relativeFullKey } = traverseStack.pop()

    // add full key to the index, slice(1) to remove initial dot
    includeIndex[fullKey.slice(1)] = {
      file: includedFiles[includedFiles.length - 1],
      key: relativeFullKey.slice(1)
    }

    const value = parentObj[key]

    if (typeof value === 'object') {
      // if value is an object or an array, add entries for to stack
      traverseStack.push(...buildStackEntries(value, fullKey, relativeFullKey, includedFiles))
      continue
    }

    if (key === INCLUDE_DIRECTIVE) {
      // $include: 'configFile', value is string pointing to config file
      const configFile = value
      // 1. check for include cycles
      if (includedFiles.includes(configFile)) {
        throw new Error(`Detected '${INCLUDE_DIRECTIVE}' cycle: '${[...includedFiles, configFile].toString()}', please make sure that your configuration has no cycles.`)
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
      const newAlreadyIncluded = includedFiles.concat(configFile)
      // 8. set new loop entries, only include new once, remove .$include from index key, reset relative key
      traverseStack.push(...buildStackEntries(parentObj, fullKey.split(`.${INCLUDE_DIRECTIVE}`).join(''), '', newAlreadyIncluded, Object.keys(loadedConfig)))
    }

    // else primitive types: do nothing
  }

  // RETURN
  // $includes are now resolved
  return { config, includeIndex }
}

/**
 * @param userConfig
 * @param commonConfig
 */
function loadExtConfigs (userConfig, commonConfig) {
  const configs = {}
  if (userConfig[EXTENSIONS_CONFIG_KEY]) {
    Object.entries(userConfig[EXTENSIONS_CONFIG_KEY]).forEach(([extName, singleUserConfig]) => {
      const extTag = extName.replace(/\//g, '-') // used as folder in dist
      configs[extName] = buildSingleConfig(extTag, singleUserConfig, commonConfig)
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
  const mergedUserAppConfig = mergeUserAppConfigs(userConfig[APPLICATION_CONFIG_KEY], legacyAppConfig)
  const fullAppConfig = {
    ...buildSingleConfig('application', mergedUserAppConfig, commonConfig),
    // keep track of fields that are legacy
    [LEGACY_CONFIG_REF]: legacyAppConfig
  }
  if (!fullAppConfig.app.hasBackend && !fullAppConfig.app.hasFrontend) {
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
  if (fs.existsSync(LEGACY_RUNTIME_MANIFEST)) {
    appConfig.runtimeManifest = yaml.safeLoad(fs.readFileSync(LEGACY_RUNTIME_MANIFEST, 'utf8'))
  }

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
    if (Object.keys(hooks).length > 0) {
      appConfig.hooks = hooks
    }
  }

  return appConfig
}

/**
 * @param userAppConfig
 * @param legacyUserAppConfig
 */
function mergeUserAppConfigs (userAppConfig, legacyUserAppConfig) {
  // merge 1 level config fields, such as 'actions': 'path/to/actions', precedence for new config
  const merged = { ...legacyUserAppConfig, ...userAppConfig }

  // special cases if both are defined
  if (legacyUserAppConfig && userAppConfig) {
    // for simplicity runtimeManifest is not merged, it's one or the other
    if (legacyUserAppConfig.runtimeManifest && userAppConfig.runtimeManifest) {
      console.error(chalk.yellow('Warning: manifest.yml is ignored in favor of app.config.yaml \'runtimeManifest\' field.'))
    }
    // hooks are merged
    if (legacyUserAppConfig.hooks && userAppConfig.hooks) {
      merged.hooks = { ...legacyUserAppConfig.hooks, ...userAppConfig.hooks }
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
function buildSingleConfig (configTag, singleUserConfig, commonConfig) {
  const absRoot = p => path.join(process.cwd(), p)
  const config = {
    app: {},
    ow: {},
    s3: {},
    web: {},
    manifest: {},
    actions: {},
    // root of the app folder
    root: process.cwd()
    // todo handle relative paths from included config files - would need to use index - carreful to legacy config
  }

  const actions = path.normalize(singleUserConfig.actions || 'actions')
  const web = path.normalize(singleUserConfig.web || 'web-src')
  const dist = path.normalize(singleUserConfig.dist || 'dist')
  const manifest = singleUserConfig.runtimeManifest

  config.app.hasBackend = !!manifest
  config.app.hasFrontend = fs.existsSync(web)
  config.app.dist = dist

  // actions
  config.actions.src = absRoot(actions) // needed for app add first action
  if (config.app.hasBackend) {
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
  config.web.src = absRoot(web) // needed for app add first web-assets
  if (config.app.hasFrontend) {
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
  config.app.hostname = singleUserConfig.hostname || config.app.defaultHostname
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
