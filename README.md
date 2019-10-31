aio-cli-plugin-app
==================

Create, Build and Deploy Cloud Native Applications

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/aio-cli-plugin-cna.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-cna)
[![Downloads/week](https://img.shields.io/npm/dw/aio-cli-plugin-cna.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-cna)
[![Build Status](https://travis-ci.org/adobe/aio-cli-plugin-cna.svg?branch=master)](https://travis-ci.org/adobe/aio-cli-plugin-cna)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-cli-plugin-cna/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-cli-plugin-cna/) 
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/aio-cli-plugin-cna.svg)](https://greenkeeper.io/)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @adobe/aio-cli-plugin-app
$ @adobe/aio-cli-plugin-app COMMAND
running command...
$ @adobe/aio-cli-plugin-app (-v|--version|version)
@adobe/aio-cli-plugin-app/0.2.1-dev darwin-x64 node-v10.16.1
$ @adobe/aio-cli-plugin-app --help [COMMAND]
USAGE
  $ @adobe/aio-cli-plugin-app COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`@adobe/aio-cli-plugin-app app:create [PATH]`](#adobeaio-cli-plugin-app-appcreate-path)
* [`@adobe/aio-cli-plugin-app app:init [PATH]`](#adobeaio-cli-plugin-app-appinit-path)
* [`@adobe/aio-cli-plugin-app app:test [PATH]`](#adobeaio-cli-plugin-app-apptest-path)

## `@adobe/aio-cli-plugin-app app:create [PATH]`

Create a new Cloud Native Application with default parameters

```
USAGE
  $ @adobe/aio-cli-plugin-app app:create [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/v0.2.1-dev/src/commands/app/create.js)_

## `@adobe/aio-cli-plugin-app app:init [PATH]`

Initialize a Cloud Native Application

```
USAGE
  $ @adobe/aio-cli-plugin-app app:init [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/v0.2.1-dev/src/commands/app/init.js)_

## `@adobe/aio-cli-plugin-app app:test [PATH]`

Tests a Cloud Native Application

```
USAGE
  $ @adobe/aio-cli-plugin-app app:test [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -e, --e2e      runs e2e tests.
  -u, --unit     runs unit tests (default).
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/v0.2.1-dev/src/commands/app/test.js)_
<!-- commandsstop -->
