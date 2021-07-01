/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const path = require('path')
const winCompat = p => {
  p = path.normalize(p)
  if (p.startsWith('/') && process.platform === 'win32') {
    return 'C:' + p
  }
  return p
}

const cloneDeep = require('lodash.clonedeep')
const root = winCompat('/')
// const dataDir = 'fakeDir'
const {
  excComplexIncludeIndex,
  appExcNuiIncludeIndex,
  appIncludeIndex,
  appNoActionsIncludeIndex,
  excIncludeIndex,
  legacyIncludeIndex
} = require('./config-loader-include-index')

const ow = {
  defaultApihost: 'https://adobeioruntime.net',
  apihost: 'https://adobeioruntime.net',
  apiversion: 'v1'
}

/** @private */
function fullFakeRuntimeManifest (pathToActionFolder, pkgName1) {
  return {
    packages: {
      [pkgName1]: {
        license: 'Apache-2.0',
        actions: {
          action: {
            function: winCompat(`${pathToActionFolder}/action.js`),
            web: 'yes',
            runtime: 'nodejs:14',
            inputs: {
              LOG_LEVEL: 'debug'
            },
            annotations: {
              'require-adobe-auth': true,
              final: true
            },
            include: [
              [winCompat(`${pathToActionFolder}/somefile.txt`), 'file.txt']
            ],
            limits: {
              concurrency: 189
            }
          },
          'action-zip': {
            function: winCompat(`${pathToActionFolder}/action-zip`),
            web: 'yes',
            runtime: 'nodejs:14'
          }
        },
        sequences: {
          'action-sequence': {
            actions: 'action, action-zip',
            web: 'yes'
          }
        },
        triggers: {
          trigger1: null
        },
        rules: {
          rule1: {
            trigger: 'trigger1',
            action: 'action',
            rule: true
          }
        },
        apis: {
          api1: {
            base: {
              path: {
                action: {
                  method: 'get'
                }
              }
            }
          }
        },
        dependencies: {
          dependency1: {
            location: 'fake.com/package'
          }
        }
      }
    }
  }
}

/** @private */
function oneActionRuntimeManifest (pathToActionFolder, pkgName1) {
  return {
    packages: {
      [pkgName1]: {
        license: 'Apache-2.0',
        actions: {
          action: {
            function: winCompat(`${pathToActionFolder}/action.js`),
            web: 'yes',
            runtime: 'nodejs:14',
            inputs: {
              LOG_LEVEL: 'debug'
            },
            annotations: {
              'require-adobe-auth': true,
              final: true
            },
            include: [
              [`${pathToActionFolder}/somefile.txt`, 'file.txt']
            ],
            limits: {
              concurrency: 189
            }
          }
        }
      }
    }
  }
}

const excActionsFolder = winCompat(`${root}src/dx-excshell-1/actions`)
const excSingleConfig = {
  'dx/excshell/1': {
    app: {
      hasBackend: true,
      hasFrontend: true,
      dist: winCompat(`${root}dist/dx-excshell-1`),
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800'
    },
    ow,
    s3: {
      credsCacheFile: winCompat(`${root}.aws.tmp.creds.json`)
    },
    web: {
      src: winCompat(`${root}src/dx-excshell-1/web-src`),
      injectedConfig: winCompat(`${root}src/dx-excshell-1/web-src/src/config.json`),
      distDev: winCompat(`${root}dist/dx-excshell-1/web-dev`),
      distProd: winCompat(`${root}dist/dx-excshell-1/web-prod`)
    },
    manifest: {
      src: 'manifest.yml',
      full: oneActionRuntimeManifest(excActionsFolder, 'my-exc-package'),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: excActionsFolder,
      dist: winCompat(`${root}dist/dx-excshell-1/actions`)
    },
    root: `${root}`,
    name: 'dx/excshell/1',
    hooks: {},
    operations: {
      view: [
        {
          type: 'web',
          impl: 'index.html'
        }
      ]
    }
  }
}

const nuiActionsFolder = winCompat(`${root}src/dx-asset-compute-worker-1/actions`)
const nuiSingleConfig = {
  'dx/asset-compute/worker/1': {
    app: {
      hasBackend: true,
      hasFrontend: false,
      dist: winCompat(`${root}dist/dx-asset-compute-worker-1`),
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800'
    },
    ow,
    s3: {},
    web: {
      src: winCompat(`${root}src/dx-asset-compute-worker-1/web-src`)
    },
    manifest: {
      src: 'manifest.yml',
      full: oneActionRuntimeManifest(nuiActionsFolder, 'my-nui-package'),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: nuiActionsFolder,
      dist: winCompat(`${root}dist/dx-asset-compute-worker-1/actions`)
    },
    root: `${root}`,
    name: 'dx/asset-compute/worker/1',
    hooks: {
      'post-app-run': 'adobe-asset-compute devtool'
    },
    operations: {
      worker: [
        {
          type: 'action',
          impl: 'my-nui-package/action'
        }
      ]
    }
  }
}

