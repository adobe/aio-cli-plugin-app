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

const ora = require('ora')
const chalk = require('chalk')

const { flags } = require('@oclif/command')
const cnaHelper = require('../../lib/cna-helper')
const CNABaseCommand = require('../../CNABaseCommand')

class CNATest extends CNABaseCommand {
  async run () {
    const { flags } = this.parse(CNATest)
    // some things we could do here:
    // test configurations, ie remote-actions deployed and called from local
    // this just runs package.json scripts.test, we could also check that this is in fact a cna project

    const spinner = ora()

    const taskName = flags.e2e ? 'e2e tests' : 'unit tests'
    const command = flags.e2e ? 'e2e' : 'test'

    this.log(chalk.bold(`> ${taskName}`))
    spinner.start(taskName)

    try {
      await cnaHelper.runPackageScript(command, process.cwd(), { silent: true })
    } catch (e) {
      this.log()
      spinner.fail(chalk.bold(chalk.red(`${taskName} failed !`)))
      return this.error(e.message, { exit: e.exitCode })
    }

    this.log()
    spinner.succeed(chalk.bold(chalk.green(`${taskName} executed successfully 👌`)))
  }
}

CNATest.description = `Tests a Cloud Native Application
`

CNATest.flags = {
  ...CNABaseCommand.flags,
  unit: flags.boolean({
    char: 'u',
    description: 'runs unit tests (default).',
    default: true,
    exclusive: ['e2e']
  }),
  e2e: flags.boolean({
    char: 'e',
    description: 'runs e2e tests.',
    exclusive: ['unit']
  })
}
module.exports = CNATest
