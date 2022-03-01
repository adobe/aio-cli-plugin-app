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

const {
  readPackageJson,
  writeObjectToPackageJson,
  getNpmLocalVersion,
  getNpmLatestVersion,
  npmTextSearch,
  processNpmPackageSpec,
  getNpmDependency,
  hideNPMWarnings
} = require('../../../src/lib/npm-helper')

const fetch = require('node-fetch')
const fs = require('fs-extra')
const { stderr } = require('stdout-stderr')
const path = require('path')
const os = require('os')
const processCwd = process.cwd()

jest.mock('fs-extra') // do not touch the real fs
jest.mock('node-fetch')

const createMockResponse = _json => {
  return {
    json: async () => _json
  }
}

beforeEach(() => {
  fs.readJson.mockReset()
  fs.writeJson.mockReset()
})

describe('processNpmPackageSpec', () => {
  const cwd = os.homedir()

  test('http, https, ssh urls', async () => {
    let result
    const domainAndPath = 'my-server.com/repo'

    result = processNpmPackageSpec(`http://${domainAndPath}.git`, cwd) // url ends with .git
    expect(result).toEqual({ url: `git+http://${domainAndPath}.git` })

    result = processNpmPackageSpec(`http://${domainAndPath}`, cwd)
    expect(result).toEqual({ url: `git+http://${domainAndPath}.git` })

    result = processNpmPackageSpec(`https://${domainAndPath}`, cwd)
    expect(result).toEqual({ url: `git+https://${domainAndPath}.git` })

    result = processNpmPackageSpec(`ssh://${domainAndPath}`, cwd)
    expect(result).toEqual({ url: `git+ssh://${domainAndPath}.git` })
  })

  test('git+http, git+https, ssh, git+ssh urls', async () => {
    let result
    const domainAndPath = 'my-server.com/repo'

    result = processNpmPackageSpec(`git+http://${domainAndPath}.git`, cwd)
    expect(result).toEqual({ url: `git+http://${domainAndPath}.git` })

    result = processNpmPackageSpec(`git+https://${domainAndPath}.git`, cwd)
    expect(result).toEqual({ url: `git+https://${domainAndPath}.git` })

    result = processNpmPackageSpec(`git+ssh://${domainAndPath}.git`, cwd)
    expect(result).toEqual({ url: `git+ssh://${domainAndPath}.git` })
  })

  test('file: urls (with absolute, relative paths)', async () => {
    let result
    const absFolderPath = path.join(os.homedir(), 'a', 'd')
    const relFolderPath = path.join('a', 'd')

    result = processNpmPackageSpec(`file:${absFolderPath}`, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })

    result = processNpmPackageSpec(`file:${relFolderPath}`, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })
  })

  test('file paths (absolute, relative)', async () => {
    let result
    const absFolderPath = path.join(os.homedir(), 'a', 'd')
    const relFolderPath = path.join('a', 'd')

    result = processNpmPackageSpec(absFolderPath, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })

    result = processNpmPackageSpec(relFolderPath, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })
  })

  test('file paths (absolute, relative) - use process.cwd()', async () => {
    let result
    const absFolderPath = path.join(os.homedir(), 'a', 'd')
    const relFolderPath = path.relative(processCwd, absFolderPath)

    result = processNpmPackageSpec(absFolderPath)
    expect(result).toEqual({ url: `file:${relFolderPath}` })

    result = processNpmPackageSpec(relFolderPath)
    expect(result).toEqual({ url: `file:${relFolderPath}` })
  })

  test('npm package name (no scope, no tag/version)', async () => {
    const spec = 'my-package'

    const result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: spec, tagOrVersion: 'latest' })
  })

  test('npm package name (no scope, has tag/version)', async () => {
    let spec, result
    const packageName = 'my-package'

    spec = `${packageName}@1.0.0`
    result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: packageName, tagOrVersion: '1.0.0' })

    spec = `${packageName}@experimental`
    result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: packageName, tagOrVersion: 'experimental' })
  })

  test('npm package name (has scope, no tag/version)', async () => {
    const spec = '@my-org/my-package'

    const result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: spec, tagOrVersion: 'latest' })
  })

  test('npm package name (has scope, has tag/version)', async () => {
    let spec, result
    const packageName = '@my-org/my-package'

    spec = `${packageName}@1.0.0`
    result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: packageName, tagOrVersion: '1.0.0' })

    spec = `${packageName}@experimental`
    result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: packageName, tagOrVersion: 'experimental' })
  })

  test('npm package name (no scope, missing tag/version)', async () => {
    const spec = 'my-package@'

    const result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: spec.slice(0, -1) /* remove last char */, tagOrVersion: 'latest' })
  })

  test('npm package name (has scope, missing tag/version)', async () => {
    const spec = '@my-org/my-package@'

    const result = processNpmPackageSpec(spec, cwd)
    expect(result).toEqual({ name: spec.slice(0, -1) /* remove last char */, tagOrVersion: 'latest' })
  })
})

