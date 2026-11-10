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
const { PackHelper, DEFAULTS } = require('../../lib/pack-helper')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:pack', { provider: 'debug' })

class Pack extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Pack)

    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)
    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)

    if (!flags['no-scan']) {
      const cwd = process.cwd()
      let result
      try {
        result = await this.config.runCommand('app:scan', [
          args.path,
          ...(flags.verbose ? ['--verbose'] : [])
        ])
      } catch (error) {
        this.error(`${error.message}\nIf you still want to proceed with packing, use aio app pack --no-scan.`)
      } finally {
        process.chdir(cwd)
      }
      if (!['PASSED', 'PASSED_WITH_WARNING', 'SKIPPED'].includes(result?.status)) {
        this.error('Scan did not pass. If you still want to proceed with packing, use aio app pack --no-scan.')
      }
    }

    return new PackHelper(this).pack({
      appPath: args.path,
      output: flags.output,
      includeLockFile: flags['lock-file'],
      verbose: flags.verbose
    })
  }
}

Pack.description = `This command will support packaging apps for redistribution.
`

Pack.flags = {
  ...BaseCommand.flags,
  'no-scan': Flags.boolean({
    description: 'Skip malware scanning before packaging the app',
    default: false
  }),
  'lock-file': Flags.boolean({
    description: 'Include the package-lock.json file in the packaged app. When disabled, compatibility validation is skipped since the provisioner will use npm install instead of npm ci.',
    default: true,
    allowNo: true
  }),
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
