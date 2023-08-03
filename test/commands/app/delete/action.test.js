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
const fs = require('fs-extra')

const TheCommand = require('../../../../src/commands/app/delete/action')
const BaseCommand = require('../../../../src/BaseCommand')
const cloneDeep = require('lodash.clonedeep')
const path = require('path')

// application.runtimeManifest.packages.pkga.actions.0
const mockConfigData = {
  app: {
    hasBackend: true,
    topLevel: 3
  },
  includeIndex: {
    application: {
      runtimeManifest: {
        packages: {
          pkga: {
            actions: [{ src: '/actions', dist: '/dist/actions' }]
          }
        }
      }
    }
  },
  all: {
    application: {
      app: {
        hasBackend: true,
        inside: 4345
      },
      root: '/',
      actions: {
        src: 'actions'
      },
      tests: {
        unit: 'test',
        e2e: 'e2e'
      },
      runtimeManifest: {
        packages: {
          pkga: {
            actions: [
              { src: '/actions', dist: '/dist/actions' }
            ]
          }
        }
      },
      manifest: {
        full: {
          packages: {
            pkga: {
              actions: [
                { src: '/actions', dist: '/dist/actions' }
              ]
            }
          }
        }
      }
    }
  }
}

jest.mock('fs-extra')
jest.mock('inquirer', () => {
  return {
    Separator: class {}
  }
})

let command

beforeEach(() => {
  fs.ensureDirSync.mockClear()
  fs.removeSync.mockClear()

  command = new TheCommand([])
  command.log = jest.fn()
  command.appConfig = cloneDeep(mockConfigData)
  command.buildOneExt = jest.fn()
  command.getAppExtConfigs = jest.fn()
  command.getLibConsoleCLI = jest.fn()
})

describe('command interface, flags', () => {
  test('exports', async () => {
    expect(typeof TheCommand).toEqual('function')
    expect(TheCommand.prototype instanceof BaseCommand).toBeTruthy()
    expect(typeof TheCommand.flags).toBe('object')
  })

  test('--yes without <action-name>', async () => {
    const command = new TheCommand(['--yes'])
    expect(typeof command.run).toBe('function')
    await expect(command.run()).rejects.toThrow('<action-name> must also be provided')
  })
})

