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
// const yaml = require('js-yaml')
// const chalk = require('chalk')
// const defaults = require('../../../src/lib/defaults')

// jest.mock('@adobe/aio-lib-core-logging')
// const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:config-loader', { provider: 'debug' })

// const libEnv = require('@adobe/aio-lib-env')

const getMockConfig = require('../../data-mocks/loaded-config')
describe('load config', () => {
  let config
  beforeEach(async () => {
    // two calls to aio config are made let's mock them
    mockAIOConfig.get.mockImplementation(k => global.fakeConfig.tvm)
    process.chdir('/')
    // empty all fake files
    global.fakeFileSystem.clear()
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

  // corner cases
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
      'packagejson.version': '0.1.0',
    }))
  })

  test('no implementation - allowNoImpl=false', async () => {
    global.fakeFileSystem.addJson({ '/package.json': '{}', '/app.config.yaml': '{}' })
    expect(() => loadConfig({})).toThrow(`Couldn't find configuration in '/'`)
  })

  test('no implementation - allowNoImpl=true', async () => {
    global.fakeFileSystem.addJson({ '/package.json': '{}', '/app.config.yaml': '{}' })
    config = loadConfig({ allowNoImpl: true })
    expect(config).toEqual(getMockConfig('exc', global.fakeConfig.tvm, {
      'all': {},
      'implements': [],
      'includeIndex': {},
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
`$include: ../b.yaml`
      }
    )
    expect(() => loadConfig({})).toThrow(`Detected '$include' cycle: 'app.config.yaml,b.yaml,dir/c.yaml,b.yaml'`)
  })

  test('include does not exist', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml': '$include: b.yaml'
      }
    )
    expect(() => loadConfig({})).toThrow(`'$include: b.yaml' cannot be resolved`)
  })

  test('include does not resolve to object - string', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml': '$include: b.yaml',
        '/b.yaml': 'string'
      }
    )
    expect(() => loadConfig({})).toThrow(`'$include: b.yaml' does not resolve to an object`)
  })

  test('include does not resolve to object - arraay', async () => {
    global.fakeFileSystem.addJson(
      {
        '/package.json': '{}',
        '/app.config.yaml': '$include: b.yaml',
        '/b.yaml': '[1,2,3]'
      }
    )
    expect(() => loadConfig({})).toThrow(`'$include: b.yaml' does not resolve to an object`)
  })

  test('legacy-app - no hooks', async () => {
    global.loadFixtureApp('legacy-app')
    global.fakeFileSystem.addJson({
      // replace legacy app package.json which has hooks defined
      '/package.json': '{"name": "sample-app", "version": "1.0.0", "scripts": {}}'
    })
    const fullAioConfig = { app: global.aioLegacyAppConfig, ...global.fakeConfig.tvm }
    // mock app config
    mockAIOConfig.get.mockImplementation(k => fullAioConfig)
    config = loadConfig({})
    expect(config).toEqual(getMockConfig('legacy-app', fullAioConfig, {
      'all.application.hooks': {},
      'includeIndex': expect.any(Object),
      'packagejson.scripts': {},
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
        packages: { thepackage: 'takesover' },
      },
      'all.application.manifest.package': undefined,
      'all.application.hooks': {
        // already there
        'post-app-run': 'echo hello',
        // new one
        'another-hook': 'will be merged'
      },
      'includeIndex': expect.any(Object)
    }))
  })
})

