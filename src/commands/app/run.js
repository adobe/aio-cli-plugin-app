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
const https = require('https')
const getPort = require('get-port')
const { cli } = require('cli-ux')

const { flags } = require('@oclif/command')
const coreConfig = require('@adobe/aio-lib-core-config')

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')

const PRIVATE_KEY_PATH = 'dist/dev-keys/private.key'
const PUB_CERT_PATH = 'dist/dev-keys/cert-pub.crt'

class Run extends BaseCommand {
  async run () {
    const { flags } = this.parse(Run)
    const runOptions = {
      logLevel: flags.verbose ? 4 : 2
    }
    /* check if there are certificates available, and generate them if not ... */
    try {
      fs.ensureDirSync(path.dirname(PRIVATE_KEY_PATH))
      // if they do not exists, attempt to create them
      if (!fs.existsSync(PRIVATE_KEY_PATH) && !fs.existsSync(PUB_CERT_PATH)) {
        // 1. do they exist in global config?
        const devConfig = coreConfig.get('aio-dev.dev-keys')
        if (devConfig) {
          // yes? write them to file
          fs.writeFile(PRIVATE_KEY_PATH, devConfig.privateKey)
          fs.writeFile(PUB_CERT_PATH, devConfig.publicCert)
        } else {
          // 2. generate them
          const CertCmd = this.config.findCommand('certificate:generate')
          if (CertCmd) {
            const Instance = CertCmd.load()
            await Instance.run([`--keyout=${PRIVATE_KEY_PATH}`, `--out=${PUB_CERT_PATH}`, '-n=DeveloperSelfSigned.cert'])
          } else {
            // could not find the cert command, not sure what we should do here
          }
          // 3. store them globally in config
          const privateKey = (await fs.readFile(PRIVATE_KEY_PATH)).toString()
          const publicCert = (await fs.readFile(PUB_CERT_PATH)).toString()
          coreConfig.set('aio-dev.dev-keys.privateKey', privateKey)
          coreConfig.set('aio-dev.dev-keys.publicCert', publicCert)

          // 4. ask the developer to accept them
          let certAccepted = false
          const startTime = Date.now()
          const server = https.createServer({ key: privateKey, cert: publicCert }, function (req, res) {
            certAccepted = true
            res.writeHead(200)
            res.end('Congrats, you have accepted the certificate and can now use it for development on this machine.\n' +
            'You can close this window.')
          })
          const port = parseInt(process.env.PORT) || 9080
          const actualPort = await getPort({ port: port })
          server.listen(actualPort)
          this.log('A self signed development certificate has been generated, you will need to accept it in your browser in order to use it.')
          cli.open(`https://localhost:${actualPort}`)
          cli.action.start('Waiting for the certificate to be accepted.')
          // eslint-disable-next-line no-unmodified-loop-condition
          while (!certAccepted && Date.now() - startTime < 20000) {
            await cli.wait()
          }
          if (certAccepted) {
            cli.action.stop()
            this.log('Great, you accepted the certificate!')
          } else {
            cli.action.stop('timed out')
          }
          server.close()
        }
      }
      // if they now exist ... use them in the options
      if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUB_CERT_PATH)) {
        runOptions.https = {
          cert: PUB_CERT_PATH, // Path to custom certificate
          key: PRIVATE_KEY_PATH // Path to custom key
        }
      } else {
        // fatality?
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
      const result = await scripts.runDev([], runOptions)
      if (result) {
        if (process.env.AIO_LAUNCH_URL_PREFIX) {
          const launchUrl = process.env.AIO_LAUNCH_URL_PREFIX + result
          cli.open(launchUrl)
        }
      }
      return result
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