test('npmTextSearch', async () => {
  const json = {
    objects: []
  }
  fetch.mockResolvedValueOnce(createMockResponse(json))

  return expect(npmTextSearch()).resolves.toStrictEqual(json)
})

test('getNpmLatestVersion', async () => {
  const json = {
    'dist-tags': {
      latest: '1.2.3'
    }
  }

  fetch.mockResolvedValueOnce(createMockResponse(json))
  return expect(getNpmLatestVersion('foo')).resolves.toStrictEqual(json['dist-tags'].latest)
})

describe('getNpmLocalVersion', () => {
  let useProcessCwd
  const dir = path.join(os.homedir(), 'some-folder')
  const npmPackage = 'mypackage'
  const packageJson = { version: '1.2.3' }

  beforeEach(() => {
    useProcessCwd = false

    fs.readFileSync.mockImplementation(filePath => {
      const theDir = useProcessCwd ? processCwd : dir
      if (filePath === path.join(theDir, 'node_modules', npmPackage, 'package.json')) {
        return JSON.stringify(packageJson)
      } else {
        throw new Error(`${filePath} not found`)
      }
    })
  })

  test('specify a working directory', async () => {
    return expect(getNpmLocalVersion(npmPackage, dir)).resolves.toStrictEqual(packageJson.version)
  })

  test('use process.cwd', async () => {
    useProcessCwd = true
    return expect(getNpmLocalVersion(npmPackage)).resolves.toStrictEqual(packageJson.version)
  })
})

describe('package.json', () => {
  let useProcessCwd
  const dir = 'myroot'
  const packageJson = { version: '1.0' }

  beforeEach(() => {
    useProcessCwd = false
    fs.readJson.mockReset()
    fs.writeJson.mockReset()

    fs.readJson.mockImplementation(filePath => {
      const theDir = useProcessCwd ? processCwd : dir
      if (filePath === path.join(theDir, 'package.json')) {
        return packageJson
      } else {
        throw new Error(`readJson: file not found: ${filePath}`)
      }
    })
  })

  test('readPackageJson', async () => {
    return expect(readPackageJson(dir)).resolves.toStrictEqual(packageJson)
  })

  test('readPackageJson (use process.cwd())', async () => {
    useProcessCwd = true
    return expect(readPackageJson()).resolves.toStrictEqual(packageJson)
  })

  test('writeObjectToPackageJson', async () => {
    const filePath = path.join(dir, 'package.json')
    const obj = { foo: 'bar' }

    fs.writeJson.mockImplementation((fp, objToWrite) => {
      if (fp === filePath) {
        expect(objToWrite).toStrictEqual({ ...packageJson, ...obj })
      } else {
        throw new Error(`writeJson: file not found: ${fp}`)
      }
    })

    await writeObjectToPackageJson(obj, dir)
  })

  test('writeObjectToPackageJson (use process.cwd())', async () => {
    const filePath = path.join(processCwd, 'package.json')
    const obj = { foo: 'bar' }

    fs.writeJson.mockImplementation((fp, objToWrite) => {
      if (fp === filePath) {
        expect(objToWrite).toStrictEqual({ ...packageJson, ...obj })
      } else {
        throw new Error(`writeJson: file not found: ${fp}`)
      }
    })

    useProcessCwd = true
    await writeObjectToPackageJson(obj)
  })
})

