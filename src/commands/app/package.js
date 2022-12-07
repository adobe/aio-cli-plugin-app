/*
Copyright 2022 Adobe. All rights reserved.
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
const path = require('node:path')
const fs = require('fs-extra')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:package', { provider: 'debug' })
const archiver = require('archiver')

const DEFAULTS = {
  OUTPUT_ZIP_FILE: 'app.zip',
  ARTIFACTS_FOLDER: 'app-package',
  INSTALL_YAML_FILE: 'install.yaml',
  UI_METADATA_FILE: 'ui-metadata.json'
}

class Package extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Package)

    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)
    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)

    if (flags.output) {
      // resolve to absolute path before any chdir
      flags.output = path.resolve(flags.output)
    }

    // change the cwd if necessary
    if (args.path !== '.') {
      const resolvedPath = path.resolve(args.path)
      process.chdir(resolvedPath)
      aioLogger.debug(`changed current working directory to: ${resolvedPath}`)
    }

    // 1. build phase
    if (flags.build) {
      this.log('Building app...')
      await this.config.runCommand('app:build', [])
    } else {
      this.log('Skipping build.')
    }

    // 2. create artifacts phase
    this.log('Creating package artifacts...')
    await fs.remove(DEFAULTS.ARTIFACTS_FOLDER)
    await fs.ensureDir(DEFAULTS.ARTIFACTS_FOLDER)

    await this.createUIMetadataFile()
    await this.createInstallYamlFile()
    await this.copyPackageFiles(DEFAULTS.ARTIFACTS_FOLDER, ['dist', 'hooks']) // TODO: the dist folder is specified in the config, hooks TBD

    // 3. zip package phase
    this.log(`Zipping package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER}' to '${flags.output}'...`)
    await fs.remove(flags.output)
    await this.zipHelper(DEFAULTS.ARTIFACTS_FOLDER, flags.output)
    this.log('Packaging done.')
  }

  async createUIMetadataFile () {
    this.log('TODO: create DD Metadata json based on configuration definition in app.config.yaml')
    await fs.outputFile(path.join(DEFAULTS.ARTIFACTS_FOLDER,DEFAULTS.UI_METADATA_FILE), '{}')
  }

  async createInstallYamlFile () {
    this.log('TODO: create install.yaml based on package.json, .aio, app.config.yaml, etc')
    await fs.outputFile(path.join(DEFAULTS.ARTIFACTS_FOLDER, DEFAULTS.INSTALL_YAML_FILE), '# TODO')
  }

  async copyPackageFiles (destinationFolder, filesList) {
    const ignoreFiles = ['.DS_Store']
    const filterFunc = (src) => {
      return !(ignoreFiles.includes(path.basename(src)))
    }

    for (const src of filesList) {
      const dest = path.join(destinationFolder, src)
      if (await fs.pathExists(src)) {
        aioLogger.debug(`Copying ${src} to ${dest}`)
        await fs.copy(src, dest, { filter: filterFunc })
      } else {
        aioLogger.debug(`Skipping copy for ${src} (path does not exist)`)
      }
    }
  }

  /**
   * Zip a file/folder using archiver
   *
   * @param {string} filePath path of file.folder to zip
   * @param {string} out output path
   * @param {boolean} pathInZip internal path in zip
   * @returns {Promise} returns with a blank promise when done
   */
  zipHelper (filePath, out, pathInZip = false) {
    aioLogger.debug(`Creating zip of file/folder '${filePath}'`)
    const stream = fs.createWriteStream(out)
    const archive = archiver('zip', { zlib: { level: 9 } })

    return new Promise((resolve, reject) => {
      stream.on('close', () => resolve())
      archive.pipe(stream)
      archive.on('error', err => reject(err))

      let stats
      try {
        stats = fs.lstatSync(filePath) // throws if enoent
      } catch (e) {
        archive.destroy()
        reject(e)
      }

      if (stats.isDirectory()) {
        archive.directory(filePath, pathInZip)
      } else { //  if (stats.isFile()) {
        archive.file(filePath, { name: pathInZip || path.basename(filePath) })
      }
      archive.finalize()
    })
  }
}

Package.description = `Package a new Adobe I/O App for distribution

This will always force a rebuild unless --no-force-build is set.
`

Package.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'The packaged app output file path',
    char: 'o',
    default: DEFAULTS.OUTPUT_ZIP_FILE
  }),
  build: Flags.boolean({
    description: '[default: true] Run the build phase before packaging',
    default: true,
    allowNo: true
  }),
  'force-build': Flags.boolean({
    description: '[default: true] Force a build even if one already exists',
    exclusive: ['no-build'], // no-build
    default: true,
    allowNo: true
  })
}

Package.args = [
  {
    name: 'path',
    description: 'Path to the app directory to package',
    default: '.'
  }
]

module.exports = Package
