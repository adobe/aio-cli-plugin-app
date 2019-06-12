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
const { cli } = require('cli-ux')
const path = require('path')
const fs = require('fs-extra')
const spawn = require('cross-spawn')
const which = require('which')
const config = require('@adobe/aio-cli-config')
const inquirer = require('inquirer')

class CNACreateAuth extends CNABaseCommand {
  async run () {
    this.parse(CNACreateAuth)

    // 1. make path absolute
    let destDir = path.resolve('./adobeio-cna-lib-auth-ims/')

    // 2. Make sure we have npm, fatal otherwise
    if (!_isNpmInstalled()) { // todo: better error message
      this.error('npm is required.')
    }

    // 3. Make sure we have git, fatal otherwise
    if (!_isGitInstalled()) { // todo: better error message
      this.error('git is required.')
    }

    // 4. fail if destination dir exists
    if (fs.existsSync(destDir)) {
      this.warn('A folder with name adobeio-cna-lib-auth-ims already exists. Skipping download.')
    } else {
      await cloneRepo()
      await installDeps(destDir)
    }

    // 5. Just do it
    let IMS_AUTH_TYPE = await _getUserInput({
      name: 'IMS_AUTH_TYPE',
      message: 'Which mode of auth do you need? (Valid options are code and jwt',
      type: 'string',
      default: 'jwt'
    })
    let IMS_AUTH_PERSIST = await _getUserInput({
      name: 'IMS_AUTH_PERSIST',
      message: 'Do you want to persist the tokens in db? (yes or no)',
      type: 'string',
      default: 'no'
    })
    await configureAuth(destDir, IMS_AUTH_TYPE, IMS_AUTH_PERSIST)
    await IMS_AUTH_TYPE === 'code' ? deployAuth(destDir) : deployJWTAuth(destDir)
  }
}

async function cloneRepo () {
  return new Promise(function (resolve, reject) {
    cli.action.start('cloning auth library')
    const child = spawn('git', ['clone', 'https://github.com/adobe/adobeio-cna-lib-auth-ims'])
    child.on('error', err => {
      cli.action.stop('failed')
      console.log('error ' + err)
      reject(err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        cli.action.stop('failed')
        reject(new Error('failed'))
      } else {
        cli.action.stop('good')
        resolve()
      }
    })
  })
}

async function installDeps (destDir) {
  return new Promise(function (resolve, reject) {
    cli.action.start('installing dependencies')
    const child = spawn('npm', ['install'], {
      cwd: destDir,
      stdio: 'inherit',
      env: process.env
    })
    child.on('error', err => {
      cli.action.stop('failed')
      console.log('error ' + err)
      reject(err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        cli.action.stop('failed')
        reject(new Error('failed'))
      } else {
        cli.action.stop('good')
        resolve()
      }
    })
  })
}

async function configureAuth (destDir, IMS_AUTH_TYPE, IMS_AUTH_PERSIST) {
  return new Promise(function (resolve, reject) {
    cli.action.start('configuring auth')
    const child = spawn('npm', ['run', 'configure'], {
      cwd: destDir,
      stdio: 'inherit',
      env: { ...process.env,
        'IMS_AUTH_TYPE': IMS_AUTH_TYPE,
        'IMS_AUTH_PERSIST': IMS_AUTH_PERSIST === 'yes'
      }
    })
    child.on('error', err => {
      cli.action.stop('failed')
      console.log('error ' + err)
      reject(err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        cli.action.stop('failed')
        reject(new Error('failed'))
      } else {
        cli.action.stop('good')
        resolve()
      }
    })
  })
}

async function deployAuth (destDir) {
  let oauthConfig = config.get('oauth')
  if (typeof (oauthConfig) === 'undefined') {
    console.log('No config values in oauth. You need to set client_id, client_secret, redirect_url(optional) and scopes(optional) under oauth. For more customization please look at https://github.com/adobe/adobeio-cna-lib-auth-ims')
    return
  }
  if (_failOnMissing(['CLIENT_ID', 'CLIENT_SECRET'], oauthConfig)) {
    return
  }
  console.log(oauthConfig)
  let confirm = await _getUserInput({
    name: 'confirm',
    message: 'Are the values displayed above correct?',
    type: 'confirm'
  })

  if (!confirm) {
    console.log(`We pull the values from aio config. You can update your config and try again.`)
    return
  }

  return new Promise(function (resolve, reject) {
    cli.action.start('deploying auth')
    let deployEnv = { ...process.env,
      'OW_NAMESPACE': config.get('runtime.namespace'),
      'OAUTH_API_KEY': oauthConfig.CLIENT_ID,
      ...oauthConfig
    }
    const child = spawn('npm', ['run', 'deploy'], {
      cwd: destDir,
      stdio: 'inherit',
      env: deployEnv
    })
    child.on('error', err => {
      cli.action.stop('failed')
      console.log('error ' + err)
      reject(err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        cli.action.stop('failed')
        reject(new Error('failed'))
      } else {
        cli.action.stop('good')
        resolve()
      }
    })
  })
}

async function deployJWTAuth (destDir) {
  let payload = config.get('jwt-auth.jwt_payload')
  let jwtProps = {
    'jwt_client_id': config.get('jwt-auth.client_id'),
    'jwt_client_secret': config.get('jwt-auth.client_secret'),
    'technical_account_id': config.get('jwt-auth.jwt_payload.sub'),
    'org_id': config.get('jwt-auth.jwt_payload.iss'),
    'meta_scopes': Object.keys(payload).filter(key => key.startsWith('http') && payload[key] === true),
    'private_key': config.get('jwt-auth.jwt_private_key').split('\n')
  }
  console.log(jwtProps)
  let confirm = await _getUserInput({
    name: 'confirm',
    message: 'Are the values displayed above correct?',
    type: 'confirm'
  })

  if (!confirm) {
    console.log('We pull the values from aio config. You can update your config and try again')
    return
  }
  return new Promise(function (resolve, reject) {
    cli.action.start('deploying auth')

    fs.writeFileSync(destDir + '/jwt.json', JSON.stringify(jwtProps))
    let deployEnv = { ...process.env,
      'OW_NAMESPACE': config.get('runtime.namespace')
    }
    const child = spawn('npm', ['run', 'deploy-jwt'], {
      cwd: destDir,
      stdio: 'inherit',
      env: deployEnv
    })
    // console.log(jwtProps)
    child.on('error', err => {
      cli.action.stop('failed')
      console.log('error ' + err)
      reject(err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        cli.action.stop('failed')
        reject(new Error('failed'))
      } else {
        cli.action.stop('good')
        resolve()
      }
    })
  })
}

function _failOnMissing (paramNames, params) {
  for (let paramName of paramNames) {
    if (params[paramName] == null || typeof (params[paramName]) === 'undefined') {
      console.log('Parameter oauth.' + paramName + ' is required in config.')
      return true
    }
  }
  return false
}

function _isNpmInstalled () {
  return which.sync('npm', { nothrow: true }) !== null
}

function _isGitInstalled () {
  return which.sync('git', { nothrow: true }) !== null
}

async function _getUserInput (options) {
  let response = await inquirer.prompt(options)
  return response[options.name]
}

CNACreateAuth.description = `
Deploy auth actions
`

CNACreateAuth.flags = {
  ...CNABaseCommand.flags
}

CNACreateAuth.args = CNABaseCommand.args

module.exports = CNACreateAuth
