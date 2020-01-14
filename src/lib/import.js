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
const inquirer = require('inquirer')
const validator = require('validator')
const yaml = require('js-yaml')
const hjson = require('hjson')
const configUtil = require('@adobe/aio-lib-core-config/src/util')

const AIO_FILE = '.aio'
const ENV_FILE = '.env'
const AIO_ENV_PREFIX = 'AIO_'
const AIO_ENV_SEPARATOR = '_'
const FILE_FORMAT_ENV = 'env'
const FILE_FORMAT_JSON = 'json'

// by default, all rules are required
//     set `notRequired` if a rule is not required (key does not have to exist)
//     `rule` can be a regex string or a function that returns a boolean, and takes one input
const gRules = [
  { key: 'name', rule: '^[a-zA-Z0-9]+$' },
  { key: 'project.name', rule: '^[a-zA-Z0-9]+$' },
  { key: 'project.org.name', rule: '^[a-zA-Z0-9]+$' },
  { key: 'app_url', rule: validator.isURL },
  { key: 'action_url', rule: validator.isURL },
  { key: 'credentials.oauth2.redirect_uri', rule: validator.isURL, notRequired: true }
]

/**
 * Load a config file
 *
 * @param {string} fileOrBuffer the path to the config file or a Buffer
 */
function loadConfigFile (fileOrBuffer) {
  let contents
  if (typeof fileOrBuffer === 'string') {
    contents = fs.readFileSync(fileOrBuffer, 'utf-8')
  } else if (Buffer.isBuffer(fileOrBuffer)) {
    contents = fileOrBuffer.toString('utf-8')
  } else {
    contents = ''
  }

  contents = contents.trim()

  if (contents) {
    if (contents[0] === '{') {
      try {
        return { values: hjson.parse(contents), format: 'json' }
      } catch (e) {
        throw new Error('Cannot parse json')
      }
    } else {
      try {
        return { values: yaml.safeLoad(contents, { json: true }), format: 'yaml' }
      } catch (e) {
        throw new Error('Cannot parse yaml')
      }
    }
  }
  return { values: {}, format: 'json' }
}

/**
 * Pretty prints the json object as a string.
 * Delimited by 2 spaces.
 *
 * @param {object} json the json to pretty print
 */
function prettyPrintJson (json) {
  return JSON.stringify(json, null, 2)
}

/**
 * Validate the config.json.
 * Throws an Error if any rules are not fulfilled.
 *
 * (future: use JSON schema)
 *
 * @param {object} json the json to validate
 */
function checkRules (json, rules = gRules) {
  const invalid = rules.filter(item => {
    let value = configUtil.getValue(json, item.key)

    if (!value && item.notRequired) {
      return false
    }
    value = value || ''

    if (typeof (item.rule) === 'function') {
      return !item.rule(value)
    } else {
      return (value.match(new RegExp(item.rule)) === null)
    }
  })

  if (invalid.length) {
    const explanations = invalid.map(item => {
      item.value = configUtil.getValue(json, item.key) || '<undefined>'
      return { ...item, rule: undefined }
    })

    const message = `Missing or invalid keys in config: ${JSON.stringify(explanations)}`
    throw new Error(message)
  }
}

/**
 * Confirmation prompt for overwriting, or merging a file if it already exists.
 *
 * @param {string} filePath the file to ovewrite
 * @return {object} ovewrite, merge, abort (properties, that are set to true if chosen)
 */
