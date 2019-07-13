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

const CNABaseCommand = require('../../CNABaseCommand')
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')
const yaml = require('js-yaml')
const config = require('@adobe/aio-cli-config')

class CNAAddAuthCommand extends CNABaseCommand {
  async run () {
    this.parse(CNAAddAuthCommand)

    let manifestFile = path.resolve('./manifest.yml')
    if (!fs.existsSync(manifestFile)) {
      this.error('No manifest found in current folder')
    }
    let manifest = yaml.safeLoad(fs.readFileSync(manifestFile, 'utf8'))

    let IMS_AUTH_TYPE = await _getUserInput({
      name: 'IMS_AUTH_TYPE',
      message: 'Which mode of auth do you need? (Valid options are code and jwt',
      type: 'string',
      default: 'code'
    })

    await IMS_AUTH_TYPE === 'code' ? configureAuth(manifest) : configureJWTAuth(manifest)
  }
}

async function configureAuth (manifest) {
  return new Promise(function (resolve, reject) {
    let namespace = _getCustomConfig('runtime.namespace', 'change-me')
    let shared_namespace = _getCustomConfig('shared_namespace', 'adobeio')
    let {
      client_id = 'change-me',
      client_secret = 'change-me',
      scopes = 'openid,AdobeID',
      base_url = 'https://adobeioruntime.net',
      redirect_url = 'https://www.adobe.com',
      cookie_path = namespace,
      persistence = false,
      my_auth_package = 'myauthp-shared',
      my_cache_package = 'mycachep-shared',
      my_auth_seq_package = 'myauthp'
    } = _getCustomConfig('oauth', {})
    let persistenceBool = persistence && (persistence.toLowerCase() === 'true' || persistence.toLowerCase() === 'yes')
    if (persistenceBool) {
      // TODO : Get accessKeyId and secretAccessKey
    }

    // Adding sequence
    manifest.packages[my_auth_seq_package] = {
      sequences: {
        authenticate: {
          actions: persistenceBool
            ? my_auth_package + '/login,/' +
                                                        shared_namespace + '/cache/encrypt,/' +
                                                        shared_namespace + '/cache/persist,' +
                                                        my_auth_package + '/success'

            : my_auth_package + '/login,/' +
                                                        shared_namespace + '/cache/encrypt,' +
                                                        my_auth_package + '/success',
          web: 'yes'
        }
      }
    }
    // Adding package binding
    manifest.packages[my_auth_seq_package].dependencies = manifest.packages[my_auth_seq_package].dependencies || {}
    manifest.packages[my_auth_seq_package].dependencies[my_auth_package] = {
      location: '/' + shared_namespace + '/oauth',
      inputs: {
        auth_provider: 'adobe-oauth2',
        auth_provider_name: 'adobe',
        client_id: client_id,
        client_secret: client_secret,
        scopes: scopes,
        persistence: persistence,
        callback_url: base_url + '/api/v1/web/' + namespace + '/' + my_auth_seq_package + '/authenticate',
        redirect_url: redirect_url,
        cookie_path: cookie_path,
        cache_namespace: namespace,
        cache_package: my_cache_package
      }
    }

    fs.writeFile('./manifest.yml', yaml.safeDump(manifest), (err) => {
      if (err) {
        console.log(err)
      }
    })
    resolve()
  })
}

async function configureJWTAuth (manifest) {
  return new Promise(function (resolve, reject) {
    let namespace = _getCustomConfig('runtime.namespace', 'change-me')
    let shared_namespace = _getCustomConfig('shared_namespace', 'adobeio')
    let {
      client_id = 'change-me',
      client_secret = 'change-me',
      jwt_payload = {},
      jwt_private_key = 'change-me',
      persistence = false,
      my_auth_package = 'myjwtauthp-shared',
      my_cache_package = 'myjwtcachep-shared',
      my_auth_seq_package = 'myjwtauthp'
    } = _getCustomConfig('jwt-auth', {})
    let technical_account_id = jwt_payload.sub
    let org_id = jwt_payload.iss
    let meta_scopes = Object.keys(jwt_payload).filter(key => key.startsWith('http') && jwt_payload[key] === true)
    let persistenceBool = persistence && (persistence.toLowerCase() === 'true' || persistence.toLowerCase() === 'yes')
    if (persistenceBool) {
      // TODO : Get accessKeyId and secretAccessKey
    }

    // Adding sequence
    manifest.packages[my_auth_seq_package] = {
      sequences: {
        authenticate: {
          actions: (persistenceBool ? my_auth_package + '/jwtauth,/adobeio/cache/persist'
            : my_auth_package + '/jwtauth'),
          web: 'yes'
        }
      }
    }
    // Adding package binding
    manifest.packages[my_auth_seq_package].dependencies = manifest.packages[my_auth_seq_package].dependencies || {}
    manifest.packages[my_auth_seq_package].dependencies[my_auth_package] = {
      location: '/' + shared_namespace + '/oauth',
      inputs: {
        jwt_client_id: client_id,
        jwt_client_secret: client_secret,
        technical_account_id: technical_account_id,
        org_id: org_id,
        meta_scopes: JSON.stringify(meta_scopes),
        private_key: JSON.stringify(jwt_private_key.split('\n')),
        persistence: persistence,
        cache_namespace: namespace,
        cache_package: my_cache_package
      }
    }

    fs.writeFile('./manifest.yml', yaml.safeDump(manifest), (err) => {
      if (err) {
        console.log(err)
      }
    })
    resolve()
  })
}

function _getCustomConfig (key, defaultValue) {
  return config.get(key) || defaultValue
}
async function _getUserInput (options) {
  let response = await inquirer.prompt(options)
  return response[options.name]
}

CNAAddAuthCommand.description = `Add auth actions to the manifest of a Cloud Native Application
`

CNAAddAuthCommand.flags = {
  ...CNABaseCommand.flags
}

CNAAddAuthCommand.args = CNABaseCommand.args

module.exports = CNAAddAuthCommand
