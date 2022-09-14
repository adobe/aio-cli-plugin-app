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
const path = require('path')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:add:action', { provider: 'debug' })
const { Flags } = require('@oclif/core')
const fs = require('fs-extra')

const { constants } = require('@adobe/generator-app-common-lib')
const { ciDirName } = constants
const DEPLOY_PROD_FILENAME = '/workflows/deploy_prod.yml'
const DEPLOY_STAGE_FILENAME = '/workflows/deploy_stage.yml'
const TEST_PR_FILENAME = '/workflows/pr_test.yml'

class DeleteCICommand extends BaseCommand {
  async run () {
    const { flags } = await this.parse(DeleteCICommand)

    aioLogger.debug(`deleting CI files from the project, using flags: ${JSON.stringify(flags)}`)

    if (!fs.existsSync(ciDirName)) {
      this.error('you have no CI in your project')
    }

    const resConfirm = await this.prompt([
      {
        type: 'confirm',
        name: 'deleteCI',
        message: `Please confirm the deletion of all your CI files in '${ciDirName}'`,
        when: !flags.yes
      }
    ])
    if (flags.yes || resConfirm.deleteCI) {
      fs.removeSync(path.join(ciDirName, DEPLOY_PROD_FILENAME))
      fs.removeSync(path.join(ciDirName, DEPLOY_STAGE_FILENAME))
      fs.removeSync(path.join(ciDirName, TEST_PR_FILENAME))
      this.log('✔ deleted CI files locally')
    }
  }
}

DeleteCICommand.description = `Delete existing CI files
`

DeleteCICommand.flags = {
  yes: Flags.boolean({
    description: 'Skip questions, and use all default values',
    default: false,
    char: 'y'
  }),
  ...BaseCommand.flags
}

DeleteCICommand.args = []

module.exports = DeleteCICommand
