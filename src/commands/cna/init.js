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

const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')
const ora = require('ora')
const debug = require('debug')('aio-cli-plugin-cna:CNAInit')

const { flags } = require('@oclif/command')
// const { cli } = require('cli-ux')

const cnaHelper = require('../../lib/cna-helper')
const CNABaseCommand = require('../../CNABaseCommand')
const templateMap = require('../../templates')

const GetInitMessage = cwd => {
  let message = `Project setup
You are about to initialize a project in this directory:

  ${cwd}

Which CNA features do you want to enable for this project?
`
  return message
}

function isValidPackageName (str) {
  // validate name for invalid chars, it is also used for S3 url
  let valid = /^[a-zA-Z0-9_-]*$/
  if (valid.test(str)) {
    return true
  } else {
    return `'${str}' contains invalid characters and is not a valid package name`
  }
}

class CNAInit extends CNABaseCommand {
  async run () {
    const { args, flags } = this.parse(CNAInit)

    // can we specify a location other than cwd?
    let destDir = path.resolve(args.path)
    fs.ensureDirSync(destDir)
    this.log(GetInitMessage(destDir))
    let responses = { components: ['actions', 'assets', 'database'] }
    if (!flags.yes) {
      responses = await inquirer.prompt([{
        name: 'components',
        message: 'select components to include',
        type: 'checkbox',
        choices: [
          // {
          //   name: 'Database: Deploy database rules',
          //   value: 'database',
          //   short: 'Database'
          // },
          {
            name: 'Actions: Deploy Runtime actions',
            value: 'actions',
            short: 'Actions',
            checked: true
          },
          {
            name: 'Web Assets: Deploy hosted static assets',
            value: 'assets',
            short: 'Web Assets',
            checked: true
          }
        ]
      }])
    }

    await this.copyBaseFiles(destDir, flags.yes)

    // if (responses.components.indexOf('database') > -1) {
    //   this.log('/* Database Setup */')
    //   this.log('more questions here')
    //   // todo: this.createDBFromTemplate
    // }
    if (responses.components.indexOf('actions') > -1) {
      await this.createActionsFromTemplate(destDir, flags.yes)
    }
    if (responses.components.indexOf('assets') > -1) {
      await this.createAssetsFromTemplate(destDir, flags.yes)
    }

    let npmPromptRes = { npmInstall: true }
    if (!flags.yes) {
      npmPromptRes = await inquirer.prompt({
        name: 'npmInstall',
        message: 'npm install dependencies now?',
        type: 'confirm',
        default: true
      })
    }

    if (npmPromptRes.npmInstall) {
      const spinner = ora() // { spinner: 'weather' } //?
      spinner.start(`running npm install in ${destDir}`)
      try {
        await cnaHelper.installPackage(destDir)
        spinner.succeed()
      } catch (err) {
        spinner.error(err)
      }
    }
    // finalize configuration data
    this.log(`✔ CNA initialization finished!`)
  }

  async copyBaseFiles (dest, bSkipPrompt) {
    // first create a packageName based on the dest directory
    let name = path.parse(dest).name
    let templateBase = templateMap.base
    let srcDir = path.resolve(__dirname, '../../templates/', templateBase.path)

    let destDir = path.resolve(dest)

    if (fs.existsSync(srcDir)) {
      this.log(`Copying starter files to ${destDir}\n`)
      fs.copySync(srcDir, destDir)

      let namePrompt = { name: name }

      if (!bSkipPrompt) {
        namePrompt = await inquirer.prompt([{
          name: 'name',
          message: 'package name',
          type: 'string',
          default: name,
          validate: isValidPackageName
        }])
      } else {
        let isValidRes = isValidPackageName(name)
        if (isValidRes !== true) {
          throw new Error(isValidRes)
        }
      }

      // write package.json
      // TODO: consider using read-pkg & write-pkg -jm
      let pjPath = path.resolve(destDir, 'package.json')
      let pjson = await fs.readJson(pjPath)
      pjson.name = namePrompt.name
      fs.outputJson(pjPath, pjson, { spaces: 2 })

      // rename dotenv => .env
      fs.renameSync(path.resolve(destDir, 'dotenv'),
        path.resolve(destDir, '.env'))
    } else {
      // error in template ?
      console.error('error in template ... ' + srcDir)
    }
  }

  /**
  *  Web Assets
  * ***************************************************************************/
  async createAssetsFromTemplate (dest, bSkipPrompt) {
    let message = `
/* Web Assets Setup */
The public directory is the folder (inside your project directory) that
will contain static assets to be uploaded to cloud storage. If you
have a build process use your build's output directory.
`
    this.log(message)

    // todo: write a json fragment to cna.json
    // todo: single page app? all urls to /index.html
    // copy files listed in templates/functions

    let templateAssets = templateMap.assets
    let srcDir = path.resolve(__dirname, '../../templates/', templateAssets.path)
    this.log('templateAssets.srcDir = ' + srcDir)

    let assetQ = { assetDest: 'web-src' }
    if (!bSkipPrompt) {
      assetQ = await inquirer.prompt([{
        name: 'assetDest',
        message: 'What folder do you want to use as your public directory?',
        type: 'string',
        default: 'web-src'
      }])
    }

    let destDir = path.resolve(dest, assetQ.assetDest)
    if (fs.existsSync(destDir)) {
      this.log('`public` directory already exists --- skipping')
    } else if (fs.existsSync(srcDir)) {
      this.log(`Copying actions to ${destDir}`)
      fs.copySync(srcDir, destDir)
      this.log('')
    } else {
      // error in template ?
      debug('edge case, asset template appears to be missing source dir')
    }
  }

  /**
   *  Runtime Actions
   *    todo: add option to use eslint?
   *    todo: add option install deps?
   *    todo: add option to overwrite files?
   * ***************************************************************************/
  async createActionsFromTemplate (dest, bSkipPrompt) {
    let message = `
/* Actions Setup */
An actions directory will be created in your project with a Node.js
package pre-configured.
`
    this.log(message)

    let actionQ = { actionDest: 'actions' }
    if (!bSkipPrompt) {
      actionQ = await inquirer.prompt([{
        name: 'actionDest',
        message: 'What folder do you want to use as your actions directory?',
        type: 'string',
        default: 'actions'
      }])
    }

    // write a json fragment to cna.json
    // copy files listed in templates/functions
    let templateActions = templateMap.actions
    let srcDir = path.resolve(__dirname, '../../templates/', templateActions.path)
    let destDir = path.resolve(dest, actionQ.actionDest)
    if (fs.existsSync(destDir)) {
      // question: should we be doing an overwrite? or a merge, or clobber?
      this.log('`actions` directory already exists --- skipping')
    } else if (fs.existsSync(srcDir)) {
      this.log(`Copying actions to ${destDir}`)
      fs.copySync(srcDir, destDir)
      this.log('')
    } else {
      debug('edge case, action template appears to be missing source dir')
      // error in template ?
    }
  }
}

CNAInit.description = `Initialize a Cloud Native Application
`

CNAInit.flags = {
  'yes': flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...CNABaseCommand.flags
}

CNAInit.args = [
  ...CNABaseCommand.args
]

module.exports = CNAInit
