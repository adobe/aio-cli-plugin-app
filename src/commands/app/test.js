/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { runScript } = require('../../lib/app-helper')
const { flags } = require('@oclif/command')
const BaseCommand = require('../../BaseCommand')
const chalk = require('chalk')

class Test extends BaseCommand {
  async run () {
    const { flags } = this.parse(Test)
    let { all, unit, e2e, action } = flags

    // 'all' overrides the setting of either the unit or e2e flag
    if (all) {
      unit = true
      e2e = true
    } else if (!unit && !e2e) {
      // 'all' not set; we check if neither is set, and default to 'unit'
      unit = true
    }

    const buildConfigs = this.getAppExtConfigs(flags)

    for (const extensionName of Object.keys(buildConfigs)) {
      await this.runExtensionTest(extensionName, buildConfigs[extensionName], { unit, e2e, action })
    }
  }

  forwardSlashEscape (windowsPath) {
    // on Windows you need to escape forward slashes
    return windowsPath.replace(/\\/g, '\\\\')
  }

  async runExtensionTest (extensionName, extensionConfig, flags) {
    const { unit, e2e, action } = flags
    const commandList = []

    // if unit and hooks.test available, we run that instead
    if (extensionConfig.hooks.test) {
      commandList.push({
        type: 'hook',
        command: extensionConfig.hooks.test
      })
    } else {
      if (action) { // filter by action
        // if flags.action, we get a list of all the extension-name/action-name for everything, and match
        // if it's a match, we run the <action-name>.test.js in the appropriate unit or e2e folder
      } else { // run everything
        if (unit) {
          commandList.push({
            type: 'unit',
            command: 'jest',
            args: ['--passWithNoTests', this.forwardSlashEscape(extensionConfig.tests.unit)]
          })
        }
        if (e2e) {
          commandList.push({
            type: 'e2e',
            command: 'jest',
            args: ['--passWithNoTests', this.forwardSlashEscape(extensionConfig.tests.e2e)]
          })
        }
      }
    }

    for (const cmd of commandList) {
      console.log(chalk.yellow(`Running ${cmd.type} tests for ${extensionName}...`))
      await runScript(cmd.command, extensionConfig.root, cmd.args)
    }
  }
}

Test.flags = {
  extension: flags.string({
    char: 'e',
    description: 'the extension(s) to test',
    exclusive: ['action'],
    multiple: true
  }),
  action: flags.string({
    char: 'a',
    description: 'the action(s) to test',
    exclusive: ['extension'],
    multiple: true
  }),
  all: flags.boolean({
    description: 'run both unit and e2e tests',
    default: false
  }),
  e2e: flags.boolean({
    description: 'run e2e tests',
    default: false,
    allowNo: true
  }),
  unit: flags.boolean({
    description: 'run unit tests',
    default: false,
    allowNo: true
  })
}

Test.description = `Run tests for an Adobe I/O App
`
module.exports = Test
