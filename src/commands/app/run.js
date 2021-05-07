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
const { runPackageScript, urlJoin, removeProtocolFromURL } = require('../../lib/app-helper')

const DEV_KEYS_DIR = 'dist/dev-keys/'
const PRIVATE_KEY_PATH = DEV_KEYS_DIR + 'private.key'
const PUB_CERT_PATH = DEV_KEYS_DIR + 'cert-pub.crt'
const CONFIG_KEY = 'aio-dev.dev-keys'

class Run extends BaseCommand {
  async run () {
    // cli input
    const { flags } = this.parse(Run)
    const spinner = ora()

    const runConfigs = this.getExtensionPointConfigs(flags)
    const entries = Object.entries(runConfigs)
    if (entries.length > 1) {
      this.error('You can only run one extension point implementation at the time, please provide the -e flag.')
    }
    const name = entries[0][0]
    const config = entries[0][1]
    // now we are good, either there is only 1 extension point or -e flag for one was provided
    await this.runOneExtensionPoint(name, config, flags, spinner)

    try {
      // 2. deploy extension manifest
      if (!flags['no-publish']) {
        const fullConfig = this.getAppConfig()
        // TODO THIS NEEDS MORE THINKING
        this.deployExtensionManifestPartial(fullConfig, name)
      }
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
      skipActions: flags['skip-actions'],
      skipServe: !flags.serve,
      // todo: any other params we should add here?
      parcel: {
        logLevel: flags.verbose ? 4 : 2,
        // always set to false on localhost to get debugging and hot reloading
        contentHash: false
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
  }

  // deploys only single payload doesn't overwrite existing payloads
  async deployExtensionManifestPartial (fullConfig, extensionPoint) {
    // todo simplify and comment logic
    // 1. build payload
    const aioConfig = fullConfig.aioConfig
    const extPointConfig = fullConfig.extensionPointsConfig[extensionPoint]
    const extensionPointOperations = fullConfig.extensionPoints[extensionPoint].operations || {}
    const endpointPayload = {}
    Object.entries(extensionPointOperations).forEach(([opk, opv]) => {
      endpointPayload[opk] = opv.map(opelem => {
        // todo refactor this with deploy logic
        if (opelem.type === 'headless') {
          // todo reuse appHelper getActionUrls ?
          // NOTE WEBURI must be extracted from package
          const owPackage = opelem.impl.split('/')[0]
          const owAction = opelem.impl.split('/')[1]
          const manifestAction = extPointConfig.manifest.full.packages[owPackage].actions[owAction]
          const webArg = manifestAction['web-export'] || manifestAction.web
          const webUri = (webArg && webArg !== 'no' && webArg !== 'false') ? 'web' : ''
          const packageWithAction = opv.impl
          // NOTE non runtime apihost do not support namespace as subdomain
          // TODO --local ?
          const href = urlJoin('https://' + extPointConfig.ow.namespace + '.' + removeProtocolFromURL(extPointConfig.ow.apihost), 'api', extPointConfig.ow.apiversion, webUri, packageWithAction)
          return { href, ...opv.params }
        }
        // opelem.type === 'spa'
        // todo support multi spas + make url fetch util in aio-lib-web
        //`https://${extPointConfig.ow.namespace}.${extPointConfig.app.hostname}/index.html`
        // todo that is going to break the deployed UI..
        return { href: 'https://localhost:9080', ...opv.params }
      })
    })
    // todo refactor this with deploy logic
    const extensionPayload = {
      id: 'FILL ME',
      name: `${aioConfig.project.org.id}-${aioConfig.project.name}`,
      endpoints: { extensionPoint: endpointPayload },
      services: { FILL: 'ME' },
      releaseNotes: 'FILL ME',
      // todo do better than [0].id
      technicalUserId: aioConfig.project.workspace.credentials && aioConfig.project.workspace.credentials[0].id,
      appId: 'FILL ME',
      publisherId: 'FILL ME'
    }

    // 2. deploy to ext reg
    // TODO deploy partial - no overwrite
    this.log(chalk.blue('Extension Registry Payload [NEEDS SOME MORE THINKING, DO WE WANT TO DEPLOY MANIFEST ON RUN?]:'))
    this.log(chalk.blue(JSON.stringify(extensionPayload, null, 2)))
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
  }),
  extensionPoint: flags.string({
    description: 'Build only a specific extension point, the flags can be only one time',
    char: 'e',
    // we do not support multiple yet
    multiple: false,
    // not multiple but treat it as array for logic reuse
    parse: str => [str]
  })
}

module.exports = Run
