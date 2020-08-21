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

const { stdout, stderr } = require('stdout-stderr')

const fs = require.requireActual('fs')
const eol = require('eol')
//const fs = require('fs')
const path = require('path')
const hjson = require('hjson')

const fileSystem = require('jest-plugin-fs').default

// quick normalization to test windows paths
global.n = p => path.normalize(p)
global.r = p => path.resolve(p)

// dont touch the real fs
global.mockFs = () => {
  jest.unmock('fs-extra')
  jest.mock('fs', () => require('jest-plugin-fs/mock'))

  // set the fake filesystem
  global.fakeFileSystem = {
    addJson: (json) => {
      // add to existing
      fileSystem.mock(json)
      // console.log(json)
    },
    removeKeys: (arr) => {
      // remove from existing
      const files = fileSystem.files()
      //console.log(Object.keys(files))
      for (const prop in files) {
        if (arr.includes(prop)) {
          delete files[prop]
        }
      }
      //console.log(Object.keys(files))
      fileSystem.restore()
      fileSystem.mock(files)
    },
    clear: () => {
      // reset to empty
      fileSystem.restore()
    },
    reset: () => {
      // reset file system
      // TODO: add any defaults
      fileSystem.restore()
    },
    files: () => {
      return fileSystem.files()
    }
  }
  // seed the fake filesystem
  fakeFileSystem.reset()
}

global.unmockFs = () => {

}

// trap console log
beforeEach(() => { stdout.start(); stderr.start() })
afterEach(() => { stdout.stop(); stderr.stop() })

process.on('unhandledRejection', error => {
  throw error
})

// dont touch the real fs
jest.mock('fs-extra')
// don't wait for user input in tests
jest.mock('inquirer')
// make sure we mock the app scripts
jest.mock('@adobe/aio-app-scripts')
//
jest.mock('ora')
//
jest.mock('which')
//
jest.mock('execa')

/* global fixtureFile, fixtureJson */

const fixturesFolder = path.join(__dirname, '__fixtures__')

// helper for fixtures
global.fixtureFile = (output) => {
  return fs.readFileSync(`${fixturesFolder}/${output}`).toString()
}

// helper for fixtures
global.fixtureJson = (output) => {
  return JSON.parse(fs.readFileSync(`${fixturesFolder}/${output}`).toString())
}

// helper for fixtures
global.fixtureHjson = (output) => {
  return hjson.parse(fs.readFileSync(`${fixturesFolder}/${output}`).toString())
}

// fixture matcher
expect.extend({
  toMatchFixture (received, argument) {
    const val = fixtureFile(argument)
    // eslint-disable-next-line jest/no-standalone-expect
    expect(eol.auto(received)).toEqual(eol.auto(val))
    return { pass: true }
  }
})

expect.extend({
  toMatchFixtureJson (received, argument) {
    const val = fixtureJson(argument)
    // eslint-disable-next-line jest/no-standalone-expect
    expect(received).toEqual(val)
    return { pass: true }
  }
})

expect.extend({
  toMatchFixtureHjson (received, argument) {
    const val = fixtureHjson(argument)
    // eslint-disable-next-line jest/no-standalone-expect
    expect(received).toEqual(val)
    return { pass: true }
  }
})

global.addSampleAppFiles = () => {
  global.fakeFileSystem.addJson({ 
    'actions/action-zip/index.js': global.fixtureFile('/sample-app/actions/action-zip/index.js'),
    'actions/action-zip/package.json': global.fixtureFile('/sample-app/actions/action-zip/package.json'),
    'actions/action.js': global.fixtureFile('/sample-app/actions/action.js'),
    'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
    'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
    'package.json': global.fixtureFile('/sample-app/package.json'),
  })
}

global.defaultAppHostName = 'adobeio-static.net'
global.defaultTvmUrl = 'https://adobeio.adobeioruntime.net/apis/tvm/'
global.defaultOwApiHost = 'https://adobeioruntime.net'
global.fakeS3Bucket = 'fake-bucket'
global.fakeConfig = {
  tvm: {
    runtime: {
      namespace: 'fake_ns',
      auth: 'fake:auth'
    }
  },
  local: {
    runtime: {
      // those must match the once set by dev cmd
      apihost: 'http://localhost:3233',
      namespace: 'guest',
      auth: '23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP'
    }
  },
  creds: {
    runtime: {
      namespace: 'fake_ns',
      auth: 'fake:auth'
    },
    cna: {
      s3bucket: 'customBucket',
      awsaccesskeyid: 'fakeAwsKeyId',
      awssecretaccesskey: 'fakeAwsSecretKey'
    }
  },
  cna: {
    htmlCacheDuration: 60,
    jsCacheDuration: 604800,
    cssCacheDuration: 604800,
    imageCacheDuration: 604800
  }
}

global.fakeTVMResponse = {
  sessionToken: 'fake',
  expiration: '1970-01-01T00:00:00.000Z',
  accessKeyId: 'fake',
  secretAccessKey: 'fake',
  params: { Bucket: global.fakeS3Bucket }
}

/* global.sampleAppConfig = {
  app: {
    hasFrontend: true,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app',
    hostname: 'adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        __APP_PACKAGE__: {
          license: 'Apache-2.0',
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:12'
            },
            'action-zip': {
              function: 'actions/action-zip',
              web: 'yes',
              runtime: 'nodejs:12'
            }
          },
          sequences: {
            'action-sequence': { actions: 'action, action-zip', web: 'yes' }
          },
          triggers: { trigger1: null },
          rules: {
            rule1: { trigger: 'trigger1', action: 'action', rule: true }
          },
          apis: {
            api1: {
              base: { path: { action: { method: 'get' } } }
            }
          },
          dependencies: { dependency1: { location: 'fake.com/package' } }
        }
      }
    },
    package: {
      license: 'Apache-2.0',
      actions: {
        action: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:12'
        },
        'action-zip': {
          function: 'actions/action-zip',
          web: 'yes',
          runtime: 'nodejs:12'
        }
      },
      sequences: {
        'action-sequence': { actions: 'action, action-zip', web: 'yes' }
      },
      triggers: { trigger1: null },
      rules: { rule1: { trigger: 'trigger1', action: 'action', rule: true } },
      apis: {
        api1: {
          base: { path: { action: { method: 'get' } } }
        }
      },
      dependencies: { dependency1: { location: 'fake.com/package' } }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
} */