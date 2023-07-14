/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const BaseCommand = require('../../BaseCommand')
const { Flags, Args } = require('@oclif/core')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:install', { provider: 'debug' })
const path = require('node:path')
const fs = require('fs-extra')
const execa = require('execa')
const unzipper = require('unzipper')
const { validateJsonWithSchema } = require('../../lib/install-helper')
const jsYaml = require('js-yaml')
const { USER_CONFIG_FILE, DEPLOY_CONFIG_FILE } = require('../../lib/defaults')
const ora = require('ora')
const chalk = require('chalk')

class InstallCommand extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(InstallCommand)

    this.preRelease()

    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)
    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)

    // resolve to absolute path before any chdir
    args.path = path.resolve(args.path)
    aioLogger.debug(`args.path (resolved): ${args.path}`)

    let outputPath = flags.output
    // change the cwd if necessary
    if (outputPath !== '.') {
      outputPath = path.resolve(flags.output)
      // TODO: confirm if dir exists for overwrite
      await fs.ensureDir(outputPath)
      process.chdir(outputPath)
      aioLogger.debug(`changed current working directory to: ${outputPath}`)
    }

    try {
      await this.validateZipDirectoryStructure(args.path)
      await this.unzipFile(args.path, outputPath)
      await this.validateConfig(outputPath, USER_CONFIG_FILE)
      await this.validateConfig(outputPath, DEPLOY_CONFIG_FILE)
      await this.npmInstall(flags.verbose)
      await this.runTests()
      this.spinner.succeed('Install done.')
    } catch (e) {
      this.spinner.fail(e.message)
      this.error(flags.verbose ? e : e.message)
    }
  }

  get spinner () {
    if (!this._spinner) {
      this._spinner = ora()
    }
    return this._spinner
  }

  diffArray (expected, actual) {
    const _expected = expected ?? []
    const _actual = actual ?? []
    return _expected.filter(item => !_actual.includes(item))
  }

  async validateZipDirectoryStructure (zipFilePath) {
    aioLogger.debug(`validateZipDirectoryStructure: ${zipFilePath}`)

    const expectedFiles = [USER_CONFIG_FILE, DEPLOY_CONFIG_FILE, 'package.json']
    const foundFiles = []

    this.spinner.start(`Validating integrity of app package at ${zipFilePath}...`)

    const zip = fs.createReadStream(zipFilePath).pipe(unzipper.Parse({ forceStream: true }))
    for await (const entry of zip) {
      const fileName = entry.path

      if (expectedFiles.includes(fileName)) {
        foundFiles.push(fileName)
      }
      entry.autodrain()
    }

    const diff = this.diffArray(expectedFiles, foundFiles)
    if (diff.length > 0) {
      throw new Error(`The app package ${zipFilePath} is missing these files: ${JSON.stringify(diff, null, 2)}`)
    }
    this.spinner.succeed(`Validated integrity of app package at ${zipFilePath}`)
  }

  async unzipFile (zipFilePath, destFolderPath) {
    aioLogger.debug(`unzipFile: ${zipFilePath} to be extracted to ${destFolderPath}`)

    this.spinner.start(`Extracting app package to ${destFolderPath}...`)
    return unzipper.Open.file(zipFilePath)
      .then((d) => d.extract({ path: destFolderPath }))
      .then(() => this.spinner.succeed(`Extracted app package to ${destFolderPath}`))
  }

  async validateConfig (outputPath, configFileName, configFilePath = path.join(outputPath, configFileName)) {
    this.spinner.start(`Validating ${configFileName}...`)
    aioLogger.debug(`validateConfig: ${configFileName} at ${configFilePath}`)

    const configFileJson = jsYaml.load(fs.readFileSync(configFilePath).toString())
    const { valid, errors } = validateJsonWithSchema(configFileJson, configFileName)
    if (!valid) {
      throw new Error(`Missing or invalid keys in ${configFileName}: ${JSON.stringify(errors, null, 2)}`)
    } else {
      this.spinner.succeed(`Validated ${configFileName}`)
    }
  }

  async npmInstall (isVerbose) {
    this.spinner.start('Running npm install...')
    const stdio = isVerbose ? 'inherit' : 'ignore'
    return execa('npm', ['install'], { stdio })
      .then(() => {
        this.spinner.succeed('Ran npm install')
      })
  }

  async runTests (isVerbose) {
    this.spinner.start('Running app tests...')
    return this.config.runCommand('app:test').then((result) => {
      if (result === 0) { // success
        this.spinner.succeed('App tests passed')
      } else {
        throw new Error('App tests failed')
      }
    })
  }
}

InstallCommand.hidden = true // hide from help for pre-release

InstallCommand.description = chalk.yellow(`(Pre-release) This command will support installing apps packaged by '<%= config.bin %> app pack'.
`)

InstallCommand.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'The packaged app output folder path',
    char: 'o',
    default: '.'
  })
}

InstallCommand.args =
  {
    path: Args.string({
      description: 'Path to the app package to install',
      required: true
    })
  }

module.exports = InstallCommand
