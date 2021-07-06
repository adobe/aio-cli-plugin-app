/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { runScript } = require('../../lib/app-helper')
const { flags } = require('@oclif/command')
const BaseCommand = require('../../BaseCommand')
const chalk = require('chalk')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:test', { provider: 'debug' })
const path = require('path')

class Test extends BaseCommand {
  async run () {
    const { flags } = this.parse(Test)
    let { all, unit, e2e, action, extension } = flags

    // 'all' overrides the setting of either the unit or e2e flag
    if (all) {
      unit = true
      e2e = true
    } else if (!unit && !e2e) {
      // 'all' not set; we check if neither is set, and default to 'unit'
      unit = true
    }

    const buildConfigs = this.getAppExtConfigs({ extension })
    aioLogger.debug(`run buildConfigs:${JSON.stringify(buildConfigs, null, 2)}`)

    const totalResults = []
    let exitCode = 0
    for (const [extensionName, extensionConfig] of Object.entries(buildConfigs)) {
      const results = await this.runExtensionTest(extensionName, extensionConfig, { unit, e2e, action })
      totalResults.push(...results)

      const failures = results.filter(result => !result.passed)
      if (failures.length > 0) {
        exitCode += failures.length
      }
    }

    this.printReport(totalResults)
    process.exitCode = exitCode
  }

  printReport (totalResults) {
    if (totalResults.length > 0) {
      const greenCheckMark = chalk.green('√')
      const redX = chalk.red('×')

      this.log('app:test results:')
      totalResults.forEach(result => {
        const name = chalk.gray(`${result.extensionName}/${result.actionName} (${result.type})`)
        this.log(`    ${result.passed ? greenCheckMark : redX} ${name}`)
      })
    } else {
      this.log('No test results.')
    }
  }

  normalizedActionList (extensionConfig) {
    const actionList = []
    const packages = extensionConfig.manifest.full.packages
    for (const [packageName, pkg] of Object.entries(packages)) {
      const actions = pkg.actions

      for (const actionName of Object.keys(actions)) {
        actionList.push([packageName, actionName])
      }
    }
    return actionList
  }

  escapeBackslashes (pathString) {
    // for Jest:
    // - replace backslashes with forward slashes,
    // - OR on Windows you need to escape forward slashes
    return pathString.replace(/\\/g, '/')
  }

  testFolders (extensionConfig) {
    const extRoot = path.dirname(extensionConfig.actions.src)
    const relativeRoot = path.relative(extensionConfig.root, extRoot)
    return { // add leading period path for jest
      unit: './' + this.escapeBackslashes(path.join(relativeRoot, 'test')),
      e2e: './' + this.escapeBackslashes(path.join(relativeRoot, 'e2e'))
    }
  }

  filterActions (actionFilters, extensionConfig, flags) {
    const { unit, e2e } = flags
    const commandList = []
    const { unit: unitTestFolder, e2e: e2eTestFolder } = this.testFolders(extensionConfig)

    aioLogger.debug(`filterActions actionFilters:${actionFilters} extensionConfig:${JSON.stringify(extensionConfig, null, 2)} flags:${JSON.stringify(flags)}`)
    aioLogger.debug(`filterActions:testFolders unit:${unitTestFolder} e2e:${e2eTestFolder}`)

    // filter by action(s)
    const actionList = this.normalizedActionList(extensionConfig)
      .filter(([packageName, actionName]) => {
        const actionFullName = `${packageName}/${actionName}`
        aioLogger.debug(`filterActions actionFullName:${actionFullName}`)

        return actionFilters
          .filter(actionFilter => {
            return actionFullName.includes(actionFilter)
          })
          .length > 0
      })

    actionList.forEach(([, actionName]) => {
      // if the action is foo: matches foo.*.test.js
      const pattern = `.*/*${actionName}.*\\.test\\.js`
      aioLogger.debug(`filterActions pattern:${pattern}`)

      if (unit) {
        commandList.push({
          actionName,
          type: 'unit',
          command: 'jest',
          args: ['--passWithNoTests', '--testPathPattern', `${unitTestFolder}/${pattern}`]
        })
      }
      if (e2e) {
        commandList.push({
          actionName,
          type: 'e2e',
          command: 'jest',
          args: ['--passWithNoTests', '--testPathPattern', `${e2eTestFolder}/${pattern}`]
        })
      }
    })

    return commandList
  }

  async runExtensionTest (extensionName, extensionConfig, flags) {
    const { unit, e2e, action } = flags
    const commandList = []
    const { unit: unitTestFolder, e2e: e2eTestFolder } = this.testFolders(extensionConfig)
    const actionName = '*'

    aioLogger.debug(`runExtensionTest extensionName:${extensionName} extensionConfig:${JSON.stringify(extensionConfig, null, 2)} flags:${JSON.stringify(flags)}`)
    aioLogger.debug(`runExtensionTest:testFolders unit:${unitTestFolder} e2e:${e2eTestFolder}`)
    aioLogger.debug(`runExtensionTest hooks.test:${extensionConfig.hooks.test}`)

    // if hooks.test available, we run that instead
    if (extensionConfig.hooks.test) {
      commandList.push({
        actionName,
        type: 'hook',
        command: extensionConfig.hooks.test
      })
    } else if (action) { // filter by ext/action name
      const commands = await this.filterActions(action, extensionConfig, flags)
      if (commands.length === 0) {
        this.log(`No package and action matches action filter(s): ${JSON.stringify(action)}`)
      }
      commandList.push(...commands)
    } else { // run everything
      if (unit) {
        commandList.push({
          actionName,
          type: 'unit',
          command: 'jest',
          args: ['--passWithNoTests', unitTestFolder]
        })
      }
      if (e2e) {
        commandList.push({
          actionName,
          type: 'e2e',
          command: 'jest',
          args: ['--passWithNoTests', e2eTestFolder]
        })
      }
    }

    const results = []
    for (const cmd of commandList) {
      this.log(chalk.yellow(`${extensionName}/${cmd.actionName} (${cmd.type}) - running tests...`))

      aioLogger.debug(`runExtensionTest:runScript cwd:${extensionConfig.root} cmd:${JSON.stringify(cmd)}`)
      try {
        await runScript(cmd.command, extensionConfig.root, cmd.args)
        results.push({ ...cmd, extensionName, passed: true })
      } catch (e) {
        results.push({ ...cmd, extensionName, passed: false })
        aioLogger.debug(`runExtensionTest:runScript exception:${e.toString()}`)
      }
      this.log()
    }

    return results
  }
}

Test.flags = {
  extension: flags.string({
    char: 'e',
    description: 'the extension(s) to test',
    exclusive: ['action'],
    multiple: true
  }),
  action: flags.string({
    char: 'a',
    description: 'the action(s) to test',
    exclusive: ['extension'],
    multiple: true
  }),
  all: flags.boolean({
    description: 'run both unit and e2e tests',
    default: false
  }),
  e2e: flags.boolean({
    description: 'run e2e tests',
    default: false
  }),
  unit: flags.boolean({
    description: 'run unit tests',
    default: false
  })
}

Test.description = `Run tests for an Adobe I/O App
If no flags are specified, by default only unit-tests are run.

For the --action flag, it tries a substring search on the 'extension-name/action-name' pair for an action.
For the --extension flag, it tries a substring search on the 'extension-name' only.
If the extension has a hook called 'test' in its 'ext.config.yaml', the script specified will be run instead.

`
module.exports = Test
