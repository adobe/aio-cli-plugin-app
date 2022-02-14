/*
 * Copyright 2022 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const BaseCommand = require('../../../BaseCommand')
const { runScript, writeObjectToPackageJson, readPackageJson, getNpmPackageName } = require('../../../lib/app-helper')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:template:install', { provider: 'debug' })

const TEMPLATE_PACKAGE_JSON_KEY = 'aio-app-builder-templates'

class InstallCommand extends BaseCommand {
  async run () {
    const { args } = this.parse(InstallCommand)

    await runScript('npm', process.cwd(), ['install', args.path])

    const packageJson = await readPackageJson()
    aioLogger.debug(`read package.json: ${JSON.stringify(packageJson, null, 2)}`)

    const templateName = await getNpmPackageName(args.path) // TODO:
    aioLogger.debug(`getNpmPackageName: ${templateName}`)
    const installedTemplates = packageJson[TEMPLATE_PACKAGE_JSON_KEY] || []
    aioLogger.debug(`installed templates in package.json: ${JSON.stringify(installedTemplates, null, 2)}`)

    if (!installedTemplates.includes(args.path)) {
      installedTemplates.push(templateName)
      aioLogger.debug(`adding new installed templates into package.json: ${JSON.stringify(installedTemplates, null, 2)}`)
      await writeObjectToPackageJson({ [TEMPLATE_PACKAGE_JSON_KEY]: installedTemplates })
    } else {
      aioLogger.debug(`duplicate template, skipping: ${templateName}`)
    }
  }
}

InstallCommand.description = 'Install an Adobe Developer App Builder template'

InstallCommand.aliases = ['template:i']

InstallCommand.args = [
  {
    name: 'path',
    description: 'path to the template (npm package name, file path, url). See https://docs.npmjs.com/cli/v6/commands/npm-install',
    required: true
  }
]

InstallCommand.flags = {
  ...BaseCommand.flags
}

module.exports = InstallCommand
