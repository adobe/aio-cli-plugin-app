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
const execa = require('execa')
const { loadConfigFile, writeFile } = require('../../lib/import-helper')
const { getObjectValue } = require('../../lib/app-helper')

const DEFAULTS = {
  OUTPUT_ZIP_FILE: 'app.zip',
  ARTIFACTS_FOLDER: 'app-package',
  DEPLOY_YAML_FILE: 'deploy.yaml'
}

class Pack extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Pack)

    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)
    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)

    const appConfig = this.getFullConfig()
    console.log(JSON.stringify(appConfig, null, 2))

    // resolve to absolute path before any chdir
    flags.output = path.resolve(flags.output)

    // change the cwd if necessary
    if (args.path !== '.') {
      const resolvedPath = path.resolve(args.path)
      process.chdir(resolvedPath)
      aioLogger.debug(`changed current working directory to: ${resolvedPath}`)
    }

    // 1. create artifacts phase
    this.log('Creating package artifacts...')
    await fs.remove(DEFAULTS.ARTIFACTS_FOLDER)
    await fs.ensureDir(DEFAULTS.ARTIFACTS_FOLDER)

    // ACNA-2038
    // not artifacts folder should exist before we fire the event
    await this.config.runHook('pre-pack', { appConfig, artifactsFolder: DEFAULTS.ARTIFACTS_FOLDER })

    // 2. copy files to package phase
    this.log('Copying files...')
    const fileList = await this.filesToPack()
    await this.copyPackageFiles(DEFAULTS.ARTIFACTS_FOLDER, fileList)

    // 3. add/modify artifacts phase
    this.log('Creating configuration files...')
    await this.createDeployYamlFile(appConfig)
    await this.addCodeDownloadAnnotation(appConfig)
    // doing this before zip so other things can be added to the zip
    await this.config.runHook('post-pack', { appConfig, artifactsFolder: DEFAULTS.ARTIFACTS_FOLDER })

    // 4. zip package phase
    this.log(`Zipping package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER}' to '${flags.output}'...`)
    await fs.remove(flags.output)
    await this.zipHelper(DEFAULTS.ARTIFACTS_FOLDER, flags.output)

    this.log('Packaging done.')
  }

  /**
   * Creates the deploy.yaml file
   *
   * @param {object} appConfig the app's configuration file
   */
  async createDeployYamlFile (appConfig) {
    // get extensions
    let extensions
    if (appConfig.implements?.filter(item => item !== 'application').length > 0) {
      extensions = appConfig.implements.map(ext => ({ extensionPointId: ext }))
    }

    // get workspaces
    let workspaces
    if (appConfig.aio?.project?.workspace?.name) {
      workspaces = []
      workspaces.push(appConfig.aio?.project?.workspace?.name)
    }

    // get apis
    let apis
    if (appConfig.aio?.project?.workspace?.details?.services?.length > 0) {
      apis = appConfig.aio.project.workspace.details.services.map(service => ({ code: service.code }))
    }

    // read name and version from package.json
    const application = {
      id: appConfig.packagejson.name,
      version: appConfig.packagejson.version
    }

    let meshConfig
    // ACNA-2041
    // get the mesh config by running the `aio api-mesh:get` command (if available)
    // in the interim, we need to process the output to get the proper json config
    // TODO: send a PR to their plugin to have a `--json` flag
    const command = await this.config.findCommand('api-mesh:get')
    if (command) {
      const { stdout } = await execa('aio', ['api-mesh', 'get'], { cwd: process.cwd() })
      // until we get the --json flag, we parse the output
      const idx = stdout.indexOf('{')
      meshConfig = JSON.parse(stdout.substring(idx))
    } else {
      aioLogger.debug('api-mesh:get command was not found, meshConfig is not available for app:pack')
    }

    const deployJson = {
      $schema: 'http://json-schema.org/draft-07/schema',
      $id: 'https://adobe.io/schemas/app-builder-templates/1',
      application,
      extensions,
      workspaces,
      apis,
      meshConfig,
      runtime: true // always true for App Builder apps
    }

    await writeFile(
      path.join(DEFAULTS.ARTIFACTS_FOLDER, DEFAULTS.DEPLOY_YAML_FILE),
      yaml.dump(deployJson),
      { overwrite: true })
  }

  /**
   * Copies a list of files to a folder.
   *
   * @param {string} destinationFolder the destination folder for the files
   * @param {Array<string>} filesList a list of files to copy
   */
  async copyPackageFiles (destinationFolder, filesList) {
    for (const src of filesList) {
      const dest = path.join(destinationFolder, src)
      if (await fs.pathExists(src)) {
        aioLogger.debug(`Copying ${src} to ${dest}`)
        await fs.copy(src, dest)
      } else {
        aioLogger.debug(`Skipping copy for ${src} (path does not exist)`)
      }
    }
  }

  /**
   * Zip a file/folder using archiver
   *
   * @param {string} filePath path of file/folder to zip
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

  /**
   * Gets a list of files that are to be packed.
   *
   * This runs `npm pack` to get the list.
   *
   * @param {string} workingDirectory the working directory to run `npm pack` in
   * @returns {Array<string>} a list of files that are to be packed
   */
  async filesToPack (workingDirectory = process.cwd()) {
    const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], { cwd: workingDirectory })

    const { files } = JSON.parse(stdout)[0]
    return files.map(file => file.path)
  }

  /**
   * An annotation called code-download will be added to all actions in app.config.yaml
   * (and linked yaml configs for example in extensions). This value will be set to false.
   * The annotation will by default be true if not set.
   *
   * @param {object} appConfig the app's configuration file
   */
  async addCodeDownloadAnnotation (appConfig) {
    // get the configFiles that have runtime manifests
    const configFiles = []
    for (const [, value] of Object.entries(appConfig.includeIndex)) {
      const { key } = value
      if (key === 'runtimeManifest' || key === 'application.runtimeManifest') {
        configFiles.push(value)
      }
    }

    // for each configFile, we modify each action to have the "code-download: false" annotation
    for (const configFile of configFiles) {
      const configFilePath = path.join(DEFAULTS.ARTIFACTS_FOLDER, configFile.file)
      const { values } = loadConfigFile(configFilePath)

      const runtimeManifest = getObjectValue(values, configFile.key)
      for (const [, pkgManifest] of Object.entries(runtimeManifest.packages)) {
        // key is the package name (unused), value is the package manifest. we iterate through each package's "actions"
        for (const [, actionManifest] of Object.entries(pkgManifest.actions)) {
          // key is the action name (unused), value is the action manifest. we add the "code-download: false" annotation
          actionManifest.annotations['code-download'] = false
        }
      }

      // write back the modified manifest to disk
      await writeFile(configFilePath, yaml.dump(values), { overwrite: true })
    }
  }
}

Pack.description = `Package a new Adobe Developer App for distribution
`

Pack.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'The packaged app output file path',
    char: 'o',
    default: DEFAULTS.OUTPUT_ZIP_FILE
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
