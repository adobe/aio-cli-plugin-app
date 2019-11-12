aio-cli-plugin-app
==================

Create, Build and Deploy Adobe I/O Apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Downloads/week](https://img.shields.io/npm/dw/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Build Status](https://travis-ci.org/adobe/aio-cli-plugin-app.svg?branch=master)](https://travis-ci.org/adobe/aio-cli-plugin-app)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-cli-plugin-app/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-cli-plugin-app/)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/aio-cli-plugin-app.svg)](https://greenkeeper.io/)

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
@adobe/aio-cli-plugin-app/0.3.1 darwin-x64 node-v8.16.0
$ @adobe/aio-cli-plugin-app --help [COMMAND]
USAGE
  $ @adobe/aio-cli-plugin-app COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`@adobe/aio-cli-plugin-app app`](#adobeaio-cli-plugin-app-app)
* [`@adobe/aio-cli-plugin-app app:add-auth [PATH]`](#adobeaio-cli-plugin-app-appadd-auth-path)
* [`@adobe/aio-cli-plugin-app app:create [PATH]`](#adobeaio-cli-plugin-app-appcreate-path)
* [`@adobe/aio-cli-plugin-app app:deploy`](#adobeaio-cli-plugin-app-appdeploy)
* [`@adobe/aio-cli-plugin-app app:init [PATH]`](#adobeaio-cli-plugin-app-appinit-path)
* [`@adobe/aio-cli-plugin-app app:logs [PATH]`](#adobeaio-cli-plugin-app-applogs-path)
* [`@adobe/aio-cli-plugin-app app:run [PATH]`](#adobeaio-cli-plugin-app-apprun-path)
* [`@adobe/aio-cli-plugin-app app:test [PATH]`](#adobeaio-cli-plugin-app-apptest-path)
* [`@adobe/aio-cli-plugin-app app:undeploy [PATH]`](#adobeaio-cli-plugin-app-appundeploy-path)

## `@adobe/aio-cli-plugin-app app`

Create, run, test, and deploy Adobe I/O Apps

```
USAGE
  $ @adobe/aio-cli-plugin-app app

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/index.js)_

## `@adobe/aio-cli-plugin-app app:add-auth [PATH]`

Add auth actions to the manifest of an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:add-auth [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add-auth.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/add-auth.js)_

## `@adobe/aio-cli-plugin-app app:create [PATH]`

Create a new Adobe I/O App with default parameters

```
USAGE
  $ @adobe/aio-cli-plugin-app app:create [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/create.js)_

## `@adobe/aio-cli-plugin-app app:deploy`

Build and deploy an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:deploy

OPTIONS
  -a, --actions  Only build & deploy actions
  -b, --build    Only build, don't deploy
  -d, --deploy   Only deploy, don't build
  -s, --static   Only build & deploy static files
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/deploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/deploy.js)_

## `@adobe/aio-cli-plugin-app app:init [PATH]`

Create a new Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:init [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -t, --template=hello|target|campaign|analytics  Adobe I/O App starter template
  -v, --verbose                                   Verbose output
  -y, --yes                                       Skip questions, and use all default values
  --version                                       Show version
```

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/init.js)_

## `@adobe/aio-cli-plugin-app app:logs [PATH]`

Fetch logs for an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:logs [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -l, --limit=limit  [default: 1] Limit number of activations to fetch logs from
  -v, --verbose      Verbose output
  --version          Show version
```

_See code: [src/commands/app/logs.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/logs.js)_

## `@adobe/aio-cli-plugin-app app:run [PATH]`

Run an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:run [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -v, --verbose  Verbose output
  --local        run/debug actions locally
  --version      Show version
```

_See code: [src/commands/app/run.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/run.js)_

## `@adobe/aio-cli-plugin-app app:test [PATH]`

Run tests for an Adobe I/O App

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

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/test.js)_

## `@adobe/aio-cli-plugin-app app:undeploy [PATH]`

Undeploys an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:undeploy [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -a, --actions  Only deploy actions.
  -s, --static   Only deploy static files.
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/undeploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/0.3.1/src/commands/app/undeploy.js)_
<!-- commandsstop -->
