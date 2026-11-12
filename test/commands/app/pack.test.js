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

const Pack = require('../../../src/commands/app/pack')
const { PackHelper } = require('../../../src/lib/pack-helper')
const path = require('node:path')

jest.mock('../../../src/lib/pack-helper', () => {
  const actual = jest.requireActual('../../../src/lib/pack-helper')
  return { ...actual, PackHelper: jest.fn() }
})
jest.mock('@adobe/aio-cli-lib-console', () => ({}))

let command, pack

const enableScanning = async () => {
  const parsed = await command.parse(Pack)
  parsed.flags['no-scan'] = false
  jest.spyOn(command, 'parse').mockResolvedValue(parsed)
}

beforeEach(() => {
  pack = jest.fn()
  PackHelper.mockClear()
  PackHelper.mockImplementation(() => ({ pack }))
  command = new Pack()
  command.config = createOclifMockConfig()
  command.config.runCommand.mockResolvedValue({ status: 'PASSED' })
  command.argv = []
})

test('passes packaging defaults to the shared helper', async () => {
  await command.run()
  expect(PackHelper).toHaveBeenCalledWith(command)
  expect(pack).toHaveBeenCalledWith({
    appPath: '.',
    output: path.join('dist', 'app.zip'),
    includeLockFile: true,
    verbose: undefined
  })
  expect(command.config.runCommand).not.toHaveBeenCalled()
})

test('passes packaging options and forwards scan options', async () => {
  command.argv = ['new_folder', '--output', 'app-2.zip', '--no-lock-file', '--verbose', '--no-config-validation']
  await enableScanning()
  await command.run()
  expect(command.config.runCommand).toHaveBeenCalledWith('app:scan', ['new_folder', '--verbose'])
  expect(pack).toHaveBeenCalledWith({
    appPath: 'new_folder',
    output: 'app-2.zip',
    includeLockFile: false,
    verbose: true
  })
})

test('skips scanning when --no-scan is passed', async () => {
  command.argv = ['--no-scan']
  await command.run()
  expect(command.config.runCommand).not.toHaveBeenCalled()
  expect(pack).toHaveBeenCalled()
})

test.each(['PASSED_WITH_WARNING', 'SKIPPED'])('packs after scan status %s', async status => {
  await enableScanning()
  command.config.runCommand.mockResolvedValueOnce({ status })
  await command.run()
  expect(pack).toHaveBeenCalled()
})

test.each(['FAILED', 'ERROR', undefined])('does not pack after scan status %s', async status => {
  await enableScanning()
  command.config.runCommand.mockResolvedValueOnce({ status })
  await expect(command.run()).rejects.toThrow('Scan did not pass.')
  expect(PackHelper).not.toHaveBeenCalled()
})

test.each([
  'Scan request failed (HTTP 401).',
  "Scan couldn't be completed at this time. Please try again later or increase the timeout using --timeout <seconds>."
])('does not pack when scanning fails: %s', async message => {
  await enableScanning()
  command.config.runCommand.mockRejectedValueOnce(new Error(message))
  await expect(command.run()).rejects.toThrow(`${message}\nIf you still want to proceed with packing, use aio app pack --no-scan.`)
  expect(PackHelper).not.toHaveBeenCalled()
})

test.each([false, true])('restores the working directory after scanning (failure: %s)', async failure => {
  const cwd = process.cwd()
  command.argv = ['relative-app', '--output', 'relative.zip']
  await enableScanning()
  command.config.runCommand.mockImplementationOnce(async () => {
    process.chdir(path.dirname(cwd))
    if (failure) throw new Error('Scan failed')
    return { status: 'PASSED' }
  })
  pack.mockImplementationOnce(() => {
    expect(process.cwd()).toBe(cwd)
  })
  try {
    if (failure) {
      await expect(command.run()).rejects.toThrow('Scan failed')
      expect(pack).not.toHaveBeenCalled()
    } else {
      await command.run()
      expect(pack).toHaveBeenCalledWith({
        appPath: 'relative-app',
        output: 'relative.zip',
        includeLockFile: true,
        verbose: undefined
      })
    }
    expect(process.cwd()).toBe(cwd)
  } finally {
    process.chdir(cwd)
  }
})

test('propagates packaging failures', async () => {
  pack.mockRejectedValueOnce(new Error('Packaging failed'))
  await expect(command.run()).rejects.toThrow('Packaging failed')
})

test('rejects unknown flags before packaging', async () => {
  command.argv = ['.', '--wtf']
  await expect(command.run()).rejects.toThrow('Nonexistent flag: --wtf')
  expect(command.config.runCommand).not.toHaveBeenCalled()
  expect(pack).not.toHaveBeenCalled()
})
