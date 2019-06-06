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
// const { cli } = require('cli-ux')
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')
const templateMap = require('../../templates')

const GetInitMessage = cwd => {
  let message = `Project setup
You are about to initialize a project in this directory:

  ${cwd}

Which CNA features do you want to enable for this project?
`
  return message
}

class CNAInit extends CNABaseCommand {
  async run () {
    const { args } = this.parse(CNAInit)

    // can we specify a location other than cwd?
    let destDir = path.resolve(args.path)

    // 1. does the target contain a cna.json, if not create it

    this.log(GetInitMessage(destDir))

    let responses = await inquirer.prompt([{
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

    if (responses.components.indexOf('database') > -1) {
      this.log('/* Database Setup */')
      this.log('more questions here')
      // todo: this.createDBFromTemplate
    }
    if (responses.components.indexOf('actions') > -1) {
      await this.createActionsFromTemplate()
    }
    if (responses.components.indexOf('assets') > -1) {
      await this.createAssetsFromTemplate()
    }

    // finalize configuration data
    //
    this.log(`✔ CNA initialization finished!`)
  }

  /**
  *  Web Assets
  * ***************************************************************************/
  async createAssetsFromTemplate () {
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

    let assetQ = await inquirer.prompt([{
      name: 'assetDest',
      message: 'What folder do you want to use as your public directory?',
      type: 'string',
      default: 'web-assets'
    }])

    console.log('assetQ ', assetQ)
    // todo: copy assets
  }

  /**
   *  Runtime Actions
   *    todo: add option to use eslint?
   *    todo: add option install deps?
   *    todo: add option to overwrite files?
   * ***************************************************************************/
  async createActionsFromTemplate () {
    let message = `
/* Actions Setup */
An actions directory will be created in your project with a Node.js
package pre-configured.
`
    this.log(message)

    let actionQ = await inquirer.prompt([{
      name: 'actionDest',
      message: 'What folder do you want to use as your public directory?',
      type: 'string',
      default: 'actions'
    }])

    this.log('actionQ', actionQ)

    // write a json fragment to cna.json
    // copy files listed in templates/functions
    let templateActions = templateMap.actions
    let srcDir = path.resolve(__dirname, '../../templates/', templateActions.path)

    let destDir = path.resolve(actionQ.actionDest)
    if (fs.existsSync(destDir)) {
      this.log('`actions` directory already exists --- skipping')
    } else if (fs.existsSync(srcDir)) {
      this.log(`Copying actions to ${destDir}`)
      fs.copySync(srcDir, destDir)
      this.log('')
    } else {
      // error in template ?
    }
  }
}

CNAInit.description = `Initialize a Cloud Native Application
`

CNAInit.flags = {
  ...CNABaseCommand.flags
}

CNAInit.args = CNABaseCommand.args

module.exports = CNAInit
