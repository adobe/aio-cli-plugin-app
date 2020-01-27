aio-cli-plugin-app
==================

Create, Build and Deploy Adobe I/O Apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
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
@adobe/aio-cli-plugin-app/1.0.0 darwin-x64 node-v10.16.1
$ @adobe/aio-cli-plugin-app --help [COMMAND]
USAGE
  $ @adobe/aio-cli-plugin-app COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`@adobe/aio-cli-plugin-app app`](#adobeaio-cli-plugin-app-app)
* [`@adobe/aio-cli-plugin-app app:add`](#adobeaio-cli-plugin-app-appadd)
* [`@adobe/aio-cli-plugin-app app:add:action`](#adobeaio-cli-plugin-app-appaddaction)
* [`@adobe/aio-cli-plugin-app app:add:auth`](#adobeaio-cli-plugin-app-appaddauth)
* [`@adobe/aio-cli-plugin-app app:add:web-assets`](#adobeaio-cli-plugin-app-appaddweb-assets)
* [`@adobe/aio-cli-plugin-app app:create [PATH]`](#adobeaio-cli-plugin-app-appcreate-path)
* [`@adobe/aio-cli-plugin-app app:delete`](#adobeaio-cli-plugin-app-appdelete)
* [`@adobe/aio-cli-plugin-app app:delete:action [ACTION-NAME]`](#adobeaio-cli-plugin-app-appdeleteaction-action-name)
* [`@adobe/aio-cli-plugin-app app:delete:web-assets`](#adobeaio-cli-plugin-app-appdeleteweb-assets)
* [`@adobe/aio-cli-plugin-app app:deploy`](#adobeaio-cli-plugin-app-appdeploy)
* [`@adobe/aio-cli-plugin-app app:init [PATH]`](#adobeaio-cli-plugin-app-appinit-path)
* [`@adobe/aio-cli-plugin-app app:logs`](#adobeaio-cli-plugin-app-applogs)
* [`@adobe/aio-cli-plugin-app app:run`](#adobeaio-cli-plugin-app-apprun)
* [`@adobe/aio-cli-plugin-app app:test`](#adobeaio-cli-plugin-app-apptest)
* [`@adobe/aio-cli-plugin-app app:undeploy`](#adobeaio-cli-plugin-app-appundeploy)
* [`@adobe/aio-cli-plugin-app app:use CONFIG_FILE_PATH`](#adobeaio-cli-plugin-app-appuse-config_file_path)

## `@adobe/aio-cli-plugin-app app`

Create, run, test, and deploy Adobe I/O Apps

```
USAGE
  $ @adobe/aio-cli-plugin-app app

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/index.js)_

## `@adobe/aio-cli-plugin-app app:add`

Add a new component to an existing Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:add

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/add/index.js)_

## `@adobe/aio-cli-plugin-app app:add:action`

Add a new action

```
USAGE
  $ @adobe/aio-cli-plugin-app app:add:action

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/add/action.js)_

## `@adobe/aio-cli-plugin-app app:add:auth`

Add auth support

```
USAGE
  $ @adobe/aio-cli-plugin-app app:add:auth

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/auth.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/add/auth.js)_

## `@adobe/aio-cli-plugin-app app:add:web-assets`

Add web assets support

```
USAGE
  $ @adobe/aio-cli-plugin-app app:add:web-assets

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/add/web-assets.js)_

## `@adobe/aio-cli-plugin-app app:create [PATH]`

Create a new Adobe I/O App with default parameters

```
USAGE
  $ @adobe/aio-cli-plugin-app app:create [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -i, --import=import  Import an Adobe I/O Developer Console configuration file
  -v, --verbose        Verbose output
  --version            Show version
```

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/create.js)_

## `@adobe/aio-cli-plugin-app app:delete`

Delete a component from an existing Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:delete

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/delete/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/delete/index.js)_

## `@adobe/aio-cli-plugin-app app:delete:action [ACTION-NAME]`

Delete an existing action

```
USAGE
  $ @adobe/aio-cli-plugin-app app:delete:action [ACTION-NAME]

ARGUMENTS
  ACTION-NAME  Action name to delete, if not specified you will choose from a list of actions

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/delete/action.js)_

## `@adobe/aio-cli-plugin-app app:delete:web-assets`

Delete existing web assets

```
USAGE
  $ @adobe/aio-cli-plugin-app app:delete:web-assets

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/delete/web-assets.js)_

## `@adobe/aio-cli-plugin-app app:deploy`

Build and deploy an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:deploy

OPTIONS
  -a, --action=action  Deploy only a specific action, the flags can be specified multiple times
  -v, --verbose        Verbose output
  --skip-actions       Skip action build & deploy
  --skip-build         Skip build phase
  --skip-deploy        Skip deploy phase
  --skip-static        Skip build & deployment of static files
  --version            Show version
```

_See code: [src/commands/app/deploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/deploy.js)_

## `@adobe/aio-cli-plugin-app app:init [PATH]`

Create a new Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:init [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -i, --import=import  Import an Adobe I/O Developer Console configuration file
  -s, --skip-install   Skip npm installation after files are created
  -v, --verbose        Verbose output
  -y, --yes            Skip questions, and use all default values
  --version            Show version
```

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/init.js)_

## `@adobe/aio-cli-plugin-app app:logs`

Fetch logs for an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:logs

OPTIONS
  -l, --limit=limit  [default: 1] Limit number of activations to fetch logs from
  -v, --verbose      Verbose output
  --version          Show version
```

_See code: [src/commands/app/logs.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/logs.js)_

## `@adobe/aio-cli-plugin-app app:run`

Run an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:run

OPTIONS
  -v, --verbose  Verbose output
  --local        run/debug actions locally
  --version      Show version
```

_See code: [src/commands/app/run.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/run.js)_

## `@adobe/aio-cli-plugin-app app:test`

Run tests for an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:test

OPTIONS
  -e, --e2e      runs e2e tests.
  -u, --unit     runs unit tests (default).
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/test.js)_

## `@adobe/aio-cli-plugin-app app:undeploy`

Undeploys an Adobe I/O App

```
USAGE
  $ @adobe/aio-cli-plugin-app app:undeploy

OPTIONS
  -a, --actions  Only deploy actions.
  -s, --static   Only deploy static files.
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/undeploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/undeploy.js)_

## `@adobe/aio-cli-plugin-app app:use CONFIG_FILE_PATH`

Import an Adobe I/O Developer Console configuration file

```
USAGE
  $ @adobe/aio-cli-plugin-app app:use CONFIG_FILE_PATH

ARGUMENTS
  CONFIG_FILE_PATH  path to an Adobe I/O Developer Console configuration file

OPTIONS
  -m, --merge      Merge any .aio and .env files during import of the Adobe I/O Developer Console configuration file
  -v, --verbose    Verbose output
  -w, --overwrite  Overwrite any .aio and .env files during import of the Adobe I/O Developer Console configuration file
  --version        Show version
```

_See code: [src/commands/app/use.js](https://github.com/adobe/aio-cli-plugin-app/blob/1.0.0/src/commands/app/use.js)_
<!-- commandsstop -->
