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

const { flags } = require('@oclif/command')
const CNABaseCommand = require('../../CNABaseCommand')
// const { cli } = require('cli-ux')
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')

class CNAAddOauthCommand extends CNABaseCommand {
  async run () {

  }
}

CNAAddOauthCommand.description = `Initialize a Cloud Native Application
`

CNAAddOauthCommand.flags = {
  ...CNABaseCommand.flags
}

CNAAddOauthCommand.args = CNABaseCommand.args

module.exports = CNAAddOauthCommand