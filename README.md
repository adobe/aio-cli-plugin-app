aio-cli-plugin-cna
==================

Create, Build and Deploy Cloud Native Applications

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/aio-cli-plugin-cna.svg)](https://npmjs.org/package/aio-cli-plugin-cna)
[![Downloads/week](https://img.shields.io/npm/dw/aio-cli-plugin-cna.svg)](https://npmjs.org/package/aio-cli-plugin-cna)
[![License](https://img.shields.io/npm/l/aio-cli-plugin-cna.svg)](https://github.com/purplecabbage/aio-cli-plugin-cna/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @io-dev-tools/aio-cli-plugin-cna
$ @io-dev-tools/aio-cli-plugin-cna COMMAND
running command...
$ @io-dev-tools/aio-cli-plugin-cna (-v|--version|version)
@io-dev-tools/aio-cli-plugin-cna/0.0.2 darwin-x64 node-v8.14.0
$ @io-dev-tools/aio-cli-plugin-cna --help [COMMAND]
USAGE
  $ @io-dev-tools/aio-cli-plugin-cna COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`@io-dev-tools/aio-cli-plugin-cna cna:create [PATH]`](#io-dev-toolsaio-cli-plugin-cna-cnacreate-path)

## `@io-dev-tools/aio-cli-plugin-cna cna:create [PATH]`

Create a new Cloud Native Application

```
USAGE
  $ @io-dev-tools/aio-cli-plugin-cna cna:create [PATH]

ARGUMENTS
  PATH  [default: .] Directory to create the app in

OPTIONS
  -d, --verbose            Show verbose/debug output
  -h, --help               Show help
  -r, --registry=registry  Alternate registry to use. Passed into npm as environmental variable `npm_config_registry`

  -t, --template=template  [default: @io-dev-tools/runtime-cna-starter] Template starter filepath, git-url or published
                           id/name.
```

_See code: [src/commands/cna/create.js](https://github.com/io-dev-tools/aio-cli-plugin-cna/blob/v0.0.2/src/commands/cna/create.js)_
<!-- commandsstop -->