const appActionsFolder = winCompat(`${root}myactions`)
const applicationSingleConfig = {
  application: {
    app: {
      hasBackend: true,
      hasFrontend: true,
      dist: winCompat(`${root}dist/application`),
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800'
    },
    ow,
    s3: {
      credsCacheFile: winCompat(`${root}.aws.tmp.creds.json`)
    },
    web: {
      src: winCompat(`${root}web-src`),
      injectedConfig: winCompat(`${root}web-src/src/config.json`),
      distDev: winCompat(`${root}dist/application/web-dev`),
      distProd: winCompat(`${root}dist/application/web-prod`)
    },
    manifest: {
      src: 'manifest.yml',
      full: fullFakeRuntimeManifest(appActionsFolder, 'my-app-package'),
      packagePlaceholder: '__APP_PACKAGE__',
      package: undefined
    },
    actions: {
      src: appActionsFolder,
      dist: winCompat(`${root}dist/application/actions`)
    },
    root: `${root}`,
    name: 'application',
    hooks: {
      'post-app-run': 'echo hello'
    }
  }
}

const legacyManifest = fullFakeRuntimeManifest(appActionsFolder, '__APP_PACKAGE__')
const applicationLegacyConfig = {
  application: {
    ...applicationSingleConfig.application,
    manifest: {
      ...applicationSingleConfig.application.manifest,
      full: legacyManifest,
      package: legacyManifest.packages.__APP_PACKAGE__
    }
  }
}

const applicationNoActionsSingleConfig = {
  application: {
    app: {
      hasBackend: false,
      hasFrontend: true,
      dist: winCompat(`${root}dist/application`),
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800'
    },
    ow,
    s3: {
      credsCacheFile: winCompat(`${root}.aws.tmp.creds.json`)
    },
    web: {
      src: winCompat(`${root}web-src`),
      injectedConfig: winCompat(`${root}web-src/src/config.json`),
      distDev: winCompat(`${root}dist/application/web-dev`),
      distProd: winCompat(`${root}dist/application/web-prod`)
    },
    manifest: {},
    actions: {
      src: winCompat(`${root}actions`)
    },
    root: `${root}`,
    name: 'application',
    hooks: {
      'pre-app-run': 'echo hello'
    }
  }
}

// expected return values from config loader for matching fixtures in __fixtures__
const expectedConfigs = {
  exc: {
    all: { ...excSingleConfig },
    implements: [
      'dx/excshell/1'
    ],
    includeIndex: excIncludeIndex,
    packagejson: {
      version: '1.0.0',
      name: 'exc'
    },
    root
  },
  app: {
    all: { ...applicationSingleConfig },
    implements: [
      'application'
    ],
    includeIndex: appIncludeIndex,
    packagejson: {
      version: '1.0.0',
      name: 'app'
    },
    root
  },
  'app-exc-nui': {
    all: { ...excSingleConfig, ...nuiSingleConfig, ...applicationSingleConfig },
    implements: [
      'application',
      'dx/asset-compute/worker/1',
      'dx/excshell/1'
    ],
    includeIndex: appExcNuiIncludeIndex,
    packagejson: {
      version: '1.0.0',
      name: 'app-exc-nui'
    },
    root
  },
  'app-no-actions': {
    all: { ...applicationNoActionsSingleConfig },
    implements: [
      'application'
    ],
    includeIndex: appNoActionsIncludeIndex,
    packagejson: {
      version: '1.0.0',
      name: 'app-no-actions'
    },
    root
  },
  'exc-complex-includes': {
    all: { ...excSingleConfig },
    implements: [
      'dx/excshell/1'
    ],
    includeIndex: excComplexIncludeIndex,
    packagejson: {
      version: '1.0.0',
      name: 'exc-complex-includes'
    },
    root
  },
  'legacy-app': {
    all: { ...applicationLegacyConfig },
    implements: [
      'application'
    ],
    includeIndex: legacyIncludeIndex,
    packagejson: {
      version: '1.0.0',
      name: 'legacy-app',
      scripts: {
        'post-app-run': 'echo hello'
      }
    },
    root
  }
}

// get config for fixture - that works
module.exports = (appFixtureName, mockedAIOConfig, rewriteMockConfig = {}) => {
  // important deepCopy to modify mock
  const config = cloneDeep(expectedConfigs[appFixtureName])

  // set some more bits based on aio config
  Object.keys(config.all).forEach(k => {
    if (mockedAIOConfig && mockedAIOConfig.runtime) {
      if (config.all[k].app.hasFrontend) {
        config.all[k].s3.folder = mockedAIOConfig.runtime.namespace
      }
      config.all[k].ow.auth = mockedAIOConfig.runtime.auth
      config.all[k].ow.namespace = mockedAIOConfig.runtime.namespace
      config.all[k].ow.apihost = mockedAIOConfig.runtime.apihost || config.all[k].ow.apihost
    }
    if (mockedAIOConfig && mockedAIOConfig.project && mockedAIOConfig.project.org) {
      config.all[k].imsOrgId = mockedAIOConfig.project.org.ims_org_id
    }
    config.all[k].ow.package = `${config.packagejson.name}-${config.packagejson.version}`
    config.all[k].app.name = config.packagejson.name
    config.all[k].app.version = config.packagejson.version
  })

  // apply extra configuration e.g. { packagejson.name: 'another', all.dx/excshell/1.app.name: 'another' }
  Object.entries(rewriteMockConfig).forEach(([k, v]) => {
    const keys = k.split('.')
    const parentObj = keys.slice(0, -1).reduce((obj, k) => {
      if (!obj[k]) {
        obj[k] = {}
      }
      return obj[k]
    }, config)
    if (parentObj) {
      parentObj[keys.slice(-1)] = v
    }
  })
  return {
    ...config,
    aio: mockedAIOConfig
  }
}
