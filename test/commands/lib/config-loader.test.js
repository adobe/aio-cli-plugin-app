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
      accessKeyId: global.fakeConfig.creds.app.awsaccesskeyid,
      secretAccessKey: global.fakeConfig.creds.app.awssecretaccesskey,
      params: {
        Bucket: global.fakeConfig.creds.app.s3bucket
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