async function checkFileConflict (filePath) {
  if (fs.existsSync(filePath)) {
    const answer = await inquirer
      .prompt([
        {
          type: 'expand',
          message: `The file ${filePath} already exists:`,
          name: 'conflict',
          choices: [
            {
              key: 'o',
              name: 'Overwrite',
              value: 'overwrite'
            },
            {
              key: 'm',
              name: 'Merge',
              value: 'merge'
            },
            {
              key: 'x',
              name: 'Abort',
              value: 'abort'
            }
          ]
        }
      ])

    switch (answer.conflict) {
      case 'overwrite':
        return { overwrite: true }
      case 'merge':
        return { merge: true }
      case 'abort':
        return { abort: true }
      default:
        return {}
    }
  } else {
    return {}
  }
}

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
      const _key = key.replace(/_/gi, '__') // replace any underscores in key with double underscores

      if (Array.isArray(json[key])) {
        result[`${prefix}${_key}`] = JSON.stringify(json[key])
        return result
      } else if (typeof (json[key]) === 'object') {
        flattenObjectWithSeparator(json[key], result, `${prefix}${_key}${separator}`)
      } else {
        result[`${prefix}${_key}`] = json[key]
        return result
      }
    })

  return result
}

/**
 * Merge .env data
 * (we don't want to go through the .env to json conversion)
 * Note that comments will not be preserved.
 *
 * @param {string} oldEnv existing env values
 * @param {newEnv} newEnv new env values (takes precedence)
 */
function mergeEnv (oldEnv, newEnv) {
  const result = {}
  const NEWLINES = /\n|\r|\r\n/

  function splitLine (line) {
    if (line.trim().startsWith('#')) { // skip comments
      return
    }

    const items = line.split('=')
    if (items.length >= 2) {
      const key = items.shift().trim() // pop first element
      const value = items.join('').trimStart() // join the rest

      result[key] = value
    }
  }

  debug(`mergeEnv - oldEnv:${oldEnv}`)
  debug(`mergeEnv - newEnv:${newEnv}`)

  oldEnv.split(NEWLINES).forEach(splitLine)
  newEnv.split(NEWLINES).forEach(splitLine)

  const mergedEnv = Object
    .keys(result)
    .map(key => `${key}=${result[key]}`)
    .join('\n')
  debug(`mergeEnv - mergedEnv:${mergedEnv}`)

  return mergedEnv
}

/**
 * Merge json data
 *
 * @param {string} oldData existing values
 * @param {newEnv} newData new values (takes precedence)
 */
function mergeJson (oldData, newData) {
  const { values: oldJson } = loadConfigFile(Buffer.from(oldData))
  const { values: newJson } = loadConfigFile(Buffer.from(newData))

  debug(`mergeJson - oldJson:${prettyPrintJson(oldJson)}`)
  debug(`mergeJson - newJson:${prettyPrintJson(newJson)}`)

  const mergedJson = prettyPrintJson({ ...oldJson, ...newJson })
  debug(`mergeJson - mergedJson:${mergedJson}`)

  return mergedJson
}

/**
 * Merge .env or json data
 *
 * @param {string} oldData the data to merge to
 * @param {string} newDdata the new data to merge from (these contents take precedence)
 * @param {*} fileFormat the file format of the data (env, json)
 */
function mergeData (oldData, newData, fileFormat) {
  debug(`mergeData - oldData: ${oldData}`)
  debug(`mergeData - newData:${newData}`)

  if (fileFormat === FILE_FORMAT_ENV) {
    return mergeEnv(oldData, newData)
  } else { // FILE_FORMAT_JSON default
    return mergeJson(oldData, newData)
  }
}

/**
 * Writes the data to file.
 * Checks for conflicts and gives options to overwrite, merge, or abort.
 *
 * @param {string} destination the file to write to
 * @param {string} data the data to write to disk
 * @param {object} flags] flags for file writing
 * @param {boolean} [flags.overwrite=false] set to true to overwrite the existing .env file
 * @param {boolean} [flags.merge=false] set to true to merge in the existing .env file (takes precedence over overwrite)
 * @param {boolean} [flags.interactive=false] set to true to prompt the user for file overwrite
 * @param {boolean} [flags.fileFormat=json] set the file format to write (defaults to json)
 */
