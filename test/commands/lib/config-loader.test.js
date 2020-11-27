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
const loadConfig = require('../../../src/lib/config-loader')
const mockAIOConfig = require('@adobe/aio-lib-core-config')
const yaml = require('js-yaml')
const path = require('path')

describe('load config', () => {
  let config
  beforeEach(async () => {
    global.fakeFileSystem.reset()
    global.addSampleAppFiles()
    mockAIOConfig.get.mockReturnValue(global.fakeConfig.local)
    process.chdir('/')
  })

  test('sample app', async () => {
    config = loadConfig()
    expect(config.imsOrgId).toEqual(global.fakeConfig.local)
  })

  test('no project.org.ims_org_id in config', async () => {
    mockAIOConfig.get.mockReturnValue(undefined)
    config = loadConfig()
    expect(config.imsOrgId).toBe(undefined)
  })

  test('with s3 creds in config', async () => {
    mockAIOConfig.get.mockReturnValue(global.fakeConfig.creds)
    config = loadConfig()
    expect(config.s3.creds).toEqual({
      accessKeyId: global.fakeConfig.creds.cna.awsaccesskeyid,
      secretAccessKey: global.fakeConfig.creds.cna.awssecretaccesskey,
      params: {
        Bucket: global.fakeConfig.creds.cna.s3bucket
      }
    })
  })

  test('with empty package.json', async () => {
    global.fakeFileSystem.addJson({
      'package.json': '{}'
    })
    config = loadConfig()
    expect(config.app.version).toEqual('0.1.0')
  })

  test('with no backend', async () => {
    global.fakeFileSystem.removeKeys(['/manifest.yml'])
    config = loadConfig()
    expect(config.manifest.package).toBe(undefined)
  })

  test('with manifest not using packagePlaceHolder __APP_PACKAGE__', async () => {
    const manifest = yaml.safeLoad(global.fakeFileSystem.files()['/manifest.yml'], 'utf8')
    manifest.packages.samplePackage = manifest.packages.__APP_PACKAGE__
    delete manifest.packages.__APP_PACKAGE__
    global.fakeFileSystem.addJson({
      'manifest.yml': yaml.safeDump(manifest)
    })
    config = loadConfig()
    expect(config.manifest.package).toBe(undefined)
  })
})

describe('validate .env', () => {
  let config
  beforeEach(async () => {
    global.fakeFileSystem.reset()
    global.addSampleAppFiles()
    global.fakeFileSystem.addJson({
      '.env': 'AIO_runtime_auth=fakeauth',
      '.env.schema': 'AIO_runtime_auth='
    })
    mockAIOConfig.get.mockReturnValue(global.fakeConfig.local)
    process.chdir('/')
  })

  test('sample app', async () => {
    config = loadConfig()
    expect(config.imsOrgId).toEqual(global.fakeConfig.local)
  })

  test('sample app - duplicate in .env but no .env.schema', async () => {
    global.fakeFileSystem.addJson({
      '.env': 'AIO_runtime_auth=fakeauth\nAIO_runtime_auth=fakeauth'
    })
    global.fakeFileSystem.removeKeys(['/.env.schema'])
    config = loadConfig()
    expect(config.imsOrgId).toEqual(global.fakeConfig.local)
  })

  test('sample app - duplicate in .env', async () => {
    global.fakeFileSystem.addJson({
      '.env': 'AIO_runtime_auth=fakeauth\nAIO_runtime_auth=fakeauth',
      '.env.schema': 'AIO_runtime_auth='
    })
    expect(loadConfig).toThrow(`duplicate declaration of environment variable AIO_runtime_auth in ${path.resolve('.env')}`)
  })

  test('sample app - duplicate in .env - case insensitive', async () => {
    global.fakeFileSystem.addJson({
      '.env': 'AIO_runtime_auth=fakeauth\nAIO_runtime_AUTh=fakeauth',
      '.env.schema': 'AIO_runtime_auth='
    })
    expect(loadConfig).toThrow(`duplicate declaration of environment variable AIO_runtime_AUTh in ${path.resolve('.env')}`)
  })

  test('sample app - missing required env var', async () => {
    global.fakeFileSystem.addJson({
      '.env': ''
    })
    expect(loadConfig).toThrow('MISSING CONFIG VALUES: AIO_runtime_auth')
  })

  test('sample app - env var from process.env', async () => {
    global.fakeFileSystem.addJson({
      '.env': ''
    })
    process.env.AIO_runtime_auth = 'fakeauth'
    config = loadConfig()
    expect(config.imsOrgId).toEqual(global.fakeConfig.local)
  })

  test('sample app - env var from process.env - case insensitive', async () => {
    global.fakeFileSystem.addJson({
      '.env': ''
    })
    process.env.AIO_runtime_AuTh = 'fakeauth'
    config = loadConfig()
    expect(config.imsOrgId).toEqual(global.fakeConfig.local)
  })

  test('sample app - regex mismatch', async () => {
    global.fakeFileSystem.addJson({
      '.env': 'AIO_runtime_namespace=fakens',
      '.env.schema': 'AIO_runtime_namespace=[0-9]{5}_[0-9]{5}'
    })
    expect(loadConfig).toThrow('REGEX MISMATCH: \nAIO_runtime_namespace. Expected format: [0-9]{5}_[0-9]{5} Received: fakens')
  })

  test('sample app - regex mismatch 2', async () => {
    global.fakeFileSystem.addJson({
      '.env.schema': 'AIO_runtime_namespace=[0-9]{5}_[0-9]{5}'
    })
    process.env.AIO_runtime_namespace = 'fromprocessenv'
    expect(loadConfig).toThrow('REGEX MISMATCH: \nAIO_runtime_namespace. Expected format: [0-9]{5}_[0-9]{5} Received: fromprocessenv')
    delete process.env.AIO_runtime_namespace
  })

  test('sample app - regex match', async () => {
    delete process.env.AIO_runtime_namespace
    global.fakeFileSystem.addJson({
      '.env': 'AIO_runtime_namespace=12345_12345',
      '.env.schema': 'AIO_runtime_namespace=[0-9]{5}_[0-9]{5}'
    })
    config = loadConfig()
    expect(config.imsOrgId).toEqual(global.fakeConfig.local)
  })
})
