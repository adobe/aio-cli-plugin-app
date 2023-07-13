/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/* eslint jest/expect-expect: [
  "error",
  {
    "assertFunctionNames": [
        "expect", "expectFlagError", "expectNoErrors", "expectErrors"
    ]
  }
]
*/

const TheCommand = require('../../../src/commands/app/test')
const BaseCommand = require('../../../src/BaseCommand')
const appHelper = require('../../../src/lib/app-helper')

// mocks
jest.mock('../../../src/lib/app-helper')

const mockGetAppExtConfigs = jest.fn()

beforeAll(() => {
  jest.spyOn(BaseCommand.prototype, 'getAppExtConfigs').mockImplementation(mockGetAppExtConfigs)
})

afterAll(() => {
  jest.clearAllMocks()
})

/** @private */
function createMockExtension ({ name, root, actions = [], hooks = {} }) {
  const actionsObject = {}
  actions.forEach(action => {
    actionsObject[action] = {}
  })

  return {
    actions: {
      src: `${root}/src/${name}/actions`
    },
    tests: {
      unit: `${root}/src/${name}/test`,
      e2e: `${root}/src/${name}/e2e`
    },
    hooks,
    root,
    manifest: {
      full: {
        packages: {
          [name]: {
            actions: actionsObject
          }
        }
      }
    }
  }
}

describe('Command Prototype', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
    expect(TheCommand.description).toBeDefined()
  })

  test('description', async () => {
    expect(TheCommand.description).toBeDefined()
  })

  test('aliases', async () => {
    expect(TheCommand.aliases).toEqual([])
  })

  test('flags', async () => {
    expect(typeof TheCommand.flags.unit).toBe('object')
    expect(typeof TheCommand.flags.unit.description).toBe('string')
    expect(TheCommand.flags.unit.default).toBe(false)

    expect(typeof TheCommand.flags.e2e).toBe('object')
    expect(typeof TheCommand.flags.e2e.description).toBe('string')
    expect(TheCommand.flags.e2e.default).toBe(false)

    expect(typeof TheCommand.flags.all).toBe('object')
    expect(typeof TheCommand.flags.all.description).toBe('string')
    expect(TheCommand.flags.all.default).toBe(false)

    expect(typeof TheCommand.flags.extension).toBe('object')
    expect(typeof TheCommand.flags.extension.description).toBe('string')
    expect(TheCommand.flags.extension.char).toBe('e')
    expect(TheCommand.flags.extension.multiple).toBe(true)
    expect(TheCommand.flags.extension.exclusive).toStrictEqual(['action'])

    expect(typeof TheCommand.flags.action).toBe('object')
    expect(typeof TheCommand.flags.action.description).toBe('string')
    expect(TheCommand.flags.action.char).toBe('a')
    expect(TheCommand.flags.action.multiple).toBe(true)
    expect(TheCommand.flags.action.exclusive).toStrictEqual(['extension'])
  })

  describe('bad flags', () => {
    beforeEach(() => {
      mockGetAppExtConfigs.mockClear()
    })

    const expectFlagError = async (argv, message) => {
      const command = new TheCommand([])
      command.argv = argv
      await expect(command.run()).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining(message) }))
    }

    test('unknown', async () => {
      expectFlagError(['--wtf'], 'Nonexistent flag: --wtf\nSee more help with --help')
    })

    test('-a,-e should fail if both flags are present', async () => {
      const errMsg = 'cannot also be provided when using'
      await expectFlagError(['-a', 'my-action', '-e', 'my-extension'], errMsg)
      await expectFlagError(['--extension', 'my-extension', '--action', 'my-action'], errMsg)
      await expectFlagError(['-e', 'my-extension', '--action', 'my-action'], errMsg)
      await expectFlagError(['--extension', 'my-extension', '-a', 'my-action'], errMsg)
    })
  })
})

