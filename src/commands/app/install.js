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
const { Flags } = require('@oclif/core')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:install', { provider: 'debug' })
const path = require('node:path')
const fs = require('fs-extra')
const unzipper = require('unzipper')
const execa = require('execa')
const { validateJsonWithSchema } = require('../../lib/install-helper')

class InstallCommand extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(InstallCommand)

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

    await this.validateZipDirectoryStructure(args.path)
    await this.unzipFile(args.path, outputPath)
    await this.validateConfig(outputPath, 'app.config.yaml')
    await this.validateConfig(outputPath, 'deploy.yaml')
    await this.runTests(outputPath)
  }

  diffArray (expected, actual) {
    const _expected = expected ?? []
    const _actual = actual ?? []
    return _expected.filter(item => !_actual.includes(item))
  }

  async validateZipDirectoryStructure (zipFilePath) {
    aioLogger.debug(`validateZipDirectoryStructure: ${zipFilePath}`)

    const expectedFiles = ['app.config.yaml', 'deploy.yaml', 'package.json']
    const foundFiles = []

    this.log(`Validating integrity of app package at ${zipFilePath}...`)

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
      this.error(`The app package ${zipFilePath} is missing these files: ${JSON.stringify(diff, null, 2)}`)
    }
  }

  async unzipFile (zipFilePath, destFolderPath) {
    aioLogger.debug(`unzipFile: ${zipFilePath} to be extracted to ${destFolderPath}`)

    this.log(`Extracting app package to ${destFolderPath}...`)
    return unzipper.Open.file(zipFilePath)
      .then(d => d.extract({ path: destFolderPath, concurrency: 5 }))
  }

  async validateConfig (outputPath, configFileName) {
    this.log(`Validating ${configFileName}...`)
    const { valid, errors } = validateJsonWithSchema(path.join(outputPath, configFileName), configFileName)
    if (!valid) {
      const message = `Missing or invalid keys in ${configFileName}: ${JSON.stringify(errors, null, 2)}`
      this.error(message)
    }
  }

  async runTests (outputPath) {
    this.log('Running tests...')
    const { exitCode } = await execa('aio', ['app', 'test'], { cwd: outputPath, stdio: 'inherit' })
    if (exitCode !== 0) {
      process.exitCode = exitCode
      this.error(`The tests failed for the app at ${outputPath}`)
    }
  }
}

InstallCommand.description = `Install an Adobe Developer App Builder packaged app
`

InstallCommand.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'The packaged app output folder path',
    char: 'o',
    default: '.'
  })
}

InstallCommand.args = [
  {
    name: 'path',
    description: 'Path to the app package to install',
    required: true
  }
]

module.exports = InstallCommand
