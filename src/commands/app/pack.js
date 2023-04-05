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
const path = require('node:path')
const fs = require('fs-extra')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:pack', { provider: 'debug' })
const archiver = require('archiver')
const yaml = require('js-yaml')

const DEFAULTS = {
  OUTPUT_ZIP_FILE: 'app.zip',
  ARTIFACTS_FOLDER: 'app-package',
  INSTALL_YAML_FILE: 'install.yaml',
  DD_METADATA_FILE: 'dd-metadata.json'
}

class Pack extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Pack)

    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)
    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)

    const appConfig = this.getFullConfig()

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

    await this.createUIMetadataFile(appConfig)
    await this.createInstallYamlFile(appConfig)

    // 3. copy dist folders phase
    const extensionNames = Object.keys(appConfig.all)
    const distFolders = extensionNames.map(extensionName => path.relative(appConfig.root, appConfig.all[extensionName].app.dist))
    await this.copyPackageFiles(DEFAULTS.ARTIFACTS_FOLDER, [...distFolders, 'hooks'])

    // 4. zip package phase
    this.log(`Zipping package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER}' to '${flags.output}'...`)
    await fs.remove(flags.output)
    await this.zipHelper(DEFAULTS.ARTIFACTS_FOLDER, flags.output)
    this.log('Packaging done.')
  }

  async createUIMetadataFile (appConfig) {
    const uiMetadata = {
      title: 'App Builder Package - Configuration',
      description: 'Data to be gathered from the user in the Distribution Portal',
      type: 'object',
      required: [],
      properties: {}
    }

    appConfig.configManifest?.forEach(uiDefinition => {
      const { label, input, mapToEnv, optional } = uiDefinition
      const isRequired = (!!optional !== true)
      const propertyKey = label.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase()) // camelCase

      if (isRequired) {
        uiMetadata.required.push(propertyKey)
      }

      uiMetadata.properties[propertyKey] = {
        type: input,
        title: label,
        mapToEnv
      }
    })

    await fs.outputFile(path.join(DEFAULTS.ARTIFACTS_FOLDER, DEFAULTS.DD_METADATA_FILE), JSON.stringify(uiMetadata, null, 2))
  }

  async createInstallYamlFile (appConfig) {
    // get extensions
    let extensions
    if (appConfig.implements?.filter(item => item !== 'application').length > 0) {
      extensions = appConfig.implements.map(ext => ({ extensionPointId: ext }))
    }

    // get workspaces
    const workspaces = []
    workspaces.push(appConfig.aio?.project?.workspace?.name)

    // get apis
    let apis
    if (appConfig.aio?.project?.workspace?.details?.services?.length > 0) {
      apis = appConfig.aio.project.workspace.details.services.map(service => ({ code: service.code }))
    }

    // get runtimeManifests
    const runtimeManifest = { packages: {} }
    Object.keys(appConfig.all).forEach(extName => {
      Object.keys(appConfig.all[extName]?.manifest?.full?.packages).forEach(packageName => {
        runtimeManifest.packages[extName] = appConfig.all[extName]?.manifest?.full?.packages[packageName]
      })
    })

    // read name and version from package.json
    const application = {
      id: appConfig.packagejson.name,
      version: appConfig.packagejson.version
    }

    const installJson = {
      $schema: 'http://json-schema.org/draft-07/schema',
      $id: 'https://adobe.io/schemas/app-builder-templates/1',
      application,
      extensions,
      workspaces,
      apis,
      runtime: true, // always true for App Builder apps
      runtimeManifest
    }

    const installYaml = yaml.dump(installJson)
    await fs.outputFile(path.join(DEFAULTS.ARTIFACTS_FOLDER, DEFAULTS.INSTALL_YAML_FILE), installYaml)
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

Pack.description = `Package a new Adobe Developer App for distribution

This will always force a rebuild unless --no-force-build is set.
`

Pack.flags = {
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

Pack.args = [
  {
    name: 'path',
    description: 'Path to the app directory to package',
    default: '.'
  }
]

module.exports = Pack
