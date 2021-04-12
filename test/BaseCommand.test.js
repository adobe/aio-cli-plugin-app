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

const { stdout } = require('stdout-stderr')
const { Command } = require('@oclif/command')
const TheCommand = require('../src/BaseCommand')

jest.mock('@adobe/aio-lib-core-config')
const mockConfig = require('@adobe/aio-lib-core-config')

const libEnv = require('@adobe/aio-lib-env')
jest.mock('@adobe/aio-lib-env')

test('exports', async () => {
  expect(typeof TheCommand).toEqual('function')
  expect(TheCommand.prototype instanceof Command).toBeTruthy()
})

test('flags', async () => {
  expect(typeof TheCommand.flags.version).toBe('object')
  expect(typeof TheCommand.flags.version.description).toBe('string')

  expect(typeof TheCommand.flags.verbose).toBe('object')
  expect(TheCommand.flags.verbose.char).toBe('v')
  expect(typeof TheCommand.flags.verbose.description).toBe('string')
})

test('args', async () => {
  expect(TheCommand.args).toEqual([])
})

test('basecommand defines method', async () => {
  const cmd = new TheCommand()
  expect(cmd.getLaunchUrlPrefix).toBeDefined()
  expect(typeof cmd.getLaunchUrlPrefix).toBe('function')
  mockConfig.get.mockReturnValue('http://prefix?fake=')
  expect(cmd.getLaunchUrlPrefix()).toBe('http://prefix?fake=')
  mockConfig.get.mockReturnValue(null)
  expect(cmd.getLaunchUrlPrefix()).toEqual(expect.stringContaining('https://'))
})

test('getLaunchUrlPrefix() warns on older url', async () => {
  const cmd = new TheCommand()

  mockConfig.get.mockReturnValue('some-url/apps/some-param')
  expect(cmd.getLaunchUrlPrefix()).toBe('some-url/custom-apps/some-param')
  expect(stdout.output).toMatch('Warning: your environment variables contains an older version of AIO_LAUNCH_URL_PREFIX')

  mockConfig.get.mockReturnValue('some-url/myapps/some-param')
  expect(cmd.getLaunchUrlPrefix()).toBe('some-url/custom-apps/some-param')
  expect(stdout.output).toMatch('Warning: your environment variables contains an older version of AIO_LAUNCH_URL_PREFIX')

  mockConfig.get.mockReturnValue('some-url/custom-apps/some-param')
  expect(cmd.getLaunchUrlPrefix()).toBe('some-url/custom-apps/some-param')
  expect(stdout.output).toMatch('')

  mockConfig.get.mockReturnValue(null)
  expect(cmd.getLaunchUrlPrefix()).toEqual(expect.stringContaining('https://'))
})

test('getLaunchUrlPrefix() uses stage launch prefix', async () => {
  const cmd = new TheCommand()
  libEnv.getCliEnv.mockReturnValue('stage')
  expect(cmd.getLaunchUrlPrefix()).toBe('https://experience-stage.adobe.com/?devMode=true#/custom-apps/?localDevUrl=')
})