describe('good flags', () => {
  test('no args - no actions', async () => {
    command.argv = []
    command.getAllActions = () => {
      return { actions: [], actionsByImpl: {} }
    }
    await expect(command.run()).rejects.toThrow('no actions')
  })

  test('fakeActionName --yes no actions present', async () => {
    command.argv = ['fakeActionName', '--yes']
    command.getAllActions = () => {
      return { actions: [], actionsByImpl: {} }
    }
    await expect(command.run()).rejects.toThrow('no actions')
  })

  test('delete actions, some dont exist', async () => {
    command.argv = ['a,b', '--yes']
    command.getAllActions = () => {
      return { actions: [{ name: 'a' }], actionsByImpl: {} }
    }
    await expect(command.run()).rejects.toThrow('action(s) \'b\' not found')

    command.argv = ['a,b,c', '--yes']
    await expect(command.run()).rejects.toThrow('action(s) \'b,c\' not found')
  })

  test('fakeActionName folder', async () => {
    command.argv = ['fakeActionName']
    command.prompt = () => {
      return {
        deleteAction: true,
        actions: [{ name: 'fakeActionName', path: 'dir/file.js' }]
      }
    }
    fs.statSync.mockReturnValue({ isFile: () => true })
    command.getAllActions = () => {
      return { actions: [{ name: 'fakeActionName', path: 'dir/file.js' }], actionsByImpl: { } }
    }
    await command.run()
    expect(fs.removeSync).toHaveBeenLastCalledWith('dir')
  })

  test('fakeActionName', async () => {
    command.argv = ['fakeActionName']
    command.prompt = () => {
      return {
        deleteAction: true,
        actions: [{ path: 'fakeActionName' }]
      }
    }
    fs.statSync.mockReturnValue({ isFile: () => true })
    const dirnameSpy = jest.spyOn(path, 'dirname').mockReturnValueOnce('mock-dirname')
    command.getAllActions = () => {
      return { actions: [{ name: 'fakeActionName', path: 'boom.js' }], actionsByImpl: { } }
    }
    await command.run()
    expect(fs.removeSync).toHaveBeenLastCalledWith('mock-dirname')
    dirnameSpy.mockRestore()
  })

  test('fakeActionName hasBackend: false', async () => {
    command.argv = ['fakeActionName']
    command.prompt = () => {
      return {
        deleteAction: true,
        actions: [{ path: 'fakeActionName' }]
      }
    }
    fs.statSync = () => {
      return { isFile: () => true }
    }
    const dirnameSpy = jest.spyOn(path, 'dirname').mockReturnValueOnce('mock-dirname')
    command.getAllActions = () => {
      return { actions: [{ name: 'fakeActionName', path: 'boom.js' }], actionsByImpl: { } }
    }
    await command.run()
    expect(fs.removeSync).toHaveBeenLastCalledWith('mock-dirname')
    dirnameSpy.mockRestore()
  })

  test('multiple comma separators', async () => {
    command.argv = ['a,b', '--yes']
    command.prompt = () => {
      return {
        deleteAction: true
      }
    }
    command.log = jest.fn()
    fs.statSync = () => {
      return { isFile: () => false }
    }
    const fakeActions = [{
      name: 'a',
      path: 'a-path',
      actionsDir: 'a-dir',
      actionName: 'a-fileName',
      unitTestsDir: path.normalize('A/unit/tests/dir'),
      e2eTestsDir: path.normalize('A/e2e/tests/dir')
    }, {
      name: 'b',
      path: 'b-path',
      actionsDir: 'b-dir',
      actionName: 'b-fileName',
      unitTestsDir: path.normalize('B/unit/tests/dir'),
      e2eTestsDir: path.normalize('B/e2e/tests/dir')
    }]
    command.getAllActions = () => {
      return { actions: fakeActions, actionsByImpl: { } }
    }
    await command.run()
    expect(fs.removeSync).toHaveBeenCalledWith('a-path')
    expect(fs.removeSync).toHaveBeenCalledWith(path.normalize('A/e2e/tests/dir/a-fileName.e2e.test.js'))
    expect(fs.removeSync).toHaveBeenCalledWith(path.normalize('A/unit/tests/dir/a-fileName.test.js'))
    // expect(command.log).toHaveBeenCalledWith('✔ Deleted \'a\'')

    expect(fs.removeSync).toHaveBeenCalledWith('b-path')
    expect(fs.removeSync).toHaveBeenCalledWith(path.normalize('B/e2e/tests/dir/b-fileName.e2e.test.js'))
    expect(fs.removeSync).toHaveBeenCalledWith(path.normalize('B/unit/tests/dir/b-fileName.test.js'))
    // expect(command.log).toHaveBeenCalledWith('✔ Deleted \'b\'')
  })

  test('getAllActions() - no actions', async () => {
    command.getAllActions = () => {
      return { actions: [], actionsByImpl: { } }
    }
    return expect(command.run()).rejects.toThrow('no actions')
  })

  test('abort when user declines prompt', async () => {
    command.args = { fakeActionName: {} }
    command.prompt = () => {
      return {
        deleteAction: false,
        actions: [{ path: 'shouldNotBeCalled' }]
      }
    }
    fs.statSync = () => {
      return { isFile: () => false }
    }
    command.getAllActions = () => {
      return { actions: ['fakeActionName'], actionsByImpl: { fakeActionName: [{ path: 'boom' }] } }
    }
    await expect(command.run()).rejects.toThrow('aborting')
    expect(fs.removeSync).not.toHaveBeenCalledWith('shouldNotBeCalled')
  })
})

describe('getAllActions', () => {
  test('getAllActions() - no actions', async () => {
    command.prompt = () => {
      return {
        deleteAction: true,
        actions: [{ path: 'fakeActionName' }]
      }
    }
    fs.statSync = jest.fn().mockReturnValue({
      isFile: () => true
    })
    const dirnameSpy = jest.spyOn(path, 'dirname').mockReturnValueOnce('mock-me?')
    await command.run()
    expect(fs.removeSync).toHaveBeenCalledWith('mock-me?')
    dirnameSpy.mockRestore()
  })

  test('getAllActions - no app.hasBackend', () => {
    const result = command.getAllActions({
      all: {
        appName: {
          app: {
            hasBackend: false
          }
        }
      }
    })
    expect(result.actions).toBeDefined()
    expect(result.actions).toStrictEqual(expect.arrayContaining([]))
    expect(result.actionsByImpl).toBeDefined()
    expect(result.actionsByImpl).toStrictEqual(expect.objectContaining({}))
  })

  test('getAllActions - coverage', () => {
    const result = command.getAllActions({
      all: {
        appName: {
          app: {
            hasBackend: true
          },
          actions: {
            src: 'action-src'
          },
          tests: {
            unit: 'test',
            e2e: 'e2e'
          },
          root: 'root',
          manifest: {
            full: {
              packages: {
                pkgName: {
                  actions: {
                    action: {
                      actionName: 'action-name',
                      function: 'function-path'
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    expect(result.actions).toBeDefined()
    expect(result.actions).toStrictEqual(expect.arrayContaining([]))
    expect(result.actionsByImpl).toBeDefined()
    expect(result.actionsByImpl).toStrictEqual(expect.objectContaining({}))
  })
})
