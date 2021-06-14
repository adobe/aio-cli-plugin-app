aio-cli-plugin-app
==================

Create, Build and Deploy Adobe I/O Apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
![Node.js CI](https://github.com/adobe/aio-cli-plugin-app/workflows/Node.js%20CI/badge.svg)
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
* [`aio app:add:service`](#aio-appaddservice)
* [`aio app:add:web-assets`](#aio-appaddweb-assets)
* [`aio app:build`](#aio-appbuild)
* [`aio app:create [PATH]`](#aio-appcreate-path)
* [`aio app:delete`](#aio-appdelete)
* [`aio app:delete:action [ACTION-NAME]`](#aio-appdeleteaction-action-name)
* [`aio app:delete:ci`](#aio-appdeleteci)
* [`aio app:delete:event EVENT-ACTION-NAME`](#aio-appdeleteevent-event-action-name)
* [`aio app:delete:service`](#aio-appdeleteservice)
* [`aio app:delete:web-assets`](#aio-appdeleteweb-assets)
* [`aio app:deploy`](#aio-appdeploy)
* [`aio app:get-url [ACTION]`](#aio-appget-url-action)
* [`aio app:info`](#aio-appinfo)
* [`aio app:init [PATH]`](#aio-appinit-path)
* [`aio app:logs`](#aio-applogs)
* [`aio app:run`](#aio-apprun)
* [`aio app:test`](#aio-apptest)
* [`aio app:undeploy`](#aio-appundeploy)
* [`aio app:use [CONFIG_FILE_PATH]`](#aio-appuse-config_file_path)

## `aio app`

Create, run, test, and deploy Adobe I/O Apps

```
Create, run, test, and deploy Adobe I/O Apps

USAGE
  $ aio app

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/index.js)_

## `aio app:add`

Add a new component to an existing Adobe I/O App

```
Add a new component to an existing Adobe I/O App

USAGE
  $ aio app:add

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/add/index.js)_

## `aio app:add:action`

Add a new action

```
Add a new action


USAGE
  $ aio app:add:action

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/add/action.js)_

## `aio app:add:ci`

Add CI files

```
Add CI files


USAGE
  $ aio app:add:ci

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/add/ci.js)_

## `aio app:add:event`

Add a new Adobe I/O Events action

```
Add a new Adobe I/O Events action


USAGE
  $ aio app:add:event

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/add/event.js)_

## `aio app:add:service`

Subscribe to Services in the current Workspace

```
Subscribe to Services in the current Workspace


USAGE
  $ aio app:add:service

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:add:services
```

_See code: [src/commands/app/add/service.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/add/service.js)_

## `aio app:add:web-assets`

Add web assets support

```
Add web assets support


USAGE
  $ aio app:add:web-assets

OPTIONS
  -v, --verbose   Verbose output
  -y, --yes       Skip questions, and use all default values
  --skip-install  Skip npm installation after files are created
  --version       Show version
```

_See code: [src/commands/app/add/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/add/web-assets.js)_

## `aio app:build`

Build an Adobe I/O App

```
Build an Adobe I/O App

This will always force a rebuild unless --no-force-build is set.


USAGE
  $ aio app:build

OPTIONS
  -a, --action=action  Build only a specific action, the flags can be specified multiple times
  -v, --verbose        Verbose output
  --[no-]content-hash  Enable content hashing in browser code (default: true)
  --[no-]force-build   Forces a build even if one already exists (default: true)
  --skip-actions       Skip build of actions
  --skip-static        Skip build of static files
  --skip-web-assets    Skip build of web assets
  --version            Show version

DESCRIPTION
  This will always force a rebuild unless --no-force-build is set.
```

_See code: [src/commands/app/build.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/build.js)_

## `aio app:create [PATH]`

Create a new Adobe I/O App with default parameters

```
Create a new Adobe I/O App with default parameters


USAGE
  $ aio app:create [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -i, --import=import  Import an Adobe I/O Developer Console configuration file
  -v, --verbose        Verbose output
  --version            Show version
```

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/create.js)_

## `aio app:delete`

Delete a component from an existing Adobe I/O App

```
Delete a component from an existing Adobe I/O App

USAGE
  $ aio app:delete

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/delete/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/delete/index.js)_

## `aio app:delete:action [ACTION-NAME]`

Delete an existing action

```
Delete an existing action


USAGE
  $ aio app:delete:action [ACTION-NAME]

ARGUMENTS
  ACTION-NAME  Action name to delete, if not specified you will choose from a list of actions

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/delete/action.js)_

## `aio app:delete:ci`

Delete existing CI files

```
Delete existing CI files


USAGE
  $ aio app:delete:ci

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/delete/ci.js)_

## `aio app:delete:event EVENT-ACTION-NAME`

Delete an existing Adobe I/O Events action

```
Delete an existing Adobe I/O Events action


USAGE
  $ aio app:delete:event EVENT-ACTION-NAME

ARGUMENTS
  EVENT-ACTION-NAME  Action name to delete

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/delete/event.js)_

## `aio app:delete:service`

Delete Services in the current Workspace

```
Delete Services in the current Workspace


USAGE
  $ aio app:delete:service

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:delete:services
```

_See code: [src/commands/app/delete/service.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/delete/service.js)_

## `aio app:delete:web-assets`

Delete existing web assets

```
Delete existing web assets


USAGE
  $ aio app:delete:web-assets

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version
```

_See code: [src/commands/app/delete/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/delete/web-assets.js)_

## `aio app:deploy`

Build and deploy an Adobe I/O App

```
Build and deploy an Adobe I/O App

This will always force a rebuild unless --no-force-build is set. 


USAGE
  $ aio app:deploy

OPTIONS
  -a, --action=action  Deploy only a specific action, the flags can be specified multiple times
  -v, --verbose        Verbose output
  --[no-]content-hash  Enable content hashing in browser code (default: true)
  --[no-]force-build   Forces a build even if one already exists (default: true)
  --open               Open the default web browser after a successful deploy, only valid if your app has a front-end
  --skip-actions       Skip action build & deploy
  --skip-build         Skip build phase
  --skip-deploy        Skip deploy phase
  --skip-static        Skip build & deployment of static files
  --skip-web-assets    Skip build & deployment of web assets
  --version            Show version

DESCRIPTION
  This will always force a rebuild unless --no-force-build is set.
```

_See code: [src/commands/app/deploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/deploy.js)_

## `aio app:get-url [ACTION]`

Get action URLs

```
Get action URLs

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

_See code: [src/commands/app/get-url.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/get-url.js)_

## `aio app:info`

Display settings/configuration in use by an Adobe I/O App

```
Display settings/configuration in use by an Adobe I/O App



USAGE
  $ aio app:info

OPTIONS
  -h, --hson     Output human readable json
  -j, --json     Output json
  -v, --verbose  Verbose output
  -y, --yml      Output yml
  --[no-]mask    Hide known private info
  --version      Show version

DESCRIPTION
```

_See code: [src/commands/app/info.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/info.js)_

## `aio app:init [PATH]`

Create a new Adobe I/O App

```
Create a new Adobe I/O App


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

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/init.js)_

## `aio app:logs`

Fetch logs for an Adobe I/O App

```
Fetch logs for an Adobe I/O App


USAGE
  $ aio app:logs

OPTIONS
  -a, --action=action  Fetch logs for a specific action
  -l, --limit=limit    [default: 1] Limit number of activations to fetch logs from ( 1-50 )
  -o, --poll           Fetch logs continuously
  -r, --strip          strip timestamp information and output first line only
  -t, --tail           Fetch logs continuously
  -v, --verbose        Verbose output
  -w, --watch          Fetch logs continuously
  --version            Show version
```

_See code: [src/commands/app/logs.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/logs.js)_

## `aio app:run`

Run an Adobe I/O App

```
Run an Adobe I/O App

USAGE
  $ aio app:run

OPTIONS
  -v, --verbose   Verbose output
  --local         run/debug actions locally ( requires Docker running )
  --open          Open the default web browser after a successful run, only valid if your app has a front-end
  --[no-]serve    start frontend server (experimental)
  --skip-actions  skip actions, only run the ui server
  --version       Show version
```

_See code: [src/commands/app/run.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/run.js)_

## `aio app:test`

Run tests for an Adobe I/O App

```
Run tests for an Adobe I/O App


USAGE
  $ aio app:test

OPTIONS
  -e, --e2e      runs e2e tests.
  -u, --unit     runs unit tests (default).
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/test.js)_

## `aio app:undeploy`

Undeploys an Adobe I/O App

```
Undeploys an Adobe I/O App


USAGE
  $ aio app:undeploy

OPTIONS
  -v, --verbose      Verbose output
  --skip-actions     Skip undeployment of actions
  --skip-static      Skip undeployment of static files
  --skip-web-assets  Skip undeployment of web assets
  --version          Show version
```

_See code: [src/commands/app/undeploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/undeploy.js)_

## `aio app:use [CONFIG_FILE_PATH]`

Import an Adobe Developer Console configuration file.

```
Import an Adobe Developer Console configuration file.

If the optional configuration file is not set, this command will retrieve the console org, project, and workspace settings from the global config.

To set these global config values, see the help text for 'aio console --help'.

To download the configuration file for your project, select the 'Download' button in the toolbar of your project's page in https://console.adobe.io


USAGE
  $ aio app:use [CONFIG_FILE_PATH]

ARGUMENTS
  CONFIG_FILE_PATH  path to an Adobe I/O Developer Console configuration file

OPTIONS
  -g, --global                         Use the global Adobe Developer Console Org / Project / Workspace configuration,
                                       which can be set via `aio console` commands

  -v, --verbose                        Verbose output

  -w, --workspace-name=workspace-name  Specify the Adobe Developer Console Workspace name to import the configuration
                                       from

  --confirm-service-sync               Skip the Service sync prompt and overwrite Service subscriptions in the new
                                       Workspace with current subscriptions

  --merge                              Merge any .aio and .env files during import of the Adobe Developer Console
                                       configuration file

  --no-input                           Skip user prompts by setting --no-service-sync and --merge. Requires one of
                                       config_file_path or --global or --workspace-name

  --no-service-sync                    Skip the Service sync prompt and do not attach current Service subscriptions to
                                       the new Workspace

  --overwrite                          Overwrite any .aio and .env files during import of the Adobe Developer Console
                                       configuration file

  --version                            Show version

  --workspace                          Prompt for selection of a Workspace in the same Project, and import the
                                       configuration for this Workspace

DESCRIPTION
  If the optional configuration file is not set, this command will retrieve the console org, project, and workspace 
  settings from the global config.

  To set these global config values, see the help text for 'aio console --help'.

  To download the configuration file for your project, select the 'Download' button in the toolbar of your project's 
  page in https://console.adobe.io
```

_See code: [src/commands/app/use.js](https://github.com/adobe/aio-cli-plugin-app/blob/7.0.2/src/commands/app/use.js)_
<!-- commandsstop -->
