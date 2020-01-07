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

const { importConfigJson, writeAio, writeEnv, flattenObjectWithSeparator } = require('../../../src/lib/import')
const fs = require('fs-extra')
const path = require('path')

beforeEach(() => {
  jest.clearAllMocks()
})

test('exports', () => {
  expect(importConfigJson).toBeDefined()
  expect(importConfigJson).toBeInstanceOf(Function)

  expect(writeAio).toBeDefined()
  expect(writeAio).toBeInstanceOf(Function)

  expect(writeEnv).toBeDefined()
  expect(writeEnv).toBeInstanceOf(Function)

  expect(flattenObjectWithSeparator).toBeDefined()
  expect(flattenObjectWithSeparator).toBeInstanceOf(Function)
})

test('flattenObjectWithSeparator', () => {
  const json = {
    foo: 'a',
    bar: {
      baz: {
        faz: 'b'
      },
      raz: {
      }
    }
  }

  const result = flattenObjectWithSeparator(json, {})
  expect(result).toEqual({
    AIO_bar_baz_faz: 'b',
    AIO_foo: 'a'
  })
})

test('writeAio', async () => {
  const json = {
    a: 'b',
    c: {
      d: 'e'
    }
  }

  const parentFolder = 'my-parent-folder'
  const aioPath = path.join(parentFolder, '.aio')

  writeAio(json, parentFolder, true)
  await expect(fs.writeJson).toHaveBeenCalledWith(aioPath, json, expect.any(Object))

  writeAio(json, parentFolder, false)
  await expect(fs.writeJson).toHaveBeenCalledWith(aioPath, json, expect.any(Object))

  return expect(fs.writeJson).toHaveBeenCalledTimes(2)
})

test('writeEnv', async () => {
  const json = {
    a: 'b',
    c: {
      d: 'e'
    }
  }

  const parentFolder = 'my-parent-folder'
  const envPath = path.join(parentFolder, '.env')
  const envData = 'AIO_a=b\nAIO_c_d=e'

  writeEnv(json, parentFolder, true)
  await expect(fs.writeFile).toHaveBeenCalledWith(envPath, envData, expect.any(Object))

  writeEnv(json, parentFolder, false)
  await expect(fs.writeFile).toHaveBeenCalledWith(envPath, envData, expect.any(Object))

  return expect(fs.writeFile).toHaveBeenCalledTimes(2)
})

test('importConfigJson', async () => {
  const runtime = {
    namespace: 'my-namespace',
    credentials: 'my-runtime-credentials'
  }
  const credentials = {
    apikey: {
      client_id: '83723cc8e25e455fb5db1ad12cbf16e9'
    },
    oauth2: {
      client_id: '83723cc8e25e455fb5db1ad12cbf16e9',
      client_secret: 'XXXXXX',
      redirect_uri: 'https://www.adobe.com'
    },
    jwt: {
      client_id: '568430a7b22e4a1f993d03ed8283bb26',
      client_secret: 'XXXXX',
      techacct: 'E03445FF5D81F8EA0A494034@techacct.adobe.com',
      meta_scopes: [
        'ent_partners_sdk'
      ],
      private_key: [
        '-----BEGIN PRIVATE KEY-----',
        'XXXX...XXX',
        '-----END PRIVATE KEY-----'
      ]
    }
  }

  const configJson = {
    id: 'this is some data',
    name: 'my-name',
    runtime,
    credentials
  }

  const workingFolder = 'my-working-folder'
  const aioPath = path.join(workingFolder, '.aio')
  const envPath = path.join(workingFolder, '.env')
  const envData = `AIO_runtime_namespace=my-namespace
AIO_runtime_credentials=my-runtime-credentials
AIO_credentials_apikey_client_id=83723cc8e25e455fb5db1ad12cbf16e9
AIO_credentials_oauth2_client_id=83723cc8e25e455fb5db1ad12cbf16e9
AIO_credentials_oauth2_client_secret=XXXXXX
AIO_credentials_oauth2_redirect_uri=https://www.adobe.com
AIO_credentials_jwt_client_id=568430a7b22e4a1f993d03ed8283bb26
AIO_credentials_jwt_client_secret=XXXXX
AIO_credentials_jwt_techacct=E03445FF5D81F8EA0A494034@techacct.adobe.com
AIO_credentials_jwt_meta_scopes_0=ent_partners_sdk
AIO_credentials_jwt_private_key_0=-----BEGIN PRIVATE KEY-----
AIO_credentials_jwt_private_key_1=XXXX...XXX
AIO_credentials_jwt_private_key_2=-----END PRIVATE KEY-----`

  fs.readJson.mockReturnValueOnce(configJson)

  await importConfigJson('/some/config/path', workingFolder, true)

  await expect(fs.writeJson).toHaveBeenCalledWith(aioPath, configJson, expect.any(Object))
  await expect(fs.writeJson).toHaveBeenCalledTimes(1)

  // TODO: the flatten function is not working properly, note the Array flattening
  await expect(fs.writeFile).toHaveBeenCalledWith(envPath, envData, expect.any(Object))
  await expect(fs.writeFile).toHaveBeenCalledTimes(1)
})
