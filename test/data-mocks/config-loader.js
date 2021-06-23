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

// todo needs to be passed in as mock
const root = process.cwd()
const dataDir = 'fakeDir'

// fake
const imsOrgId = '00000000000000000100000@AdobeOrg'
const owCreds = {
  auth: 'xxxxxxxxxxxx:ttttttttttttttt',
  namespace: '123-project-workspace'
}

const excshellSingleConfig = {
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
      name: 'NEWTESTPOCEXTREG',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'NEWTESTPOCEXTREG-0.0.1'
    },
    s3: {
      credsCacheFile: `${root}/.aws.tmp.creds.json`,
      folder: 'development-918-newtestpocextreg'
    },
    web: {
      src: `${root}/src/dx-excshell-1/web-src`,
      injectedConfig: `${root}/src/dx-excshell-1/web-src/src/config.json`,
      distDev: `${root}/dist/dx-excshell-1/web-dev`,
      distProd: `${root}/dist/dx-excshell-1/web-prod`
    },
    manifest: {
      src: 'manifest.yml',
      full: {
        packages: {
          'dx-excshell-1': {
            license: 'Apache-2.0',
            actions: {
              generic: {
                function: `${root}/src/dx-excshell-1/actions/generic/index.js`,
                web: 'yes',
                runtime: 'nodejs:14',
                inputs: {
                  LOG_LEVEL: 'debug'
                },
                annotations: {
                  final: true
                }
              }
            }
          }
        }
      },
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: `${root}/src/dx-excshell-1/actions`,
      dist: `${root}/dist/dx-excshell-1/actions`
    },
    root: `${root}`,
    name: 'dx/excshell/1',
    hooks: {},
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

const assetComputeSingleConfig = {
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
      name: 'NEWTESTPOCEXTREG',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'NEWTESTPOCEXTREG-0.0.1'
    },
    s3: {},
    web: {
      src: `${root}/src/dx-asset-compute-worker-1/web-src`
    },
    manifest: {
      src: 'manifest.yml',
      full: {
        packages: {
          'dx-asset-compute-worker-1': {
            license: 'Apache-2.0',
            actions: {
              worker: {
                function: `${root}/src/dx-asset-compute-worker-1/actions/worker/index.js`,
                web: 'yes',
                runtime: 'nodejs:14',
                limits: {
                  concurrency: 10
                },
                annotations: {
                  'require-adobe-auth': true
                }
              }
            }
          }
        }
      },
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: `${root}/src/dx-asset-compute-worker-1/actions`,
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
      name: 'NEWTESTPOCEXTREG',
      version: '0.0.1'
    },
    ow: {
      ...owCreds,
      apihost: 'https://adobeioruntime.net',
      defaultApihost: 'https://adobeioruntime.net',
      apiversion: 'v1',
      package: 'NEWTESTPOCEXTREG-0.0.1'
    },
    s3: {
      credsCacheFile: `${root}/.aws.tmp.creds.json`,
      folder: 'development-918-newtestpocextreg-stage'
    },
    web: {
      src: `${root}/web-src`,
      injectedConfig: `${root}/web-src/src/config.json`,
      distDev: `${root}/dist/application/web-dev`,
      distProd: `${root}/dist/application/web-prod`
    },
    manifest: {
      src: 'manifest.yml',
      full: {
        packages: {
          demoappassetcompute: {
            license: 'Apache-2.0',
            actions: {
              analytics: {
                function: `${root}/actions/analytics/index.js`,
                web: 'yes',
                runtime: 'nodejs:14',
                inputs: {
                  LOG_LEVEL: 'debug',
                  companyId: '$ANALYTICS_COMPANY_ID',
                  apiKey: '$SERVICE_API_KEY'
                },
                annotations: {
                  'require-adobe-auth': true,
                  final: true
                }
              }
            }
          }
        }
      },
      packagePlaceholder: '__APP_PACKAGE__'
    },
    actions: {
      src: `${root}/actions`,
      dist: `${root}/dist/application/actions`
    },
    root: `${root}`,
    name: 'application',
    hooks: {},
    imsOrgId,
    cli: {
      dataDir
    }
  }
}

const packagejson = {
  version: '1.0.0',
  name: 'sample-app'
}

// expected return values from config loader for match fixtures in __fixtures__
module.exports = {
  // TODO s3 credentials, index, .., legacy
  app1: {
    all: { ...excshellSingleConfig },
    implements: [
      'dx/excshell/1'
    ],
    packagejson,
    root
  },
  app2: {
    all: { ...applicationSingleConfig },
    implements: [
      'application'
    ],
    packagejson,
    root
  },
  app3: {
    all: { ...excshellSingleConfig, ...assetComputeSingleConfig, ...applicationSingleConfig },
    implements: [
      'application',
      'dx/asset-compute/worker/1',
      'dx/excshell/1'
    ],
    packagejson,
    root
  }
  legacy: {

  }
}

