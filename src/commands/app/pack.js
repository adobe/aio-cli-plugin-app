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
const path = require('node:path')
const fs = require('fs-extra')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:pack', { provider: 'debug' })
const archiver = require('archiver')
const yaml = require('js-yaml')
const execa = require('execa')
const { loadConfigFile, writeFile } = require('../../lib/import-helper')
const { getObjectValue } = require('../../lib/app-helper')
const ora = require('ora')
const chalk = require('chalk')
const junk = require('junk')

// eslint-disable-next-line node/no-missing-require
const libConfigNext = require('@adobe/aio-cli-lib-app-config-next')

const DIST_FOLDER = 'dist'
const DEFAULTS = {
  OUTPUT_ZIP_FILE_PATH: path.join(DIST_FOLDER, 'app.zip'),
  ARTIFACTS_FOLDER_PATH: path.join(DIST_FOLDER, 'app-package'),
  DEPLOY_YAML_FILE_NAME: 'deploy.yaml'
}

class Pack extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Pack)

    this.preRelease()

    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)
    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)

    // this will also validate the app.config.yaml
    const appConfig = await libConfigNext.load()

    // resolve to absolute path before any chdir
    const outputZipFile = path.resolve(flags.output)

    // change the cwd if necessary
    if (args.path !== '.') {
      const resolvedPath = path.resolve(args.path)
      process.chdir(resolvedPath)
      aioLogger.debug(`changed current working directory to: ${resolvedPath}`)
    }

    // get all 'dist' locations of all extensions (relative to the current working directory)
    const distLocations = Object.entries(appConfig.all)
      .map(([, extConfig]) => path.relative(process.cwd(), extConfig.app.dist))

    try {
      // 1. create artifacts phase
      this.spinner.start(`Creating package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER_PATH}'...`)
      await fs.emptyDir(DEFAULTS.ARTIFACTS_FOLDER_PATH)
      this.spinner.succeed(`Created package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER_PATH}'`)

      // ACNA-2038
      // not artifacts folder should exist before we fire the event

      const hookResults = await this.config.runHook('pre-pack', { appConfig, artifactsFolder: DEFAULTS.ARTIFACTS_FOLDER_PATH })
      if (hookResults?.failures?.length > 0) {
        // output should be "Error : <plugin-name> : <error-message>\n" for each failure
        this.error(hookResults.failures.map(f => `${f.plugin.name} : ${f.error.message}`).join('\nError: '), { exit: 1 })
      }

      // 1a. Get file list to pack
      const fileList = await this.filesToPack({ filesToExclude: [flags.output, DEFAULTS.DIST_FOLDER, ...distLocations] })
      this.log('=== Files to pack ===')
      fileList.forEach((file) => {
        this.log(`  ${file}`)
      })
      this.log('=====================')

      // 2. copy files to package phase
      this.spinner.start('Copying project files...')

      await this.copyPackageFiles(DEFAULTS.ARTIFACTS_FOLDER_PATH, fileList)
      this.spinner.succeed('Copied project files')

      // 3. add/modify artifacts phase
      this.spinner.start('Creating configuration files...')
      await this.createDeployYamlFile(appConfig)
      this.spinner.succeed('Created configuration files')

      this.spinner.start('Adding code-download annotations...')
      await this.addCodeDownloadAnnotation(appConfig)
      this.spinner.succeed('Added code-download annotations')

      // doing this before zip so other things can be added to the zip
      await this.config.runHook('post-pack', { appConfig, artifactsFolder: DEFAULTS.ARTIFACTS_FOLDER_PATH })

      // 4. zip package phase
      this.spinner.start(`Zipping package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER_PATH}' to '${outputZipFile}'...`)
      await fs.remove(outputZipFile)
      await this.zipHelper(DEFAULTS.ARTIFACTS_FOLDER_PATH, outputZipFile)
      this.spinner.succeed(`Zipped package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER_PATH}' to '${outputZipFile}'`)

      // 5. finally delete the artifacts folder
      this.spinner.start(`Deleting package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER_PATH}'...`)
      await fs.remove(DEFAULTS.ARTIFACTS_FOLDER_PATH)
      this.spinner.succeed(`Deleted package artifacts folder '${DEFAULTS.ARTIFACTS_FOLDER_PATH}'`)
    } catch (e) {
      this.spinner.fail(e.message)
      this.error(flags.verbose ? e : e.message)
    }

    this.spinner.succeed('Packaging done.')
  }

  get spinner () {
    if (!this._spinner) {
      this._spinner = ora()
    }
    return this._spinner
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

    if (!application.version.match(/^[0-9]+.[0-9]+.[0-9]+$/)) {
      throw new Error('Application version format must be "X.Y.Z", where X, Y, and Z are non-negative integers.')
    }

    let meshConfig
    // ACNA-2041
    // get the mesh config by running the `aio api-mesh:get` command (if available)
    // in the interim, we need to process the output to get the proper json config
    // TODO: send a PR to their plugin to have a `--json` flag
    const command = await this.config.findCommand('api-mesh:get')
    if (command) {
      try {
        this.spinner.start('Getting api-mesh config...')
        const { stdout } = await execa('aio', ['api-mesh', 'get'], { cwd: process.cwd() })
        // until we get the --json flag, we parse the output
        const idx = stdout.indexOf('{')
        meshConfig = JSON.parse(stdout.substring(idx)).meshConfig
        aioLogger.debug(`api-mesh:get - ${JSON.stringify(meshConfig, null, 2)}`)
        this.spinner.succeed('Got api-mesh config')
      } catch (err) {
        // Ignore error if no mesh found, otherwise throw
        if (err?.stderr.includes('Error: Unable to get mesh config. No mesh found for Org')) {
          aioLogger.debug('No api-mesh config found')
        } else {
          console.error(err)
          throw err
        }
      }
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
      path.join(DEFAULTS.ARTIFACTS_FOLDER_PATH, DEFAULTS.DEPLOY_YAML_FILE_NAME),
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
   * @param {object} options the options for the method
   * @param {Array<string>} options.filesToExclude a list of files to exclude
   * @param {string} options.workingDirectory the working directory to run `npm pack` in
   * @returns {Array<string>} a list of files that are to be packed
   */
  async filesToPack ({ filesToExclude = [], workingDirectory = process.cwd() } = {}) {
    const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], { cwd: workingDirectory })

    const noJunkFiles = (file) => {
      const isJunkFile = junk.is(file)
      if (isJunkFile) {
        aioLogger.debug(`junk file (omitted from pack): ${file}`)
      }

      return !isJunkFile
    }

    const noDotFiles = (file) => {
      const isDotFile = /^\..*/.test(file)
      if (isDotFile) {
        aioLogger.debug(`hidden dotfile (omitted from pack): ${file}`)
      }

      return !isDotFile
    }

    const { files } = JSON.parse(stdout)[0]
    return files
      .map(file => file.path)
      .filter(file => !filesToExclude.includes(file))
      .filter(noJunkFiles) // no junk files like .DS_Store
      .filter(noDotFiles) // no files that start with a '.'
  }

  /**
   * An annotation called code-download will be added to all actions in app.config.yaml
   * (and linked yaml configs for example in extensions). This value will be set to false.
   * The annotation will by default be true if not set.
   *
   * @param {object} appConfig the app's configuration file
   */
  async addCodeDownloadAnnotation (appConfig) {
    // get each annotation key relative to the file it is defined in
    /// iterate only over extensions that have actions defined
    const fileToAnnotationKey = {}
    Object.entries(appConfig.all)
      .filter(([_, extConf]) => extConf.manifest?.full?.packages)
      .forEach(([ext, extConf]) => {
        Object.entries(extConf.manifest.full.packages)
          .filter(([pkg, pkgConf]) => pkgConf.actions)
          .forEach(([pkg, pkgConf]) => {
            Object.entries(pkgConf.actions).forEach(([action, actionConf]) => {
              const baseFullKey = ext === 'application'
                ? `application.runtimeManifest.packages.${pkg}.actions.${action}`
                : `extensions.${ext}.runtimeManifest.packages.${pkg}.actions.${action}`

              let index
              if (actionConf.annotations) {
                index = appConfig.includeIndex[`${baseFullKey}.annotations`]
              } else {
                // the annotation object is not defined, take the parent key
                index = appConfig.includeIndex[baseFullKey]
              }
              if (!fileToAnnotationKey[index.file]) {
                fileToAnnotationKey[index.file] = []
              }
              fileToAnnotationKey[index.file].push(index.key) // index.key is relative to the file
            })
          })
      })

    // rewrite config files
    for (const [file, keys] of Object.entries(fileToAnnotationKey)) {
      const configFilePath = path.join(DEFAULTS.ARTIFACTS_FOLDER_PATH, file)
      const { values } = loadConfigFile(configFilePath)

      keys.forEach(key => {
        const object = getObjectValue(values, key)
        if (key.endsWith('.annotations') || key === 'annotations') {
          // object is the annotations object
          object['code-download'] = false
        } else {
          // annotation object is not defined, the object is the action object
          object.annotations = { 'code-download': false }
        }
      })

      // write back the modified manifest to disk
      await writeFile(configFilePath, yaml.dump(values), { overwrite: true })
    }
  }
}

Pack.hidden = true // hide from help for pre-release

Pack.description = chalk.yellow(`(Pre-release) This command will support packaging apps for redistribution.
`)

Pack.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'The packaged app output file path',
    char: 'o',
    default: DEFAULTS.OUTPUT_ZIP_FILE_PATH
  })
}

Pack.args =
  {
    path: Args.string({
      description: 'Path to the app directory to package',
      default: '.'
    })
  }

module.exports = Pack
