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
const runDev = require('../../lib/run-dev')
const { defaultHttpServerPort: SERVER_DEFAULT_PORT } = require('../../lib/defaults')
const { runPackageScript, wrapError } = require('../../lib/app-helper')

const DEV_KEYS_DIR = 'dist/dev-keys/'
const PRIVATE_KEY_PATH = DEV_KEYS_DIR + 'private.key'
const PUB_CERT_PATH = DEV_KEYS_DIR + 'cert-pub.crt'
const CONFIG_KEY = 'aio-dev.dev-keys'

class Run extends BaseCommand {
  async run (args = []) {
    const { flags } = this.parse(Run)
    const config = this.getAppConfig()

    const hasBackend = config.app.hasBackend
    const hasFrontend = config.app.hasFrontend

    if (!hasBackend && !hasFrontend) {
      this.error(wrapError('nothing to run.. there is no frontend and no manifest.yml, are you in a valid app?'))
    }
    if (flags['skip-actions'] && !hasFrontend) {
      this.error(wrapError('nothing to run.. there is no frontend and --skip-actions is set'))
    }

    const runOptions = {
      skipActions: flags['skip-actions'],
      skipServe: !flags.serve,
      // todo: any other params we should add here?
      parcel: {
        logLevel: flags.verbose ? 'verbose' : 'warn',
        // always set to false on localhost to get debugging and hot reloading
        shouldContentHash: false
      },
      fetchLogs: true,
      devRemote: !flags.local,
      verbose: flags.verbose
    }

    try {
      await runPackageScript('pre-app-run')
    } catch (err) {
      this.log(err)
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
    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    try {
      const frontendUrl = await runDev(this.getAppConfig(), runOptions, onProgress)
      try {
        await runPackageScript('post-app-run')
      } catch (err) {
        this.log(err)
      }
      if (frontendUrl) {
        this.log()
        this.log(chalk.blue(chalk.bold(`To view your local application:\n  -> ${frontendUrl}`)))
        const launchUrl = this.getLaunchUrlPrefix() + frontendUrl
        if (flags.open) {
          this.log(chalk.blue(chalk.bold(`Opening your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
          cli.open(launchUrl)
        } else {
          this.log(chalk.blue(chalk.bold(`To view your deployed application in the Experience Cloud shell:\n  -> ${launchUrl}`)))
        }
      }
      this.log('press CTRL+C to terminate dev environment')
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
    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUB_CERT_PATH)) {
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
    const port = parseInt(process.env.PORT) || SERVER_DEFAULT_PORT
    const actualPort = await getPort({ port })
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

Run.description = 'Run an Adobe I/O App'

Run.flags = {
  ...BaseCommand.flags,
  local: flags.boolean({
    description: 'run/debug actions locally ( requires Docker running )',
    exclusive: ['skip-actions']
  }),
  serve: flags.boolean({
    description: 'start frontend server (experimental)',
    default: true,
    allowNo: true
  }),
  'skip-actions': flags.boolean({
    description: 'skip actions, only run the ui server',
    exclusive: ['local'],
    default: false
  }),
  open: flags.boolean({
    description: 'Open the default web browser after a successful run, only valid if your app has a front-end',
    default: false
  })
}

module.exports = Run
