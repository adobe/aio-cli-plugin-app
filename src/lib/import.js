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

const debug = require('debug')('aio-cli-plugin-app:import')
const path = require('path')
const fs = require('fs-extra')

const AIO_FILE = '.aio'
const ENV_FILE = '.env'
const AIO_ENV_PREFIX = 'AIO_'
const AIO_ENV_SEPARATOR = '_'

/**
 * Transform a json object to a flattened version. Any nesting is separated by the `separator` string.
 * For example, if you have the `_` separator string, flattening this:
 * {
 *    foo: {
 *      bar: 'a',
 *      baz: {
 *        faz: 'b'
 *      }
 *    }
 * }
 *
 * const result = flattenObjectWithSeparator(json, {}, '', '_)
 * The result would then be:
 * {
 *    'foo_bar': 'a',
 *    'foo_baz_faz': 'b'
 * }
 *
 * @param {object} json the json object to transform
 * @param {object} result the result object to initialize the function with
 * @param {string} prefix the prefix to add to the final key
 * @param {string} separator the separator string to separate the nested levels with
 */
function flattenObjectWithSeparator (json, result = {}, prefix = AIO_ENV_PREFIX, separator = AIO_ENV_SEPARATOR) {
  Object
    .keys(json)
    .forEach(key => {
      if (typeof (json[key]) === 'object') {
        flattenObjectWithSeparator(json[key], result, `${prefix}${key}${separator}`)
      } else {
        result[`${prefix}${key}`] = json[key]
        return result
      }
    })

  return result
}

/**
 * Writes the json object as AIO_ env vars to the .env file in the specified parent folder.
 *
 * @param {object} json the json object to transform and write to disk
 * @param {string} parentFolder the parent folder to write the .env file to
 * @param {boolean} [overwrite=false] set to true to overwrite the existing .env file
 */
async function writeEnv (json, parentFolder, overwrite = false) {
  debug(`writeEnv - json: ${JSON.stringify(json)} parentFolder:${parentFolder} overwrite:${overwrite}`)

  const destination = path.join(parentFolder, ENV_FILE)
  debug(`writeEnv - destination: ${destination}`)

  const resultObject = flattenObjectWithSeparator(json)
  debug(`writeEnv - flattened and separated json: ${JSON.stringify(resultObject, null, 2)}`)

  const data = Object
    .keys(resultObject)
    .map(key => `${key}=${resultObject[key]}`)
    .join('\n')

  debug(`writeEnv - data: ${data}`)

  return fs.writeFile(destination, data, {
    flag: overwrite ? 'w' : 'wx'
  })
}

/**
 * Writes the json object to the .aio file in the specified parent folder.
 *
 * @param {object} json the json object to write to disk
 * @param {string} parentFolder the parent folder to write the .aio file to
 * @param {boolean} [overwrite=false] set to true to overwrite the existing .aio file
 */
async function writeAio (json, parentFolder, overwrite = false) {
  debug(`writeAio - json: ${JSON.stringify(json, null, 2)} parentFolder:${parentFolder} overwrite:${overwrite}`)

  const destination = path.join(parentFolder, AIO_FILE)
  debug(`writeAio - destination: ${destination}`)

  return fs.writeJson(destination, json, {
    spaces: 2,
    flag: overwrite ? 'w' : 'wx'
  })
}

/**
 * Import a downloadable config and write to the appropriate .env (credentials) and .aio (non-credentials) files.
 *
 * @param {string} configFileLocation the path to the config file to import
 * @param {string} [writeToFolder=the current working directory] the path to the folder to write the .env and .aio files to
  * @param {boolean} [overwrite=false] set to true to overwrite any existing files
*/
async function importConfigJson (configFileLocation, writeToFolder = process.cwd(), overwrite = false) {
  debug(`importConfigJson - configFileLocation: ${configFileLocation} writeToFolder:${writeToFolder} overwrite:${overwrite}`)

  const config = await fs.readJson(configFileLocation)
  const { runtime, credentials } = config

  debug(`importConfigJson - config:${JSON.stringify(config, null, 2)} `)

  await writeEnv({ runtime, credentials }, writeToFolder, overwrite)

  // remove the credentials
  delete config.runtime
  delete config.credentials

  return writeAio(config, writeToFolder, overwrite)
}

module.exports = {
  writeAio,
  writeEnv,
  flattenObjectWithSeparator,
  importConfigJson
}