describe('run', () => {
  let command
  beforeEach(() => {
    command = new TheCommand([])
    command.error = jest.fn()

    appHelper.runScript.mockClear()
    appHelper.runScript.mockResolvedValue({ exitCode: 0 })
  })

  const expectNoErrors = async (argv, runScriptCalledTimes = 1) => {
    mockGetAppExtConfigs.mockReturnValue(
      {
        application: createMockExtension({
          name: 'application',
          root: '/some/root',
          actions: ['action1']
        })
      }
    )

    command.argv = argv
    await command.run()
    expect(appHelper.runScript).toHaveBeenCalledTimes(runScriptCalledTimes)
  }

  const expectErrors = async (argv, errorCode) => {
    const error = new Error('fake error')
    error.exitCode = 42
    appHelper.runScript.mockRejectedValue(error)
    command.argv = argv
    await command.run()
    expect(process.exitCode).toBeGreaterThan(0)
  }

  test('no flags', () => expectNoErrors([]))
  test('--unit', () => expectNoErrors(['--unit']))
  test('--e2e', () => expectNoErrors(['--e2e']))
  test('--all', () => expectNoErrors(['--all'], 2))

  test('--unit fails', () => expectErrors(['--unit']))
  test('--e2e fails', () => expectErrors(['--e2e']))
  test('--all fails', () => expectErrors(['--all']))

  test('empty config', async () => {
    mockGetAppExtConfigs.mockReturnValue({})

    command.argv = []
    await command.run()
    expect(appHelper.runScript).toHaveBeenCalledTimes(0)
  })

  test('action filter match 1 --all', async () => {
    mockGetAppExtConfigs.mockReturnValue(
      {
        application: createMockExtension({
          name: 'application',
          root: '/some/root',
          actions: ['action1', 'another1', 'foo', 'bar']
        })
      }
    )
    command.argv = ['--all', '--action', 'action1']
    await command.run()
    // --all calls unit and e2e test for each action found. in this case 1 action is matched
    expect(appHelper.runScript).toHaveBeenCalledTimes(2)
  })

  test('action filter match 1 --unit', async () => {
    mockGetAppExtConfigs.mockReturnValue(
      {
        application: createMockExtension({
          name: 'application',
          root: '/some/root',
          actions: ['action1', 'another1', 'foo', 'bar']
        })
      }
    )
    command.argv = ['--unit', '--action', 'action1']
    await command.run()
    expect(appHelper.runScript).toHaveBeenCalledTimes(1)
  })

  test('action filter match 1 --e2e', async () => {
    mockGetAppExtConfigs.mockReturnValue(
      {
        application: createMockExtension({
          name: 'application',
          root: '/some/root',
          actions: ['action1', 'another1', 'foo', 'bar']
        })
      }
    )
    command.argv = ['--e2e', '--action', 'action1']
    await command.run()
    expect(appHelper.runScript).toHaveBeenCalledTimes(1)
  })

  test('action filter match none', async () => {
    mockGetAppExtConfigs.mockReturnValue(
      {
        application: createMockExtension({
          name: 'application',
          root: '/some/root',
          actions: ['action1', 'another1', 'foo', 'bar']
        })
      }
    )
    command.argv = ['--all', '--action', 'xray']
    await command.run()
    // --all calls unit and e2e test for each action found. in this case no action is matched
    expect(appHelper.runScript).toHaveBeenCalledTimes(0)
  })

  test('hooks.test found for a config', async () => {
    mockGetAppExtConfigs.mockReturnValue(
      {
        application: createMockExtension({
          name: 'application',
          root: '/some/root',
          actions: ['action1', 'another1', 'foo', 'bar'],
          hooks: {
            test: 'echo test'
          }
        })
      }
    )
    command.argv = ['--all']
    await command.run()
    // since hooks.test is found, it skips all other matches
    expect(appHelper.runScript).toHaveBeenCalledTimes(1)
  })
})
