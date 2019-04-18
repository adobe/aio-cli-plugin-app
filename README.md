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
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@io-dev-tools/aio-cli-plugin-cna/0.0.1 darwin-x64 node-v8.9.4
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`oclif-example cna:create [PATH] [NAME]`](#oclif-example-cnacreate-path-name)

## `oclif-example cna:create [PATH] [NAME]`

Create a new Cloud Native Application

```
USAGE
  $ oclif-example cna:create [PATH] [NAME]

ARGUMENTS
  PATH  [default: .] Directory to create the app in
  NAME  [default: MyApp]

OPTIONS
  -t, --template=template  Template starter path, or id

DESCRIPTION
  ...
  Select options, and go
```

_See code: [src/commands/cna/create.js](https://github.com/purplecabbage/aio-cli-plugin-cna/blob/v0.0.1/src/commands/cna/create.js)_
<!-- commandsstop -->