describe('getNpmDependency', () => {
  let useProcessCwd
  const dir = 'myroot'
  let packageJson = { version: '1.0' }

  beforeEach(() => {
    useProcessCwd = false
    fs.readJson.mockReset()
    fs.readJson.mockImplementation(filePath => {
      const theDir = useProcessCwd ? processCwd : dir
      if (filePath === path.join(theDir, 'package.json')) {
        return packageJson
      } else {
        throw new Error(`readJson: file not found: ${filePath}`)
      }
    })
  })

  test('no packageName or urlSpec set', async () => {
    useProcessCwd = false
    await expect(getNpmDependency({}, dir)).rejects.toEqual(new Error('Either packageName or urlSpec must be set'))
    useProcessCwd = true
    await expect(getNpmDependency({})).rejects.toEqual(new Error('Either packageName or urlSpec must be set')) // branch coverage
  })

  test('packageName found', async () => {
    packageJson = {
      dependencies: {
        foo: '1.0',
        bar: '2.0'
      }
    }
    const packageName = 'bar'
    const [, packageVersion] = await getNpmDependency({ packageName }, dir)
    return expect(packageVersion).toEqual('2.0')
  })

  test('packageName not found', async () => {
    packageJson = {
      dependencies: {
        foo: '1.0',
        bar: '2.0'
      }
    }
    const packageName = 'baz'
    let result = await getNpmDependency({ packageName }, dir)
    await expect(result).toEqual(undefined)

    packageJson = {} // branch coverage
    result = await getNpmDependency({ packageName }, dir)
    await expect(result).toEqual(undefined)
  })

  test('urlSpec found', async () => {
    packageJson = {
      dependencies: {
        foo: 'git+ssh://foo.com/myrepo',
        bar: 'git+https://bar.com/yourrepo'
      }
    }
    const urlSpec = 'git+https://bar.com/yourrepo'
    const [packageName] = await getNpmDependency({ urlSpec }, dir)
    return expect(packageName).toEqual('bar')
  })

  test('urlSpec not found', async () => {
    packageJson = {
      dependencies: {
        foo: 'git+ssh://foo.com/myrepo',
        bar: 'git+https://bar.com/yourrepo'
      }
    }
    const urlSpec = 'git+https://baz.com/yourrepo'
    let result = await getNpmDependency({ urlSpec }, dir)
    await expect(result).toEqual(undefined)

    packageJson = {} // branch coverage
    result = await getNpmDependency({ urlSpec }, dir)
    await expect(result).toEqual(undefined)
  })
})

describe('hideNPMWarnings', () => {
  test('with string output', () => {
    stderr.start()
    hideNPMWarnings()
    process.stderr.write('string')
    stderr.stop()
    expect(stderr.output).toBe('string')
  })

  test('with buffer output', () => {
    stderr.start()
    hideNPMWarnings()
    process.stderr.write(Buffer.from('string'))
    stderr.stop()
    expect(stderr.output).toBe('string')
  })

  test('string output of warning should be stripped', () => {
    stderr.start()
    hideNPMWarnings()
    process.stderr.write('warning')
    stderr.stop()
    expect(stderr.output).toBe('')
  })

  test('buffer output of warning should be stripped', () => {
    stderr.start()
    hideNPMWarnings()
    process.stderr.write(Buffer.from('warning ...'))
    stderr.stop()
    expect(stderr.output).toBe('')
  })
})
