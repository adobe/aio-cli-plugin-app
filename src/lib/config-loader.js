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
  APPLICATION_CONFIG_KEY,
  EXTENSIONS_CONFIG_KEY
} = require('./defaults')

const {
  getCliEnv, /* function */
  STAGE_ENV /* string */
} = require('@adobe/aio-lib-env')
const cloneDeep = require('lodash.clonedeep')

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
  // also this will load and merge the standalone legacy configuration system if any
  const { config: userConfig, includeIndex } = loadUserConfig(commonConfig)

  // load the full standalone application and extension configurations
  const all = buildAllConfigs(userConfig, commonConfig, includeIndex)

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

/** @private */
function loadCommonConfig () {
  // load aio config (mostly runtime and console config)
  aioConfigLoader.reload()
  const aioConfig = aioConfigLoader.get() || {}

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

/** @private */
function checkCommonConfig (commonConfig) {
  // todo this depends on the commands, expose a throwOnMissingConsoleInfo ?
  // if (!commonConfig.aio.project || !commonConfig.ow.auth) {
  //   throw new Error('Missing project configuration, import a valid Console configuration first via \'aio app use\'')
  // }
}

/** @private */
function loadUserConfig (commonConfig) {
  const { config: legacyConfig, includeIndex: legacyIncludeIndex } = loadUserConfigLegacy(commonConfig)
  const { config, includeIndex } = loadUserConfigAppYaml()

  const ret = {}
  // include legacy application configuration
  ret.config = mergeLegacyUserConfig(config, legacyConfig)
  // merge includeIndexes, new config index takes precedence
  ret.includeIndex = { ...legacyIncludeIndex, ...includeIndex }

  return ret
}

/** @private */
function loadUserConfigAppYaml () {
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

/** @private */
function loadUserConfigLegacy (commonConfig) {
  // load legacy user app config from manifest.yaml, package.json, .aio.app
  const includeIndex = {}
  const legacyAppConfig = {}

  // 1. load .aio.app config
  if (commonConfig.aio.cna !== undefined || commonConfig.aio.app !== undefined) {
    warn('App config in \'.aio\' file is deprecated. Please move your \'.aio.app\' or \'.aio.cna\' to \'app.config.yaml\'.')
    const appConfig = { ...commonConfig.aio.app, ...commonConfig.aio.cna }
    Object.entries(appConfig).map(([k, v]) => {
      legacyAppConfig[k] = v
      includeIndex[`${APPLICATION_CONFIG_KEY}.${k}`] = { file: '.aio', key: `app.${k}` }
    })
  }
  // 2. load legacy manifest.yaml
  if (fs.existsSync(LEGACY_RUNTIME_MANIFEST)) {
    warn('\'manifest.yaml\' is deprecated. Please move your manifest to \'app.config.yaml\' under the \'runtimeManifest\' key')
    const runtimeManifest = yaml.safeLoad(fs.readFileSync(LEGACY_RUNTIME_MANIFEST, 'utf8'))
    legacyAppConfig.runtimeManifest = runtimeManifest
    // populate index
    const baseKey = `${APPLICATION_CONFIG_KEY}.runtimeManifest`
    const stack = Object.keys(runtimeManifest).map(rtk => ({ key: rtk, parent: runtimeManifest, fullKey: '' }))
    while (stack.length > 0) {
      const { key, parent, fullKey } = stack.pop()
      const newFullKey = fullKey.concat(`.${key}`)
      includeIndex[baseKey + newFullKey] = { file: 'manifest.yaml', key: newFullKey }
      if (typeof parent[key] === 'object') {
        // includes arrays
        stack.push(...Object.keys(parent[key]).map(rtk => ({ key: rtk, parent: parent[key], fullKey: newFullKey })))
      }
    }
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
    const keys = Object.entries(hooks).filter(([k, v]) => !!v).map(([k, v]) => k)
    if (keys.length > 0) {
      warn('hooks in \'package.json\' are deprecated. Please move your hooks to \'app.config.yaml\' under the \'hooks\' key')
      legacyAppConfig.hooks = hooks
      // build index
      keys.forEach((hk) => {
        const fullKey = `${APPLICATION_CONFIG_KEY}.hooks.${hk}`
        includeIndex[fullKey] = {
          file: 'package.json',
          key: `scripts.${hk}`
        }
      })
    }
  }

  return { includeIndex, config: { [APPLICATION_CONFIG_KEY]: legacyAppConfig } }
}

/** @private */
function mergeLegacyUserConfig (userConfig, legacyUserConfig) {
  // NOTE: here we do a simplified merge, deep merge with copy might be wanted in future

  // only need to merge application configs as legacy config system only works for standalone apps
  const userConfigApp = userConfig[APPLICATION_CONFIG_KEY]
  const legacyUserConfigApp = legacyUserConfig[APPLICATION_CONFIG_KEY]

  // merge 1 level config fields, such as 'actions': 'path/to/actions', precedence for new config
  const mergedApp = { ...legacyUserConfigApp, ...userConfigApp }

  // special cases if both are defined
  if (legacyUserConfigApp && userConfigApp) {
    // for simplicity runtimeManifest is not merged, it's one or the other
    if (legacyUserConfigApp.runtimeManifest && userConfigApp.runtimeManifest) {
      warn('\'manifest.yml\' is ignored in favor of key \'runtimeManifest\' in \'app.config.yaml\'.')
    }
    // hooks are merged
    if (legacyUserConfigApp.hooks && userConfigApp.hooks) {
      mergedApp.hooks = { ...legacyUserConfigApp.hooks, ...userConfigApp.hooks }
    }
  }

  return {
    ...userConfig,
    [APPLICATION_CONFIG_KEY]: mergedApp
  }
}
/** @private */
function buildAllConfigs (userConfig, commonConfig, includeIndex) {
  return {
    ...buildAppConfig(userConfig, commonConfig, includeIndex),
    ...buildExtConfigs(userConfig, commonConfig, includeIndex)
  }
}

/** @private */
function buildExtConfigs (userConfig, commonConfig, includeIndex) {
  const configs = {}
  if (userConfig[EXTENSIONS_CONFIG_KEY]) {
    Object.entries(userConfig[EXTENSIONS_CONFIG_KEY]).forEach(([extName, singleUserConfig]) => {
      configs[extName] = buildSingleConfig(extName, singleUserConfig, commonConfig, includeIndex)
      // extensions have an extra operations field
      configs[extName].operations = singleUserConfig.operations
      if (!configs[extName].operations) {
        throw new Error(`Missing 'operations' config field for extension point ${extName}`)
      }
    })
  }
  return configs
}

/** @private */
function buildAppConfig (userConfig, commonConfig, includeIndex) {
  const fullAppConfig = buildSingleConfig(APPLICATION_CONFIG_KEY, userConfig[APPLICATION_CONFIG_KEY], commonConfig, includeIndex)

  if (!fullAppConfig.app.hasBackend && !fullAppConfig.app.hasFrontend) {
    // only set application config if there is an actuall app, meaning either some backend or frontend
    return {}
  }
  return { [APPLICATION_CONFIG_KEY]: fullAppConfig }
}

/** @private */
function buildSingleConfig (configName, singleUserConfig, commonConfig, includeIndex) {
  const absRoot = p => path.join(process.cwd(), p)

  // used as subfolder folder in dist, converts to a single dir, e.g. dx/excshell/1 =>
  // dx-excshell-1 and dist/dx-excshell-1/actions/action-xyz.zip
  const subFolderName = configName.replace(/\//g, '-')
  const fullKeyPrefix = configName === APPLICATION_CONFIG_KEY ? APPLICATION_CONFIG_KEY : `${EXTENSIONS_CONFIG_KEY}.${configName}`

  const config = {
    app: {},
    ow: {},
    s3: {},
    web: {},
    manifest: {},
    actions: {},
    // root of the app folder
    root: process.cwd(),
    name: configName
  }

  if (!includeIndex[fullKeyPrefix]) {
    // config does not exist, return empty config
    return config
  }

  const defaultActionPath = pathConfigValueToRelRoot('actions/', fullKeyPrefix, includeIndex) // relative to config file holding parent object
  const defaultWebPath = pathConfigValueToRelRoot('web-src/', fullKeyPrefix, includeIndex) // relative to config file holding parent object
  const defaultDistPath = 'dist/' // relative to root

  const actions = pathConfigValueToRelRoot(singleUserConfig.actions, fullKeyPrefix + '.actions', includeIndex) || defaultActionPath
  const web = pathConfigValueToRelRoot(singleUserConfig.web, fullKeyPrefix + '.web', includeIndex) || defaultWebPath
  const dist = pathConfigValueToRelRoot(singleUserConfig.dist, fullKeyPrefix + '.dist', includeIndex) || defaultDistPath

  const manifest = singleUserConfig.runtimeManifest

  config.app.hasBackend = !!manifest
  config.app.hasFrontend = fs.existsSync(web)
  config.app.dist = absRoot(path.join(dist, dist === defaultDistPath ? subFolderName : ''))

  // actions
  config.actions.src = absRoot(actions)// needed for app add first action
  if (config.app.hasBackend) {
    config.actions.dist = path.join(config.app.dist, 'actions')
    config.manifest = { src: 'manifest.yml' } // even if a legacy config path, it is required for runtime sync
    config.manifest.full = rewriteRuntimeManifestPathsToRelRoot(manifest, fullKeyPrefix + '.runtimeManifest', includeIndex)
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
    // only add subfolder name if dist is default value
    config.web.distDev = path.join(config.app.dist, 'web-dev')
    config.web.distProd = path.join(config.app.dist, 'web-prod')
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

/** @private */
function rewriteRuntimeManifestPathsToRelRoot (manifestConfig = {}, fullKeyToManifest, includeIndex) {
  const manifestCopy = cloneDeep(manifestConfig)

  Object.entries(manifestCopy.packages || {}).forEach(([pkgName, pkg = {}]) => {
    Object.entries(pkg.actions || {}).forEach(([actionName, action]) => {
      const fullKeyToAction = `${fullKeyToManifest}.packages.${pkgName}.actions.${actionName}`
      if (action.function) {
        action.function = pathConfigValueToRelRoot(action.function, fullKeyToAction + '.function', includeIndex)
      }
      if (action.include) {
        action.include.forEach((arr, i) => {
          action.include[i][0] = pathConfigValueToRelRoot(action.include[i][0], fullKeyToAction + `.include.${i}.0`, includeIndex)
        })
      }
    })
  })

  return manifestCopy
}

// Because of the $include directives, config paths (e.g actions: './path/to/actions') can
// be relative to config files in any subfolder. Config keys that define path values are
// identified and their value is rewritten relative to the root folder.
/** @private */
function pathConfigValueToRelRoot (pathValue, fullKeyToPathValue, includeIndex) {
  if (!pathValue) {
    return undefined
  }
  // if path value is defined and fullKeyToPathValyue is correct then index has an entry
  const configPath = includeIndex[fullKeyToPathValue].file
  return path.join(path.dirname(configPath), pathValue)
}

/** @private */
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

/** @private */
function warn (message) {
  console.error(chalk.redBright(chalk.bold('Warning: ' + message)))
}
