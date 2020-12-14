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

const fs = require('fs-extra')
const dotenv = require('dotenv')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:validate-dotenv', { provider: 'debug' })

module.exports = (dotEnvFile, schemaFile) => {
  if (fs.existsSync(dotEnvFile)) {
    checkForDuplicates(dotEnvFile)
    if (schemaFile && fs.existsSync(schemaFile)) {
      validateSchema(dotEnvFile, schemaFile)
    }
  }
}
/** @private */
function validateSchema (dotEnvFile, schemaFile) {
  const dotEnvData = loadEnvFile(dotEnvFile)
  const configData = Object.assign(dotEnvData, process.env)
  const schema = loadEnvFile(schemaFile)

  // convert all config keys to lowercase
  Object.keys(configData).forEach(key => {
    const lcKey = key.toLowerCase()
    if (key !== lcKey) {
      configData[lcKey] = configData[key]
      delete configData[key]
    }
  })
  const configKeys = Object.keys(configData)
  const schemaKeys = Object.keys(schema)

  const missingKeys = schemaKeys.filter(function (key) {
    return configKeys.indexOf(key.toLowerCase()) < 0
  })
  if (missingKeys.length) {
    throw new Error('MISSING CONFIG VALUES: ' + missingKeys.join(', '))
  }

  const regexMismatchKeys = []
  schemaKeys.forEach(function (key) {
    if (schema[key]) {
      if (!new RegExp(schema[key]).test(configData[key.toLowerCase()])) {
        regexMismatchKeys.push([key, schema[key], configData[key.toLowerCase()]])
      }
    }
  })
  if (regexMismatchKeys.length) {
    let errorMessage = 'REGEX MISMATCH: '
    regexMismatchKeys.forEach((mismatch) => {
      errorMessage = errorMessage + '\n' + mismatch[0] + '. Expected format: ' + mismatch[1] + ' Received: ' + mismatch[2]
    })
    throw new Error(errorMessage)
  }
}
/** @private */
function checkForDuplicates (envFile) { // Checks for duplicates in .env file
  const NEWLINES_MATCH = /\n|\r|\r\n/
  const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/ // regex for "key=val"
  const buf = Buffer.from(fs.readFileSync(envFile, 'utf-8'))
  const obj = {}
  buf.toString().split(NEWLINES_MATCH).forEach(function (line, idx) {
    const keyValueArr = line.match(RE_INI_KEY_VAL)
    if (keyValueArr != null) {
      const key = keyValueArr[1]
      const keyLowerCase = key.toLowerCase()
      if (obj[keyLowerCase]) {
        aioLogger.warn(`duplicate declaration of environment variable ${key} in ${envFile}`)
      } else {
        obj[keyLowerCase] = 'dummy'
      }
    }
  })
}
/** @private */
function loadEnvFile (path) {
  const data = fs.readFileSync(path)
  return dotenv.parse(data)
}
