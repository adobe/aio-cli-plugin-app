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

const RunCommand = require('../../../src/commands/app/run')
const BaseCommand = require('../../../src/BaseCommand')

// should be same as in run.js
const DEV_KEYS_DIR = 'dist/dev-keys/'
const PRIVATE_KEY_PATH = DEV_KEYS_DIR + 'private.key'
const PUB_CERT_PATH = DEV_KEYS_DIR + 'cert-pub.crt'
const CONFIG_KEY = 'aio-dev.dev-keys'

// mocks
const mockFS = require('fs-extra')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

jest.mock('cli-ux')
const { cli } = require('cli-ux')

jest.mock('https')
const https = require('https')

jest.mock('get-port')
const getPort = require('get-port')

// const https = require('https')
const mockScripts = require('@adobe/aio-app-scripts')()
let command

const mockFindCommandRun = jest.fn()
const mockFindCommandLoad = jest.fn().mockReturnValue({
  run: mockFindCommandRun
})

const mockHttpsServerInstance = {
  listen: jest.fn(),
  close: jest.fn(),
  args: null
}

beforeEach(() => {
  jest.restoreAllMocks()
  mockScripts.mockReset('runDev')

  mockConfig.get = jest.fn().mockReturnValue({ globalConfig: 'seems-legit' })

  mockFS.exists.mockReset()
  mockFS.writeFile.mockReset()
  mockFS.readFile.mockReset()
  mockFS.ensureDir.mockReset()

  cli.action = {
    stop: jest.fn(),
    start: jest.fn()
  }
  cli.open = jest.fn()
  cli.wait = jest.fn() // .mockImplementation((ms = 1000) => { return new Promise(resolve => setTimeout(resolve, ms)) })

  mockFindCommandLoad.mockClear()
  mockFindCommandRun.mockReset()

  command = new RunCommand()
  command.error = jest.fn()
  command.log = jest.fn()
  command.config = {
    findCommand: jest.fn().mockReturnValue({
      load: mockFindCommandLoad
    })
  }

  https.createServer.mockImplementation((opts, func) => {
    mockHttpsServerInstance.args = { opts, func }
    return mockHttpsServerInstance
  })
  mockHttpsServerInstance.listen.mockReset()
  mockHttpsServerInstance.close.mockReset()
  https.createServer.mockClear()

  getPort.mockReset()

  delete process.env.REMOTE_ACTIONS
  delete process.env.PORT
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('run command definition', () => {
  test('exports', async () => {
    expect(typeof RunCommand).toEqual('function')
    expect(RunCommand.prototype instanceof BaseCommand).toBeTruthy()
  })

  test('description', async () => {
    expect(RunCommand.description).toBeDefined()
  })

  test('aliases', async () => {
    expect(RunCommand.aliases).toEqual([])
  })

  test('flags', async () => {
    expect(typeof RunCommand.flags.local).toBe('object')
    expect(typeof RunCommand.flags.local.description).toBe('string')
    expect(RunCommand.flags.local.exclusive).toEqual(['skip-actions'])
    expect(typeof RunCommand.flags['skip-actions']).toBe('object')
    expect(typeof RunCommand.flags['skip-actions'].description).toBe('string')
    expect(RunCommand.flags['skip-actions'].exclusive).toEqual(['local'])
  })
})

/** @private */
function mockFSExists (files) {
  if (!Array.isArray(files)) { files = [files] }
  mockFS.exists.mockImplementation(async f => {
    if (files.includes(f)) {
      return true
    }
    return false
  })
  mockFS.existsSync.mockImplementation(async f => {
    if (files.includes(f)) {
      return true
    }
    return false
  })
}

describe('run', () => {
  test('app:run with no ui and no manifest should fail', async () => {
    await expect(RunCommand.run([])).rejects.toThrow('nothing to run.. there is no web-src/ and no manifest.yml, are you in a valid app?')
  })

  test('app:run with no web-src and --skip-actions should fail', async () => {
    mockFSExists(['manifest.yml'])
    await expect(RunCommand.run(['--skip-actions'])).rejects.toThrow('nothing to run.. there is no web-src/ and --skip-actions is set')
  })

  test('app:run with web-src and --skip-actions', async () => {
    mockFSExists(['manifest.yml', 'web-src', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run([])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('true')
  })

  test('app:run with manifest and no certificates', async () => {
    mockFSExists(['manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run([])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('true')
  })

  test('app:run with web src and manifest', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run([])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('true')
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: expect.objectContaining({
        logLevel: 2
      })
    }))
  })

  test('app:run check if fetchLogs flag is set when calling scripts', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run([])
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      fetchLogs: true
    }))
  })

  test('app:run with -verbose', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run(['--verbose'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: expect.objectContaining({
        logLevel: 4
      })
    }))
    expect(process.env.REMOTE_ACTIONS).toBe('true')
  })

  test('app:run with --local', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run(['--local'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(process.env.REMOTE_ACTIONS).toBe('false')
  })

  test('app:run with --local --verbose', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    await RunCommand.run(['--local', '--verbose'])
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: expect.objectContaining({
        logLevel: 4
      })
    }))
    expect(process.env.REMOTE_ACTIONS).toBe('false')
  })

  test('app:run where scripts.runDev throws', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    mockScripts.mockRejectedValue('runDev', 'error')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
  })

  test('run should show ui url', async () => {
    mockConfig.get.mockReturnValue(null)
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    mockScripts.mockResolvedValue('runDev', 'http://localhost:1111')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
  })

  test('run should open ui url with --open', async () => {
    mockConfig.get.mockReturnValue(null)
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    mockScripts.mockResolvedValue('runDev', 'http://localhost:1111')
    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
    expect(cli.open).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
  })

  test('run should show ui and exc url if AIO_LAUNCH_PREFIX_URL is set', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    mockConfig.get.mockReturnValue('http://prefix?fake=')
    mockScripts.mockResolvedValue('runDev', 'http://localhost:1111')
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=http://localhost:1111'))
  })

  test('run should show ui and open exc url if AIO_LAUNCH_PREFIX_URL is set with --open', async () => {
    mockFSExists(['web-src/', 'manifest.yml', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    mockConfig.get.mockReturnValue('http://prefix?fake=')
    mockScripts.mockResolvedValue('runDev', 'http://localhost:1111')
    command.argv = ['--open']
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:1111'))
    expect(command.log).toHaveBeenCalledWith(expect.stringContaining('http://prefix?fake=http://localhost:1111'))
    expect(cli.open).toHaveBeenCalledWith('http://prefix?fake=http://localhost:1111')
  })

  test('app:run with UI and existing cert files', async () => {
    // only generate cert if the app has a UI
    mockFSExists(['web-src/', PRIVATE_KEY_PATH, PUB_CERT_PATH])
    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
  })

  test('app:run with UI and no cert files but has cert config', async () => {
    mockFSExists(['web-src/'])
    mockConfig.get.mockReturnValue({ publicCert: 'pub cert', privateKey: 'private key' })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
    expect(mockFS.ensureDir).toHaveBeenCalledWith(DEV_KEYS_DIR)
    expect(mockFS.writeFile).toHaveBeenCalledTimes(2)
    expect(mockFS.writeFile).toHaveBeenCalledWith(PUB_CERT_PATH, 'pub cert')
    expect(mockFS.writeFile).toHaveBeenCalledWith(PRIVATE_KEY_PATH, 'private key')
  })

  test('app:run with UI and no certs, should generate certificates', async () => {
    mockFSExists('web-src/')
    mockConfig.get.mockReturnValue(null)
    mockFS.readFile.mockResolvedValue(Buffer.from('fake content'))
    // emulate user request directly on listen
    mockHttpsServerInstance.listen.mockImplementation(() => {
      mockHttpsServerInstance.args.func({}, { writeHead: () => {}, end: () => {} })
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
    expect(mockFS.ensureDir).toHaveBeenCalledWith(DEV_KEYS_DIR)
    expect(command.config.findCommand).toHaveBeenCalledWith('certificate:generate')
    expect(mockFindCommandRun).toHaveBeenCalledWith([`--keyout=${PRIVATE_KEY_PATH}`, `--out=${PUB_CERT_PATH}`, '-n=DeveloperSelfSigned.cert'])
  })

  test('app:run with UI and no certs, should store generated certificates into global config', async () => {
    mockFSExists('web-src/')
    mockConfig.get.mockReturnValue(null)
    mockFS.readFile.mockImplementation(async f => {
      if (f === PRIVATE_KEY_PATH) {
        return Buffer.from('private key')
      }
      if (f === PUB_CERT_PATH) {
        return Buffer.from('public cert')
      }
      return Buffer.from('fake content')
    })
    // emulate user request directly on listen
    mockHttpsServerInstance.listen.mockImplementation(() => {
      mockHttpsServerInstance.args.func({}, { writeHead: () => {}, end: () => {} })
    })

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
    expect(mockConfig.set).toHaveBeenCalledTimes(2)
    expect(mockConfig.set).toHaveBeenCalledWith(CONFIG_KEY + '.privateKey', 'private key')
    expect(mockConfig.set).toHaveBeenCalledWith(CONFIG_KEY + '.publicCert', 'public cert')
  })

  test('app:run with UI and no certs, should ask user to validate generated certificates', async () => {
    mockFSExists('web-src/')
    mockConfig.get.mockReturnValue(null)
    mockFS.readFile.mockImplementation(async f => {
      if (f === PRIVATE_KEY_PATH) {
        return Buffer.from('private key')
      }
      if (f === PUB_CERT_PATH) {
        return Buffer.from('public cert')
      }
      return Buffer.from('fake content')
    })
    // emulate user request directly on listen
    const mockWriteHead = jest.fn()
    mockHttpsServerInstance.listen.mockImplementation(() => {
      mockHttpsServerInstance.args.func({}, { writeHead: mockWriteHead, end: () => {} })
    })
    getPort.mockReturnValue(1111)

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
    expect(https.createServer).toHaveBeenCalledWith({ key: 'private key', cert: 'public cert' }, expect.any(Function))
    expect(getPort).toHaveBeenCalledWith({ port: 9080 })
    expect(mockHttpsServerInstance.listen).toHaveBeenCalledWith(1111)
    expect(mockHttpsServerInstance.close).toHaveBeenCalledTimes(1)
    expect(mockWriteHead).toHaveBeenCalledWith(200)
    expect(cli.open).toHaveBeenCalledWith('https://localhost:1111')
    expect(cli.action.start).toHaveBeenCalledWith('Waiting for the certificate to be accepted.')
    expect(cli.action.stop).toHaveBeenCalledWith()
    expect(command.log).toBeCalledWith('Great, you accepted the certificate!')
  })

  test('app:run with UI and no certs, should attempt to run validation server on env port', async () => {
    mockFSExists('web-src/')
    mockConfig.get.mockReturnValue(null)
    mockFS.readFile.mockResolvedValue(Buffer.from('fake content'))
    // emulate user request directly on listen
    mockHttpsServerInstance.listen.mockImplementation(() => {
      mockHttpsServerInstance.args.func({}, { writeHead: () => {}, end: () => {} })
    })
    getPort.mockReturnValue(1111)
    process.env.PORT = 9999

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
    expect(getPort).toHaveBeenCalledWith({ port: 9999 })
    expect(mockHttpsServerInstance.listen).toHaveBeenCalledWith(1111)
    expect(cli.open).toHaveBeenCalledWith('https://localhost:1111')
    expect(command.log).toBeCalledWith('Great, you accepted the certificate!')
  })

  test('app:run with UI and no certs, should timeout if user does not validate certificates', async () => {
    mockFSExists('web-src/')
    mockConfig.get.mockReturnValue(null)
    mockFS.readFile.mockResolvedValue(Buffer.from('fake content'))
    mockHttpsServerInstance.listen.mockImplementation(() => {
      // do nothing wait for timeout
    })
    getPort.mockReturnValue(1111)

    // mock date now so that we timeout after 4 additional calls (timeout should be 20s)
    const datenow = Date.now
    let startDate = 1000000
    Date.now = () => {
      startDate += 5000
      return startDate
    }

    command.argv = []
    await command.run()
    expect(command.error).toHaveBeenCalledTimes(0)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledWith([], expect.objectContaining({
      parcel: {
        logLevel: 2,
        https: {
          cert: PUB_CERT_PATH,
          key: PRIVATE_KEY_PATH
        }
      }
    }))
    expect(mockHttpsServerInstance.listen).toHaveBeenCalledWith(1111)
    expect(mockHttpsServerInstance.close).toHaveBeenCalledTimes(1)
    expect(cli.open).toHaveBeenCalledWith('https://localhost:1111')
    expect(cli.action.start).toHaveBeenCalledWith('Waiting for the certificate to be accepted.')
    expect(cli.action.stop).toHaveBeenCalledWith('timed out')
    expect(cli.wait).toHaveBeenCalledTimes(3) // number of iterations in the loop

    // restore datenow
    Date.now = datenow
  })

  test('app:run with UI and no certs, throws error when certificate:generate command not found', async () => {
    mockFSExists('web-src/')
    mockConfig.get.mockReturnValue(null)
    const spy = jest.spyOn(command.config, 'findCommand').mockReturnValue(null)
    command.error.mockImplementation((e) => {
      throw new Error(e)
    })

    command.argv = []
    await expect(command.run()).rejects.toThrow('error while generating certificate - no certificate:generate command found')

    expect(command.error).toHaveBeenCalledTimes(1)
    expect(mockScripts.runDev).toHaveBeenCalledTimes(0)
    spy.mockRestore()
  })
})
