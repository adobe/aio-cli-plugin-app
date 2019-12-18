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
const fs = require('fs-extra')
const path = require('path')

const { flags } = require('@oclif/command')

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')

const PRIVATE_KEY_PATH = 'dist/dev-keys/private.key'
const PUB_CERT_PATH = 'dist/dev-keys/cert-pub.crt'

class Run extends BaseCommand {
  async run () {
    const { flags } = this.parse(Run)

    /* check if there are certificates available, and generate them if not ... */
    try {
      fs.ensureDirSync(path.dirname(PRIVATE_KEY_PATH))
      if (!fs.existsSync(PRIVATE_KEY_PATH) && !fs.existsSync(PUB_CERT_PATH)) {
        const CertCmd = this.config.findCommand('certificate:generate')
        const Instance = CertCmd.load()
        await Instance.run([`--keyout=${PRIVATE_KEY_PATH}`, `--out=${PUB_CERT_PATH}`, `-n=${this.appName}.cert`])
      }
    } catch (error) {
      this.error(error)
    }

    const spinner = ora()
    const listeners = {
      onStart: taskName => {
        this.log(chalk.bold(`> ${taskName}`))
        spinner.start(taskName)
      },
      onEnd: taskName => {
        spinner.succeed(chalk.green(taskName))
      },
      onWarning: warning => {
        spinner.warn(chalk.dim(chalk.yellow(warning)))
        spinner.start()
      },
      onProgress: info => {
        if (flags.verbose) {
          spinner.stopAndPersist({ text: chalk.dim(` > ${info}`) })
        } else {
          spinner.info(chalk.dim(info))
        }
        spinner.start()
      }
    }

    process.env.REMOTE_ACTIONS = !flags.local
    const scripts = AppScripts({ listeners })
    try {
      const options = {
        https: {
          cert: PUB_CERT_PATH, // Path to custom certificate
          key: PRIVATE_KEY_PATH // Path to custom key
        },
        logLevel: flags.verbose ? 4 : 3
      }
      await scripts.runDev([], options)
    } catch (error) {
      spinner.fail()
      this.error(error)
    }
  }
}

Run.description = `Run an Adobe I/O App
`

Run.flags = {
  local: flags.boolean({
    description: 'run/debug actions locally'
  }),
  ...BaseCommand.flags
}

// Run.args = [
//   ...BaseCommand.args
// ]

module.exports = Run
