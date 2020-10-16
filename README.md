aio-cli-plugin-app
==================

Create, Build and Deploy Adobe I/O Apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Build Status](https://travis-ci.org/adobe/aio-cli-plugin-app.svg?branch=master)](https://travis-ci.org/adobe/aio-cli-plugin-app)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-cli-plugin-app/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-cli-plugin-app/)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage
```sh-session
$ aio plugins:install -g @adobe/aio-cli-plugin-app
$ # OR
$ aio discover -i
$ aio app --help
```

# Commands
<!-- commands -->
* [`aio app`](#aio-app)
* [`aio app:add`](#aio-appadd)
* [`aio app:add:action`](#aio-appaddaction)
* [`aio app:add:ci`](#aio-appaddci)
* [`aio app:add:event`](#aio-appaddevent)
* [`aio app:add:web-assets`](#aio-appaddweb-assets)
* [`aio app:create [PATH]`](#aio-appcreate-path)
* [`aio app:delete`](#aio-appdelete)
* [`aio app:delete:action [ACTION-NAME]`](#aio-appdeleteaction-action-name)
* [`aio app:delete:ci`](#aio-appdeleteci)
* [`aio app:delete:event EVENT-ACTION-NAME`](#aio-appdeleteevent-event-action-name)
* [`aio app:delete:web-assets`](#aio-appdeleteweb-assets)
* [`aio app:deploy`](#aio-appdeploy)
* [`aio app:get-url [ACTION]`](#aio-appget-url-action)
* [`aio app:init [PATH]`](#aio-appinit-path)
* [`aio app:logs`](#aio-applogs)
* [`aio app:run`](#aio-apprun)
* [`aio app:test`](#aio-apptest)
* [`aio app:undeploy`](#aio-appundeploy)
* [`aio app:use [CONFIG_FILE_PATH]`](#aio-appuse-config_file_path)

## `aio app`

Create, run, test, and deploy Adobe I/O Apps

```
USAGE
  $ aio app

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/index.js)_

## `aio app:add`

Add a new component to an existing Adobe I/O App

```
USAGE
  $ aio app:add

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/add/index.js)_

## `aio app:add:action`

Add a new action

```
USAGE
  $ aio app:add:action

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/add/action.js)_

## `aio app:add:ci`

Add CI files

```
USAGE
  $ aio app:add:ci

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/add/ci.js)_

## `aio app:add:event`

Add a new Adobe I/O Events action

```
USAGE
  $ aio app:add:event

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/add/event.js)_

## `aio app:add:web-assets`

Add web assets support

```
USAGE
  $ aio app:add:web-assets

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/add/web-assets.js)_

## `aio app:create [PATH]`

Create a new Adobe I/O App with default parameters

```
USAGE
  $ aio app:create [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -i, --import=import  Import an Adobe I/O Developer Console configuration file
  -v, --verbose        Verbose output
  --version            Show version
```

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/create.js)_

## `aio app:delete`

Delete a component from an existing Adobe I/O App

```
USAGE
  $ aio app:delete

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/delete/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/delete/index.js)_

## `aio app:delete:action [ACTION-NAME]`

Delete an existing action

```
USAGE
  $ aio app:delete:action [ACTION-NAME]

ARGUMENTS
  ACTION-NAME  Action name to delete, if not specified you will choose from a list of actions

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/delete/action.js)_

## `aio app:delete:ci`

Delete existing CI files

```
USAGE
  $ aio app:delete:ci

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/delete/ci.js)_

## `aio app:delete:event EVENT-ACTION-NAME`

Delete an existing Adobe I/O Events action

```
USAGE
  $ aio app:delete:event EVENT-ACTION-NAME

ARGUMENTS
  EVENT-ACTION-NAME  Action name to delete

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/delete/event.js)_

## `aio app:delete:web-assets`

Delete existing web assets

```
USAGE
  $ aio app:delete:web-assets

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/delete/web-assets.js)_

## `aio app:deploy`

Build and deploy an Adobe I/O App

```
USAGE
  $ aio app:deploy

OPTIONS
  -a, --action=action  Deploy only a specific action, the flags can be specified multiple times
  -v, --verbose        Verbose output
  --open               Open the default web browser after a successful deploy, only valid if your app has a front-end
  --skip-actions       Skip action build & deploy
  --skip-build         Skip build phase
  --skip-deploy        Skip deploy phase
  --skip-static        Skip build & deployment of static files
  --version            Show version
```

_See code: [src/commands/app/deploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/deploy.js)_

## `aio app:get-url [ACTION]`

Get action URLs

```
USAGE
  $ aio app:get-url [ACTION]

OPTIONS
  -h, --hson     Output human readable json
  -j, --json     Output json
  -v, --verbose  Verbose output
  -y, --yml      Output yml
  --cdn          Display CDN based action URLs
  --version      Show version
```

_See code: [src/commands/app/get-url.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/get-url.js)_

## `aio app:init [PATH]`

Create a new Adobe I/O App

```
USAGE
  $ aio app:init [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -i, --import=import  Import an Adobe I/O Developer Console configuration file
  -s, --skip-install   Skip npm installation after files are created
  -v, --verbose        Verbose output
  -y, --yes            Skip questions, and use all default values
  --[no-]login         Login using your Adobe ID for interacting with Adobe I/O Developer Console
  --version            Show version
```

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/init.js)_

## `aio app:logs`

Fetch logs for an Adobe I/O App

```
USAGE
  $ aio app:logs

OPTIONS
  -l, --limit=limit  [default: 1] Limit number of activations to fetch logs from ( 1-50 )
  -v, --verbose      Verbose output
  --version          Show version
```

_See code: [src/commands/app/logs.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/logs.js)_

## `aio app:run`

Run an Adobe I/O App

```
USAGE
  $ aio app:run

OPTIONS
  -v, --verbose   Verbose output
  --local         run/debug actions locally
  --open          Open the default web browser after a successful run, only valid if your app has a front-end
  --skip-actions  skip actions, only run the ui server
  --version       Show version
```

_See code: [src/commands/app/run.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/run.js)_

## `aio app:test`

Run tests for an Adobe I/O App

```
USAGE
  $ aio app:test

OPTIONS
  -e, --e2e      runs e2e tests.
  -u, --unit     runs unit tests (default).
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/test.js)_

## `aio app:undeploy`

Undeploys an Adobe I/O App

```
USAGE
  $ aio app:undeploy

OPTIONS
  -v, --verbose   Verbose output
  --skip-actions  Skip action build & deploy
  --skip-static   Skip build & deployment of static files
  --version       Show version
```

_See code: [src/commands/app/undeploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/undeploy.js)_

## `aio app:use [CONFIG_FILE_PATH]`

Import an Adobe I/O Developer Console configuration file

```
USAGE
  $ aio app:use [CONFIG_FILE_PATH]

ARGUMENTS
  CONFIG_FILE_PATH  path to an Adobe I/O Developer Console configuration file

OPTIONS
  -m, --merge      Merge any .aio and .env files during import of the Adobe I/O Developer Console configuration file
  -v, --verbose    Verbose output
  -w, --overwrite  Overwrite any .aio and .env files during import of the Adobe I/O Developer Console configuration file
  --version        Show version
```

_See code: [src/commands/app/use.js](https://github.com/adobe/aio-cli-plugin-app/blob/4.1.1/src/commands/app/use.js)_
<!-- commandsstop -->
