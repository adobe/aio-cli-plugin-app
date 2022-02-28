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
const { runScript } = require('../../../lib/app-helper')
const { writeObjectToPackageJson, readPackageJson, getNpmDependency, processNpmPackageSpec, TEMPLATE_PACKAGE_JSON_KEY } = require('../../../lib/npm-helper')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:template:install', { provider: 'debug' })

class InstallCommand extends BaseCommand {
  async run () {
    const { args } = this.parse(InstallCommand)
    let templateName

    await runScript('npm', process.cwd(), ['install', args.path])

    const packageJson = await readPackageJson()
    aioLogger.debug(`read package.json: ${JSON.stringify(packageJson, null, 2)}`)

    const packageSpec = processNpmPackageSpec(args.path)
    if (packageSpec.url) {
      // if it's a url, we don't know the package name, so we have to do a reverse lookup
      [templateName] = await getNpmDependency({ urlSpec: packageSpec.url })
    } else {
      templateName = packageSpec.name
    }

    aioLogger.debug(`templateName: ${templateName}`)
    const installedTemplates = packageJson[TEMPLATE_PACKAGE_JSON_KEY] || []
    aioLogger.debug(`installed templates in package.json: ${JSON.stringify(installedTemplates, null, 2)}`)

    if (!installedTemplates.includes(templateName)) {
      installedTemplates.push(templateName)
      aioLogger.debug(`adding new installed templates into package.json: ${JSON.stringify(installedTemplates, null, 2)}`)
      await writeObjectToPackageJson({ [TEMPLATE_PACKAGE_JSON_KEY]: installedTemplates })
    } else {
      aioLogger.debug(`duplicate template, skipping: ${templateName}`)
    }
  }
}

InstallCommand.description = 'Install an Adobe Developer App Builder template'

InstallCommand.examples = [
  'aio app:template:install https://github.com/org/repo',
  'aio app:template:install git+https://github.com/org/repo',
  'aio app:template:install ssh://github.com/org/repo',
  'aio app:template:install git+ssh://github.com/org/repo',
  'aio app:template:install file:../relative/path/to/template/folder',
  'aio app:template:install file:/absolute/path/to/template/folder',
  'aio app:template:install ../relative/path/to/template/folder',
  'aio app:template:install /absolute/path/to/template/folder',
  'aio app:template:install npm-package-name',
  'aio app:template:install npm-package-name@tagOrVersion',
  'aio app:template:install @scope/npm-package-name',
  'aio app:template:install @scope/npm-package-name@tagOrVersion'
]

InstallCommand.aliases = ['app:template:i']

InstallCommand.args = [
  {
    name: 'path',
    description: 'path to the template (npm package name, file path, url). See examples',
    required: true
  }
]

InstallCommand.flags = {
  ...BaseCommand.flags
}

module.exports = InstallCommand
