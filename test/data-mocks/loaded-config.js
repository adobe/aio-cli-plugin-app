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

const upath = require('upath')
const root = '/'
// const dataDir = 'fakeDir'
const {
  excComplexIncludeIndex,
  appExcNuiIncludeIndex,
  appIncludeIndex,
  appNoActionsIncludeIndex,
  excIncludeIndex,
  legacyIncludeIndex
} = require('./loaded-config-include-indexes')

const packagejson = {
  version: '1.0.0',
  name: 'sample-app'
}

const ow = {
  // known later on
  auth: null,
  namespace: null,
  apihost: null,

  defaultApihost: 'https://adobeioruntime.net',
  apiversion: 'v1',
  package: `${packagejson.name}-${packagejson.version}`
}

/** @private */
function fullFakeRuntimeManifest (pathToActionFolder, pkgName1) {
  return {
    packages: {
      [pkgName1]: {
        license: 'Apache-2.0',
        actions: {
          action: {
            function: upath.toUnix(`${pathToActionFolder}/action.js`),
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
              'somefile.txt', 'file.txt'
            ],
            limits: {
              concurrency: 189
            }
          },
          'action-zip': {
            function: upath.toUnix(`${pathToActionFolder}/action-zip`),
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
            function: upath.toUnix(`${pathToActionFolder}/action.js`),
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
              'somefile.txt', 'file.txt'
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

const excActionsFolder = `${root}src/dx-excshell-1/actions`
const excSingleConfig = {
  'dx/excshell/1': {
    app: {
      hasBackend: true,
      hasFrontend: true,
      dist: `${root}dist/dx-excshell-1`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: packagejson.name,
      version: packagejson.version
    },
    ow,
    s3: {
      credsCacheFile: `${root}.aws.tmp.creds.json`
    },
    web: {
      src: `${root}src/dx-excshell-1/web-src`,
      injectedConfig: `${root}src/dx-excshell-1/web-src/src/config.json`,
      distDev: `${root}dist/dx-excshell-1/web-dev`,
      distProd: `${root}dist/dx-excshell-1/web-prod`
    },
    manifest: {
      src: 'manifest.yml',
      full: oneActionRuntimeManifest(excActionsFolder, 'my-exc-package'),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: excActionsFolder,
      dist: `${root}dist/dx-excshell-1/actions`
    },
    root: `${root}`,
    name: 'dx/excshell/1',
    hooks: {
      'post-app-deploy': 'echo hello'
    },
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

const nuiActionsFolder = `${root}src/dx-asset-compute-worker-1/actions`
const nuiSingleConfig = {
  'dx/asset-compute/worker/1': {
    app: {
      hasBackend: true,
      hasFrontend: false,
      dist: `${root}dist/dx-asset-compute-worker-1`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: packagejson.name,
      version: packagejson.version
    },
    ow,
    s3: {},
    web: {
      src: `${root}src/dx-asset-compute-worker-1/web-src`
    },
    manifest: {
      src: 'manifest.yml',
      full: oneActionRuntimeManifest(nuiActionsFolder, 'my-nui-package'),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: nuiActionsFolder,
      dist: `${root}dist/dx-asset-compute-worker-1/actions`
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

const appActionsFolder = `${root}myactions`
const applicationSingleConfig = {
  application: {
    app: {
      hasBackend: true,
      hasFrontend: true,
      dist: `${root}dist/application`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: packagejson.name,
      version: packagejson.version
    },
    ow,
    s3: {
      credsCacheFile: `${root}.aws.tmp.creds.json`
    },
    web: {
      src: `${root}web-src`,
      injectedConfig: `${root}web-src/src/config.json`,
      distDev: `${root}dist/application/web-dev`,
      distProd: `${root}dist/application/web-prod`
    },
    manifest: {
      src: 'manifest.yml',
      full: fullFakeRuntimeManifest(appActionsFolder, 'my-app-package'),
      packagePlaceholder: '__APP_PACKAGE__',
      package: undefined
    },
    actions: {
      src: appActionsFolder,
      dist: `${root}dist/application/actions`
    },
    root: `${root}`,
    name: 'application',
    hooks: {
      'post-app-run': 'echo hello'
    }
  }
}

const legacyManifest = fullFakeRuntimeManifest(appActionsFolder, '__APP_PACKAGE_')
const applicationLegacyConfig = {
  ...applicationSingleConfig,
  manifest: {
    ...applicationSingleConfig.manifest,
    full: legacyManifest,
    package: legacyManifest.packages.__APP_PACKAGE_
  }
}

const applicationNoActionsSingleConfig = {
  application: {
    app: {
      hasBackend: false,
      hasFrontend: true,
      dist: `${root}dist/application`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: packagejson.name,
      version: packagejson.version
    },
    ow,
    s3: {
      credsCacheFile: `${root}.aws.tmp.creds.json`
    },
    web: {
      src: `${root}web-src`,
      injectedConfig: `${root}web-src/src/config.json`,
      distDev: `${root}dist/application/web-dev`,
      distProd: `${root}dist/application/web-prod`
    },
    manifest: {},
    actions: {
      src: `${root}actions`
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
    packagejson,
    root
  },
  app: {
    all: { ...applicationSingleConfig },
    implements: [
      'application'
    ],
    includeIndex: appIncludeIndex,
    packagejson,
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
    packagejson,
    root
  },
  'app-no-actions': {
    all: { ...applicationNoActionsSingleConfig },
    implements: [
      'application'
    ],
    includeIndex: appNoActionsIncludeIndex,
    packagejson,
    root
  },
  'exc-complex-includes': {
    all: { ...excSingleConfig },
    implements: [
      'dx/excshell/1'
    ],
    includeIndex: excComplexIncludeIndex,
    packagejson,
    root
  },
  'legacy-app': {
    all: { ...applicationLegacyConfig },
    implements: [
      'application'
    ],
    includeIndex: legacyIncludeIndex,
    packagejson,
    root
  }
}

// get config for fixture - that works
module.exports = (appFixtureName, mockedAIOConfig) => {
  // set some more bits based on aio config - kind of ugly, do better
  ow.auth = mockedAIOConfig.runtime.auth
  ow.namespace = mockedAIOConfig.runtime.namespace
  ow.apihost = mockedAIOConfig.runtime.apihost
  const config = expectedConfigs[appFixtureName]
  Object.values(config.all).forEach(v => {
    if (v.app.hasFrontend) {
      v.s3.folder = ow.namespace
    }
    v.imsOrgId = mockedAIOConfig.project.org.ims_org_id
  })
  return {
    ...expectedConfigs[appFixtureName],
    aio: mockedAIOConfig
  }
}