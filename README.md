aio-cli-plugin-cna
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
$ npm install -g @adobe/aio-cli-plugin-cna
$ @adobe/aio-cli-plugin-cna COMMAND
running command...
$ @adobe/aio-cli-plugin-cna (-v|--version|version)
@adobe/aio-cli-plugin-cna/0.0.2 darwin-x64 node-v10.15.3
$ @adobe/aio-cli-plugin-cna --help [COMMAND]
USAGE
  $ @adobe/aio-cli-plugin-cna COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`@adobe/aio-cli-plugin-cna cna:create [PATH]`](#adobeaio-cli-plugin-cna-cnacreate-path)
* [`@adobe/aio-cli-plugin-cna cna:deploy`](#adobeaio-cli-plugin-cna-cnadeploy)
* [`@adobe/aio-cli-plugin-cna cna:init [PATH]`](#adobeaio-cli-plugin-cna-cnainit-path)
* [`@adobe/aio-cli-plugin-cna cna:undeploy [PATH]`](#adobeaio-cli-plugin-cna-cnaundeploy-path)

## `@adobe/aio-cli-plugin-cna cna:create [PATH]`

Create a new Cloud Native Application

```
USAGE
  $ @adobe/aio-cli-plugin-cna cna:create [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -t, --template=template  [default: basic-action-view-app] template name to use
  -v, --verbose            Verbose output
  --[no-]deps              Install dependencies by running `npm install` in the target directory
  --version                Show version

DESCRIPTION
  Valid template names are basic-action-view-app, basic-action-view-app2, basic-action-view-app3
```

_See code: [src/commands/cna/create.js](https://github.com/adobe/aio-cli-plugin-cna/blob/v0.0.2/src/commands/cna/create.js)_

## `@adobe/aio-cli-plugin-cna cna:deploy`

Builds and deploys a Cloud Native Application

```
USAGE
  $ @adobe/aio-cli-plugin-cna cna:deploy

OPTIONS
  -a, --actions  Only deploy actions.
  -b, --build    Only build, don't deploy.
  -s, --static   Only deploy static files.
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/cna/deploy.js](https://github.com/adobe/aio-cli-plugin-cna/blob/v0.0.2/src/commands/cna/deploy.js)_

## `@adobe/aio-cli-plugin-cna cna:init [PATH]`

Initialize a Cloud Native Application

```
USAGE
  $ @adobe/aio-cli-plugin-cna cna:init [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questiong
  --version      Show version
```

_See code: [src/commands/cna/init.js](https://github.com/adobe/aio-cli-plugin-cna/blob/v0.0.2/src/commands/cna/init.js)_

## `@adobe/aio-cli-plugin-cna cna:undeploy [PATH]`

Builds and deploys a Cloud Native Application

```
USAGE
  $ @adobe/aio-cli-plugin-cna cna:undeploy [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -a, --actions  Only deploy actions.
  -s, --static   Only deploy static files.
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/cna/undeploy.js](https://github.com/adobe/aio-cli-plugin-cna/blob/v0.0.2/src/commands/cna/undeploy.js)_
<!-- commandsstop -->
