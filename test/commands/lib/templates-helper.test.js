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

const { processNpmPackageSpec } = require('../../../src/lib/templates-helper')

beforeEach(() => {
})

describe('processNpmPackageSpec', () => {
  const cwd = '/a/b/c'

  test('http, https, ssh urls', async () => {
    let result
    const domainAndPath = 'my-server.com/repo'

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
    const absFolderPath = '/a/d'
    const relFolderPath = '../../d' //

    result = processNpmPackageSpec(`file:${absFolderPath}`, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })

    result = processNpmPackageSpec(`file:${relFolderPath}`, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })
  })

  test('file paths (absolute, relative)', async () => {
    let result
    const absFolderPath = '/a/d'
    const relFolderPath = '../../d' //

    result = processNpmPackageSpec(absFolderPath, cwd)
    expect(result).toEqual({ url: `file:${relFolderPath}` })

    result = processNpmPackageSpec(relFolderPath, cwd)
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