async function writeFile (destination, data, flags = {}) {
  const { overwrite = false, merge = false, fileFormat = FILE_FORMAT_JSON, interactive = false } = flags
  debug(`writeFile - destination: ${destination} flags:${flags}`)
  debug(`writeFile - data: ${data}`)

  let answer = { overwrite, merge } // for non-interactive, get from the flags

  if (interactive) {
    answer = await checkFileConflict(destination)
    debug(`writeEnv - answer (interactive): ${JSON.stringify(answer)}`)
  }

  if (answer.abort) {
    return
  }

  if (answer.merge) {
    if (fs.existsSync(destination)) {
      const oldData = fs.readFileSync(destination, 'utf-8')
      data = mergeData(oldData, data, fileFormat)
    }
  }

  return fs.writeFile(destination, data, {
    flag: (answer.overwrite || answer.merge) ? 'w' : 'wx'
  })
}

/**
 * Writes the json object as AIO_ env vars to the .env file in the specified parent folder.
 *
 * @param {object} json the json object to transform and write to disk
 * @param {string} parentFolder the parent folder to write the .env file to
 * @param {object} flags] flags for file writing
 * @param {boolean} [flags.overwrite=false] set to true to overwrite the existing .env file
 * @param {boolean} [flags.merge=false] set to true to merge in the existing .env file (takes precedence over overwrite)
 * @param {boolean} [flags.interactive=false] set to true to prompt the user for file overwrite
 */
async function writeEnv (json, parentFolder, flags) {
  debug(`writeEnv - json: ${JSON.stringify(json)} parentFolder:${parentFolder} flags:${flags}`)

  const destination = path.join(parentFolder, ENV_FILE)
  debug(`writeEnv - destination: ${destination}`)

  const resultObject = flattenObjectWithSeparator(json)
  debug(`convertJsonToEnv - flattened and separated json: ${prettyPrintJson(resultObject)}`)

  const data = Object
    .keys(resultObject)
    .map(key => `${key}=${resultObject[key]}`)
    .join('\n')
  debug(`writeEnv - data: ${data}`)

  return writeFile(destination, data, { ...flags, fileFormat: FILE_FORMAT_ENV })
}

/**
 * Writes the json object to the .aio file in the specified parent folder.
 *
 * @param {object} json the json object to write to disk
 * @param {string} parentFolder the parent folder to write the .aio file to
 * @param {object} flags] flags for file writing
 * @param {boolean} [flags.overwrite=false] set to true to overwrite the existing .env file
 * @param {boolean} [flags.merge=false] set to true to merge in the existing .env file (takes precedence over overwrite)
 * @param {boolean} [flags.interactive=false] set to true to prompt the user for file overwrite
 */
async function writeAio (json, parentFolder, flags) {
  debug(`writeAio - parentFolder:${parentFolder} flags:${flags}`)
  debug(`writeAio - json: ${prettyPrintJson(json)}`)

  const destination = path.join(parentFolder, AIO_FILE)
  debug(`writeAio - destination: ${destination}`)

  const data = prettyPrintJson(json)
  return writeFile(destination, data, flags)
}

/**
 * Import a downloadable config and write to the appropriate .env (credentials) and .aio (non-credentials) files.
 *
 * @param {string} configFileLocation the path to the config file to import
 * @param {string} [destinationFolder=the current working directory] the path to the folder to write the .env and .aio files to
 * @param {object} flags] flags for file writing
 * @param {boolean} [flags.overwrite=false] set to true to overwrite the existing .env file
 * @param {boolean} [flags.merge=false] set to true to merge in the existing .env file (takes precedence over overwrite)
*/
async function importConfigJson (configFileLocation, destinationFolder = process.cwd(), flags = {}) {
  debug(`importConfigJson - configFileLocation: ${configFileLocation} destinationFolder:${destinationFolder} flags:${flags}`)

  const { values: config, format } = loadConfigFile(configFileLocation)
  const { runtime, credentials } = config

  debug(`importConfigJson - format: ${format} config:${prettyPrintJson(config)} `)

  checkRules(config)

  await writeEnv({ runtime, $ims: credentials }, destinationFolder, flags)

  // remove the credentials
  delete config.runtime
  delete config.credentials

  return writeAio(config, destinationFolder, flags)
}

module.exports = {
  loadConfigFile,
  writeAio,
  writeEnv,
  flattenObjectWithSeparator,
  importConfigJson
}
