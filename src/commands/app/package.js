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
const { resolve } = require('node:path')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:package', { provider: 'debug' })

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

    // build phase
    if (flags.build) {
      await this.config.runCommand('app:build', [])
    } else {
      aioLogger.debug('skipping build')
    }

    this.log('TODO: create DD Metadata json based on configuration definition in app.config.yaml')
    this.log('TODO: create install.yaml based on package.json, .aio, app.config.yaml, etc')
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
    default: 'app.zip'
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
