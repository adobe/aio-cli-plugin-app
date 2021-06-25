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

// todo needs to be passed in as mock
const root = process.cwd()
const dataDir = 'fakeDir'

const packagejson = {
  version: '1.0.0',
  name: 'sample-app'
}

// fake
const imsOrgId = '00000000000000000100000@AdobeOrg'
const owCreds = {
  auth: 'xxxxxxxxxxxx:ttttttttttttttt',
  namespace: '123-project-workspace'
}

/** @private */
function fullFakeRuntimeManifest (pathToActionFolder) {
  return {
    packages: {
      mypackage: {
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
function oneActionRuntimeManifest (pathToActionFolder) {
  return {
    packages: {
      mypackage: {
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

const excActionsFolder = `${root}/src/dx-excshell-1/actions`
const excSingleConfig = {
  'dx/excshell/1': {
    app: {
      hasBackend: true,
      hasFrontend: true,
      dist: `${root}/dist/dx-excshell-1`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: 'sample-app',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'sample-app-0.0.1'
    },
    s3: {
      credsCacheFile: `${root}/.aws.tmp.creds.json`,
      folder: owCreds.namespace
    },
    web: {
      src: `${root}/src/dx-excshell-1/web-src`,
      injectedConfig: `${root}/src/dx-excshell-1/web-src/src/config.json`,
      distDev: `${root}/dist/dx-excshell-1/web-dev`,
      distProd: `${root}/dist/dx-excshell-1/web-prod`
    },
    manifest: {
      src: 'manifest.yml',
      full: oneActionRuntimeManifest(excActionsFolder),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: excActionsFolder,
      dist: `${root}/dist/dx-excshell-1/actions`
    },
    root: `${root}`,
    name: 'dx/excshell/1',
    hooks: {
      'post-app-deploy': 'echo hello'
    },
    imsOrgId,
    operations: {
      view: [
        {
          type: 'web',
          impl: 'index.html'
        }
      ]
    },
    cli: {
      dataDir
    }
  }
}

const nuiActionsFolder = `${root}/src/dx-asset-compute-worker-1/actions`
const nuiSingleConfig = {
  'dx/asset-compute/worker/1': {
    app: {
      hasBackend: true,
      hasFrontend: false,
      dist: `${root}/dist/dx-asset-compute-worker-1`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: 'sample-app',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'sample-app-0.0.1'
    },
    s3: {},
    web: {
      src: `${root}/src/dx-asset-compute-worker-1/web-src`
    },
    manifest: {
      src: 'manifest.yml',
      full: oneActionRuntimeManifest(nuiActionsFolder),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: nuiActionsFolder,
      dist: `${root}/dist/dx-asset-compute-worker-1/actions`
    },
    root: `${root}`,
    name: 'dx/asset-compute/worker/1',
    hooks: {
      'post-app-run': 'adobe-asset-compute devtool'
    },
    imsOrgId,
    operations: {
      worker: [
        {
          type: 'action',
          impl: 'dx-asset-compute-worker-1/worker'
        }
      ]
    },
    cli: {
      dataDir
    }
  }
}

const appActionsFolder = `${root}/myactions`
const applicationSingleConfig = {
  application: {
    app: {
      hasBackend: true,
      hasFrontend: true,
      dist: `${root}/dist/application`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: 'sample-app',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'sample-app-0.0.1'
    },
    s3: {
      credsCacheFile: `${root}/.aws.tmp.creds.json`,
      folder: owCreds.namespace
    },
    web: {
      src: `${root}/web-src`,
      injectedConfig: `${root}/web-src/src/config.json`,
      distDev: `${root}/dist/application/web-dev`,
      distProd: `${root}/dist/application/web-prod`
    },
    manifest: {
      src: 'manifest.yml',
      full: fullFakeRuntimeManifest(appActionsFolder),
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: appActionsFolder,
      dist: `${root}/dist/application/actions`
    },
    root: `${root}`,
    name: 'application',
    hooks: {
      'pre-app-run': 'echo hello'
    },
    imsOrgId,
    cli: {
      dataDir
    }
  }
}

const applicationNoActionsSingleConfig = {
  application: {
    app: {
      hasBackend: false,
      hasFrontend: true,
      dist: `${root}/dist/application`,
      defaultHostname: 'adobeio-static.net',
      hostname: 'adobeio-static.net',
      htmlCacheDuration: '60',
      jsCacheDuration: '604800',
      cssCacheDuration: '604800',
      imageCacheDuration: '604800',
      name: 'sample-app',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'sample-app-0.0.1'
    },
    s3: {
      credsCacheFile: `${root}/.aws.tmp.creds.json`,
      folder: owCreds.namespace
    },
    web: {
      src: `${root}/web-src`,
      injectedConfig: `${root}/web-src/src/config.json`,
      distDev: `${root}/dist/application/web-dev`,
      distProd: `${root}/dist/application/web-prod`
    },
    manifest: {},
    actions: {
      src: `${root}/actions`
    },
    root: `${root}`,
    name: 'application',
    hooks: {
      'pre-app-run': 'echo hello'
    },
    imsOrgId,
    cli: {
      dataDir
    }
  }
}

// expected return values from config loader for match fixtures in __fixtures__
module.exports = {
  // TODO s3 credentials, index, .., legacy
  exc: {
    all: { ...excSingleConfig },
    implements: [
      'dx/excshell/1'
    ],
    packagejson,
    root
  },
  app: {
    all: { ...applicationSingleConfig },
    implements: [
      'application'
    ],
    packagejson,
    root
  },
  appExcNui: {
    all: { ...excSingleConfig, ...nuiSingleConfig, ...applicationSingleConfig },
    implements: [
      'application',
      'dx/asset-compute/worker/1',
      'dx/excshell/1'
    ],
    packagejson,
    root
  },
  appNoActions: {
    all: { ...applicationNoActionsSingleConfig },
    implements: [
      'application'
    ],
    packagejson,
    root
  },
  excComplexIncludes: {
    all: { ...excSingleConfig },
    implements: [
      'dx/excshell/1'
    ],
    packagejson,
    root
  },
  legacyApp: {
    all: { ...applicationSingleConfig },
    implements: [
      'application'
    ],
    packagejson,
    root
  }
}
