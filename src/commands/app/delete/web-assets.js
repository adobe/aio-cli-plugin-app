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

const BaseCommand = require('../../../BaseCommand')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const fs = require('fs-extra')
const inquirer = require('inquirer')
const { atLeastOne } = require('../../../lib/app-helper')
const chalk = require('chalk')
const { EOL } = require('os')
const path = require('path')

class DeleteWebAssetsCommand extends BaseCommand {
  async run () {
    const { flags } = await this.parse(DeleteWebAssetsCommand)

    aioLogger.debug(`deleting web assets from the project, using flags: ${JSON.stringify(flags)}`)

    const fullConfig = await this.getFullConfig()
    const webAssetsByImpl = this.getAllWebAssets(fullConfig)
    if (!webAssetsByImpl) {
      this.error('web-assets not found')
    }
    // prompt user
    const choices = []
    Object.entries(webAssetsByImpl).forEach(([implName, webAssets]) => {
      choices.push(new inquirer.Separator(`-- web assets for '${implName}' --`))
      choices.push(...webAssets.map(w => ({ name: w.relSrc, value: w })))
    })
    const res = await this.prompt([
      {
        type: 'checkbox',
        name: 'web-assets',
        message: 'Which web-assets do you wish to delete from this project?\nselect web-assets to delete',
        choices,
        validate: atLeastOne
      }
    ])
    const toBeDeleted = res['web-assets']

    const resConfirm = await this.prompt([
      {
        type: 'confirm',
        name: 'delete',
        message: `Please confirm the deletion of '${toBeDeleted.map(w => w.relSrc)}', this will delete the source code`,
        when: !flags.yes
      }
    ])
    if (!flags.yes && !resConfirm.delete) {
      this.log('aborting..')
    } else {
      toBeDeleted.forEach(w => {
        // remove folders
        const folder = w.src
        fs.removeSync(w.src)
        aioLogger.debug(`deleted '${folder}'`)
      })
      this.log(chalk.bold(chalk.green(
        `✔ Successfully deleted webassets '${toBeDeleted.map(w => w.relSrc)}'` + EOL +
        '  => please make sure to cleanup associated dependencies and to undeploy any deleted UI'
      )))
    }
  }

  getAllWebAssets (config) {
    let webAssetsByImpl = {}
    Object.entries(config.all).forEach(([implName, implConfig]) => {
      if (implConfig.app.hasFrontend) {
        // for now we only support one web assets per impl
        webAssetsByImpl[implName] = [{ src: implConfig.web.src, relSrc: path.relative(implConfig.root, implConfig.web.src) }]
      }
    })
    if (Object.keys(webAssetsByImpl).length === 0) {
      webAssetsByImpl = null
    }
    return webAssetsByImpl
  }
}

DeleteWebAssetsCommand.description = `Delete existing web assets
`

DeleteWebAssetsCommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...BaseCommand.flags
}

DeleteWebAssetsCommand.args = {}

module.exports = DeleteWebAssetsCommand
