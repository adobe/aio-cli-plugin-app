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
const { runScript } = require('../../lib/app-helper')

const DEV_KEYS_DIR = 'dist/dev-keys/'
const PRIVATE_KEY_PATH = DEV_KEYS_DIR + 'private.key'
const PUB_CERT_PATH = DEV_KEYS_DIR + 'cert-pub.crt'
const CONFIG_KEY = 'aio-dev.dev-keys'

class Run extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Run)
    // aliases
    flags.actions = flags.actions && !flags['skip-actions']

    const spinner = ora()

    const runConfigs = this.getAppExtConfigs(flags)
    const entries = Object.entries(runConfigs)
    if (entries.length > 1) {
      this.error('You can only run one implementation at the time, please filter with the \'-e\' flag.')
    }
    const name = entries[0][0]
    const config = entries[0][1]

    try {
      // now we are good, either there is only 1 extension point or -e flag for one was provided
      await this.runOneExtensionPoint(name, config, flags, spinner)
    } catch (error) {
      spinner.stop()
      // delegate to top handler
      throw error
    }
  }

  async runOneExtensionPoint (name, config, flags, spinner) {
    const hasBackend = config.app.hasBackend
    const hasFrontend = config.app.hasFrontend

    if (!hasBackend && !hasFrontend) {
      this.error(new Error('nothing to run.. there is no frontend and no manifest.yml, are you in a valid app?'))
    }
    if (flags['skip-actions'] && !hasFrontend) {
      this.error(new Error('nothing to run.. there is no frontend and --skip-actions is set'))
    }

    const runOptions = {
      skipActions: !flags.actions,
      skipServe: !flags.serve,
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
      await runScript(config.hooks['pre-app-run'])
    } catch (err) {
      this.log(err)
    }

    // check if there are certificates available, and generate them if not ...
    // only care about certificates if the application has a UI
    if (hasFrontend) {
      try {
        runOptions.parcel.https = await this.getOrGenerateCertificates()
      } catch (error) {
        this.error(error)
      }
    }

    const onProgress = !flags.verbose ? info => {
      spinner.text = info
    } : info => {
      spinner.info(chalk.dim(`${info}`))
      spinner.start()
    }

    const frontendUrl = await runDev(config, runOptions, onProgress)
    try {
      await runScript(config.hooks['post-app-run'])
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
    description: 'Run/debug actions locally ( requires Docker running )',
    exclusive: ['skip-actions']
  }),
  serve: flags.boolean({
    description: '[default: true] Start frontend server (experimental)',
    default: true,
    allowNo: true
  }),
  'skip-actions': flags.boolean({
    description: '[deprecated] Please use --no-actions',
    exclusive: ['local'],
    default: false
  }),
  actions: flags.boolean({
    description: '[default: true] Run actions, defaults to true, to skip actions use --no-actions',
    exclusive: ['local'], // no-actions and local don't work together
    default: true,
    allowNo: true
  }),
  open: flags.boolean({
    description: 'Open the default web browser after a successful run, only valid if your app has a front-end',
    default: false
  }),
  extension: flags.string({
    description: 'Run only a specific extension, this flag can only be specified once',
    char: 'e',
    // we do not support multiple yet
    multiple: false,
    // not multiple but treat it as array for logic reuse
    parse: str => [str]
  })
}

module.exports = Run
