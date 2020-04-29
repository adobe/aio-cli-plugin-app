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
const https = require('https')
const getPort = require('get-port')
const { cli } = require('cli-ux')

const { flags } = require('@oclif/command')
const coreConfig = require('@adobe/aio-lib-core-config')

const BaseCommand = require('../../BaseCommand')
const AppScripts = require('@adobe/aio-app-scripts')
const { runPackageScript, wrapError } = require('../../lib/app-helper')

const DEV_KEYS_DIR = 'dist/dev-keys/'
const PRIVATE_KEY_PATH = DEV_KEYS_DIR + 'private.key'
const PUB_CERT_PATH = DEV_KEYS_DIR + 'cert-pub.crt'
const CONFIG_KEY = 'aio-dev.dev-keys'

class Run extends BaseCommand {
  async run () {
    const { flags } = this.parse(Run)

    const hasFrontend = await fs.exists('web-src/')
    const hasBackend = await fs.exists('manifest.yml')

    if (!hasBackend && !hasFrontend) {
      this.error(wrapError('nothing to run.. there is no web-src/ and no manifest.yml, are you in a valid app?'))
    }
    if (!!flags['skip-actions'] && !hasFrontend) {
      this.error(wrapError('nothing to run.. there is no web-src/ and --skip-actions is set'))
    }

    const runOptions = {
      skipActions: !!flags['skip-actions'],
      parcel: {
        logLevel: flags.verbose ? 4 : 2
      }
    }

    try {
      await runPackageScript('pre-app-run')
    } catch (err) {
      // this is assumed to be a missing script error
    }

    // check if there are certificates available, and generate them if not ...
    // only care about certificates if the application has a UI
    if (hasFrontend) {
      try {
        runOptions.parcel.https = await this.getOrGenerateCertificates()
      } catch (error) {
        this.error(wrapError(error))
      }
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
      const frontendUrl = await scripts.runDev([], runOptions)
      try {
        await runPackageScript('post-app-run')
      } catch (err) {
        // this is assumed to be a missing script error
      }
      if (frontendUrl) {
        this.log()
        this.log(chalk.blue(chalk.bold(`To view your local application:\n  -> ${frontendUrl}`)))

        const launchPrefix = this.getLaunchUrlPrefix()
        if (launchPrefix) {
          const launchUrl = launchPrefix + frontendUrl
          this.log(chalk.blue(chalk.bold(`To view your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
        }
      }
    } catch (error) {
      spinner.fail()
      this.error(wrapError(error))
    }
  }

  async getOrGenerateCertificates () {
    const certs = {
      cert: PUB_CERT_PATH, // Path to custom certificate
      key: PRIVATE_KEY_PATH // Path to custom key
    }

    /* get existing certificates from file.. */
    if (await fs.exists(PRIVATE_KEY_PATH) && await fs.exists(PUB_CERT_PATH)) {
      return certs
    }

    await fs.ensureDir(DEV_KEYS_DIR)

    /* or get existing certificates from config.. */
    const devConfig = coreConfig.get(CONFIG_KEY)
    if (devConfig && devConfig.privateKey && devConfig.publicCert) {
      // yes? write them to file
      await fs.writeFile(PRIVATE_KEY_PATH, devConfig.privateKey)
      await fs.writeFile(PUB_CERT_PATH, devConfig.publicCert)

      return certs
    }

    /* or if they do not exists, attempt to create them */
    // 1. generate them using aio certificate generate command
    const CertCmd = this.config.findCommand('certificate:generate')
    if (CertCmd) {
      const Instance = CertCmd.load()
      await Instance.run([`--keyout=${PRIVATE_KEY_PATH}`, `--out=${PUB_CERT_PATH}`, '-n=DeveloperSelfSigned.cert'])
    } else {
      // could not find the cert command, error is caught below
      throw new Error('error while generating certificate - no certificate:generate command found')
    }

    // 2. store them globally in config
    const privateKey = (await fs.readFile(PRIVATE_KEY_PATH)).toString()
    const publicCert = (await fs.readFile(PUB_CERT_PATH)).toString()
    coreConfig.set(CONFIG_KEY + '.privateKey', privateKey)
    coreConfig.set(CONFIG_KEY + '.publicCert', publicCert)

    // 3. ask the developer to accept them
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

    return certs
  }
}

Run.description = `Run an Adobe I/O App
`

Run.flags = {
  local: flags.boolean({
    description: 'run/debug actions locally',
    exclusive: ['skip-actions']
  }),
  'skip-actions': flags.boolean({
    description: 'skip actions, only run the ui server',
    exclusive: ['local']
  }),
  ...BaseCommand.flags
}

// Run.args = [
//   ...BaseCommand.args
// ]

module.exports = Run
