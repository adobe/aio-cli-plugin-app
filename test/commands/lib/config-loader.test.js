/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

global.mockFs()
const { loadConfig } = require('../../../src/lib/config-loader')
const mockAIOConfig = require('@adobe/aio-lib-core-config')
const yaml = require('js-yaml')
const path = require('path')

// const chalk = require('chalk')
// const defaults = require('../../../src/lib/defaults')

// jest.mock('@adobe/aio-lib-core-logging')
// const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:config-loader', { provider: 'debug' })

const libEnv = require('@adobe/aio-lib-env')

jest.mock('@adobe/aio-lib-env')
const getMockConfig = require('../../data-mocks/config-loader')
describe('load config', () => {
  let config
  beforeEach(async () => {
    // two calls to aio config are made let's mock them
    mockAIOConfig.get.mockImplementation(k => global.fakeConfig.tvm)
    process.chdir('/')
    // empty all fake files
    global.fakeFileSystem.clear()
    libEnv.getCliEnv.mockReturnValue('prod')
  })

  // main cases
  test('standalone app config', async () => {
    global.loadFixtureApp('app')
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('app', global.fakeConfig.tvm))
  })

  test('exc extension config', async () => {
    global.loadFixtureApp('exc')
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm))
  })

  test('standalone app, exc and nui extension config', async () => {
    global.loadFixtureApp('app-exc-nui')
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('app-exc-nui', global.fakeConfig.tvm))
  })

  test('standalone app with no actions', async () => {
    global.loadFixtureApp('app-no-actions')
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('app-no-actions', global.fakeConfig.tvm))
  })

  test('exc with complex include pattern', async () => {
    global.loadFixtureApp('exc-complex-includes')
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc-complex-includes', global.fakeConfig.tvm))
  })

  test('standalone application with legacy configuration system', async () => {
    global.loadFixtureApp('legacy-app')
    const fullAioConfig = { app: global.aioLegacyAppConfig, ...global.fakeConfig.tvm }
    // mock app config
    mockAIOConfig.get.mockImplementation(k => fullAioConfig)
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('legacy-app', fullAioConfig))
  })

  // corner cases - coverage
  test('exc with default package.json name & version', async () => {
    global.loadFixtureApp('exc')
    global.fakeFileSystem.addJson({ '/package.json': '{}' })
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      // will set defaults
      'all.dx/excshell/1.app.name': 'unnamed-app',
      'all.dx/excshell/1.app.version': '0.1.0',
      'all.dx/excshell/1.ow.package': 'unnamed-app-0.1.0',
      'packagejson.name': 'unnamed-app',
      'packagejson.version': '0.1.0'
    }))
  })

  test('exc with custom dist folder', async () => {
    global.loadFixtureApp('exc')
    // rewrite configuration
    const userConfig = yaml.load(global.fixtureFile('exc/app.config.yaml'))
    userConfig.extensions['dx/excshell/1'].dist = 'new/dist/for/excshell'
    global.fakeFileSystem.addJson({ '/app.config.yaml': yaml.dump(userConfig) })

    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      'all.dx/excshell/1.app.dist': path.normalize('/new/dist/for/excshell'),
      'all.dx/excshell/1.actions.dist': path.normalize('/new/dist/for/excshell/actions'),
      'all.dx/excshell/1.web.distDev': path.normalize('/new/dist/for/excshell/web-dev'),
      'all.dx/excshell/1.web.distProd': path.normalize('/new/dist/for/excshell/web-prod'),
      includeIndex: expect.any(Object)
    }))
  })

  test('exc with byo aws credentials', async () => {
    global.loadFixtureApp('exc')
    // rewrite configuration
    const userConfig = yaml.load(global.fixtureFile('exc/app.config.yaml'))
    userConfig.extensions['dx/excshell/1'].awsaccesskeyid = 'fakeid'
    userConfig.extensions['dx/excshell/1'].awssecretaccesskey = 'fakesecret'
    userConfig.extensions['dx/excshell/1'].s3bucket = 'fakebucket'
    global.fakeFileSystem.addJson({ '/app.config.yaml': yaml.dump(userConfig) })

    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      'all.dx/excshell/1.s3.creds': {
        accessKeyId: 'fakeid',
        secretAccessKey: 'fakesecret',
        params: { Bucket: 'fakebucket' }
      },
      includeIndex: expect.any(Object)
    }))
  })

  test('exc with custom tvm url', async () => {
    global.loadFixtureApp('exc')
    // rewrite configuration
    const userConfig = yaml.load(global.fixtureFile('exc/app.config.yaml'))
    userConfig.extensions['dx/excshell/1'].tvmurl = 'customurl'
    global.fakeFileSystem.addJson({ '/app.config.yaml': yaml.dump(userConfig) })

    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      'all.dx/excshell/1.s3.tvmUrl': 'customurl',
      includeIndex: expect.any(Object)
    }))
  })

  test('exc with default tvm url', async () => {
    global.loadFixtureApp('exc')
    // rewrite configuration
    const userConfig = yaml.load(global.fixtureFile('exc/app.config.yaml'))
    userConfig.extensions['dx/excshell/1'].tvmurl = 'https://firefly-tvm.adobe.io'
    global.fakeFileSystem.addJson({ '/app.config.yaml': yaml.dump(userConfig) })

    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      includeIndex: expect.any(Object)
    }))
  })

  test('exc with an action that has no function', async () => {
    global.loadFixtureApp('exc')
    // rewrite configuration
    const userConfig = yaml.load(global.fixtureFile('exc/src/dx-excshell-1/ext.config.yaml'))
    userConfig.runtimeManifest.packages['my-exc-package'].actions.newAction = { web: 'yes' }
    global.fakeFileSystem.addJson({ '/src/dx-excshell-1/ext.config.yaml': yaml.dump(userConfig) })

    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      'all.dx/excshell/1.manifest.full.packages.my-exc-package.actions.newAction': { web: 'yes' },
      includeIndex: expect.any(Object)
    }))
  })

  test('exc env = stage', async () => {
    libEnv.getCliEnv.mockReturnValue('stage')
    global.loadFixtureApp('exc')

    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      'all.dx/excshell/1.app.defaultHostname': 'dev.runtime.adobe.io',
      'all.dx/excshell/1.app.hostname': 'dev.runtime.adobe.io',
      includeIndex: expect.any(Object)
    }))
  })

  test('missing extension operation', async () => {
    global.fakeFileSystem.addJson({
      '/package.json': '{}',
      '/app.config.yaml':
`
extensions:
  dx/excshell/1:
    no: 'operations'
`
    })
    expect(() => loadConfig({})).toThrow('Missing \'operations\'')
  })

  test('no implementation - allowNoImpl=false', async () => {
    global.fakeFileSystem.addJson({ '/package.json': '{}', '/app.config.yaml': '{}' })
    expect(() => loadConfig({})).toThrow('Couldn\'t find configuration')
  })

  test('no implementation - allowNoImpl=true', async () => {
    global.fakeFileSystem.addJson({ '/package.json': '{}', '/app.config.yaml': '{}' })
    config = loadConfig({ allowNoImpl: true })
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      all: {},
      implements: [],
      includeIndex: {},
      'packagejson.name': 'unnamed-app',
      'packagejson.version': '0.1.0'
    }))
  })

  test('exc - no aio config', async () => {
    global.loadFixtureApp('exc')
    mockAIOConfig.get.mockImplementation(k => {})
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('exc', {}))
  })

  test('include cycle', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml':
`application:
  $include: b.yaml`,
        '/b.yaml':
`runtimeManifest:
  $include: dir/c.yaml`,
        '/dir/c.yaml':
'$include: ../b.yaml'
      }
    )
    expect(() => loadConfig({})).toThrow(`Detected '$include' cycle: 'app.config.yaml,b.yaml,${path.normalize('dir/c.yaml')},b.yaml'`)
  })

  test('include does not exist', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml': '$include: b.yaml'
      }
    )
    expect(() => loadConfig({})).toThrow('\'$include: b.yaml\' cannot be resolved')
  })

  test('include does not resolve to object - string', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml': '$include: b.yaml',
        '/b.yaml': 'string'
      }
    )
    expect(() => loadConfig({})).toThrow('\'$include: b.yaml\' does not resolve to an object')
  })

  test('include does not resolve to object - arraay', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml': '$include: b.yaml',
        '/b.yaml': '[1,2,3]'
      }
    )
    expect(() => loadConfig({})).toThrow('\'$include: b.yaml\' does not resolve to an object')
  })

  test('legacy-app - no hooks', async () => {
    global.loadFixtureApp('legacy-app')
    global.fakeFileSystem.addJson({
      // replace legacy app package.json which has hooks defined
      '/package.json': '{"name": "legacy-app", "version": "1.0.0", "scripts": {}}'
    })
    const fullAioConfig = { app: global.aioLegacyAppConfig, ...global.fakeConfig.tvm }
    // mock app config
    mockAIOConfig.get.mockImplementation(k => fullAioConfig)
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('legacy-app', fullAioConfig, {
      'all.application.hooks': {},
      includeIndex: expect.any(Object),
      'packagejson.scripts': {}
    }))
  })

  test('legacy-app with app.config.yaml - mixed config', async () => {
    global.loadFixtureApp('legacy-app')
    global.fakeFileSystem.addJson({
      '/app.config.yaml':
`application:
  hooks:
    another-hook: 'will be merged'
  runtimeManifest:
    packages:
      thepackage: 'takesover'`
    })
    const fullAioConfig = { app: global.aioLegacyAppConfig, ...global.fakeConfig.tvm }
    // mock app config
    mockAIOConfig.get.mockImplementation(k => fullAioConfig)
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('legacy-app', fullAioConfig, {
      'all.application.manifest.full': {
        packages: { thepackage: 'takesover' }
      },
      'all.application.manifest.package': undefined,
      'all.application.hooks': {
        // already there
        'post-app-run': 'echo hello',
        // new one
        'another-hook': 'will be merged'
      },
      includeIndex: expect.any(Object)
    }))
  })
})
