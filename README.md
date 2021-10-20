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
* [`aio app:add:extension`](#aio-appaddextension)
* [`aio app:add:service`](#aio-appaddservice)
* [`aio app:add:web-assets`](#aio-appaddweb-assets)
* [`aio app:build`](#aio-appbuild)
* [`aio app:create [PATH]`](#aio-appcreate-path)
* [`aio app:delete`](#aio-appdelete)
* [`aio app:delete:action [ACTION-NAME]`](#aio-appdeleteaction-action-name)
* [`aio app:delete:ci`](#aio-appdeleteci)
* [`aio app:delete:event [EVENT-ACTION-NAME]`](#aio-appdeleteevent-event-action-name)
* [`aio app:delete:extension`](#aio-appdeleteextension)
* [`aio app:delete:service`](#aio-appdeleteservice)
* [`aio app:delete:web-assets`](#aio-appdeleteweb-assets)
* [`aio app:deploy`](#aio-appdeploy)
* [`aio app:get-url [ACTION]`](#aio-appget-url-action)
* [`aio app:info`](#aio-appinfo)
* [`aio app:init [PATH]`](#aio-appinit-path)
* [`aio app:list`](#aio-applist)
* [`aio app:list:extension`](#aio-applistextension)
* [`aio app:list:extension-points`](#aio-applistextension-points)
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

_See code: [src/commands/app/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/index.js)_

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

_See code: [src/commands/app/add/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/index.js)_

## `aio app:add:action`

Add new actions

```
Add new actions


USAGE
  $ aio app:add:action

OPTIONS
  -e, --extension=extension  Add actions to a specific extension
  -s, --skip-install         [deprecated] Please use --no-install
  -v, --verbose              Verbose output
  -y, --yes                  Skip questions, and use all default values
  --[no-]install             [default: true] Run npm installation after files are created
  --version                  Show version

ALIASES
  $ aio app:add:actions
```

_See code: [src/commands/app/add/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/action.js)_

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

_See code: [src/commands/app/add/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/ci.js)_

## `aio app:add:event`

Add a new Adobe I/O Events action

```
Add a new Adobe I/O Events action


USAGE
  $ aio app:add:event

OPTIONS
  -e, --extension=extension  Add actions to a specific extension
  -s, --skip-install         [deprecated] Please use --no-install
  -v, --verbose              Verbose output
  -y, --yes                  Skip questions, and use all default values
  --[no-]install             [default: true] Run npm installation after files are created
  --version                  Show version

ALIASES
  $ aio app:add:events
```

_See code: [src/commands/app/add/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/event.js)_

## `aio app:add:extension`

Add new extensions or a standalone application to the project

```
Add new extensions or a standalone application to the project


USAGE
  $ aio app:add:extension

OPTIONS
  -e, --extension=extension  Specify extensions to add, skips selection prompt
  -s, --skip-install         [deprecated] Please use --no-install
  -v, --verbose              Verbose output
  -y, --yes                  Skip questions, and use all default values
  --[no-]install             [default: true] Run npm installation after files are created
  --version                  Show version

ALIASES
  $ aio app:add:ext
  $ aio app:add:extensions
```

_See code: [src/commands/app/add/extension.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/extension.js)_

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

_See code: [src/commands/app/add/service.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/service.js)_

## `aio app:add:web-assets`

Add web assets support

```
Add web assets support


USAGE
  $ aio app:add:web-assets

OPTIONS
  -e, --extension=extension  Add web-assets to a specific extension
  -s, --skip-install         [deprecated] Please use --no-install
  -v, --verbose              Verbose output
  -y, --yes                  Skip questions, and use all default values
  --[no-]install             [default: true] Run npm installation after files are created
  --version                  Show version
```

_See code: [src/commands/app/add/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/add/web-assets.js)_

## `aio app:build`

Build an Adobe I/O App

```
Build an Adobe I/O App

This will always force a rebuild unless --no-force-build is set.


USAGE
  $ aio app:build

OPTIONS
  -a, --action=action        Build only a specific action, the flags can be specified multiple times, this will set
                             --no-publish

  -e, --extension=extension  Build only a specific extension point, the flags can be specified multiple times

  -v, --verbose              Verbose output

  --[no-]actions             [default: true] Build actions if any

  --[no-]content-hash        [default: true] Enable content hashing in browser code

  --[no-]force-build         [default: true] Force a build even if one already exists

  --skip-actions             [deprecated] Please use --no-actions

  --skip-static              [deprecated] Please use --no-web-assets

  --skip-web-assets          [deprecated] Please use --no-web-assets

  --version                  Show version

  --[no-]web-assets          [default: true] Build web-assets if any

  --web-optimize             [default: false] Enable optimization (minification) of js/css/html

DESCRIPTION
  This will always force a rebuild unless --no-force-build is set.
```

_See code: [src/commands/app/build.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/build.js)_

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

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/create.js)_

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

_See code: [src/commands/app/delete/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/index.js)_

## `aio app:delete:action [ACTION-NAME]`

Delete existing actions

```
Delete existing actions


USAGE
  $ aio app:delete:action [ACTION-NAME]

ARGUMENTS
  ACTION-NAME  Action `pkg/name` to delete, you can specify multiple actions via a comma separated list

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version

ALIASES
  $ aio app:delete:actions
```

_See code: [src/commands/app/delete/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/action.js)_

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

_See code: [src/commands/app/delete/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/ci.js)_

## `aio app:delete:event [EVENT-ACTION-NAME]`

Delete existing Adobe I/O Events actions

```
Delete existing Adobe I/O Events actions


USAGE
  $ aio app:delete:event [EVENT-ACTION-NAME]

ARGUMENTS
  EVENT-ACTION-NAME  Action `pkg/name` to delete, you can specify multiple actions via a comma separated list

OPTIONS
  -v, --verbose  Verbose output
  -y, --yes      Skip questions, and use all default values
  --version      Show version

ALIASES
  $ aio app:delete:events
```

_See code: [src/commands/app/delete/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/event.js)_

## `aio app:delete:extension`

Add new extensions or a standalone application to the project

```
Add new extensions or a standalone application to the project


USAGE
  $ aio app:delete:extension

OPTIONS
  -e, --extension=extension  Specify extensions to delete, skips selection prompt
  -v, --verbose              Verbose output
  -y, --yes                  Skip questions, and use all default values
  --skip-install             Skip npm installation after files are created
  --version                  Show version

ALIASES
  $ aio app:delete:ext
  $ aio app:delete:extensions
```

_See code: [src/commands/app/delete/extension.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/extension.js)_

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

_See code: [src/commands/app/delete/service.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/service.js)_

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

_See code: [src/commands/app/delete/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/delete/web-assets.js)_

## `aio app:deploy`

Build and deploy an Adobe I/O App

```
Build and deploy an Adobe I/O App

This will always force a rebuild unless --no-force-build is set.


USAGE
  $ aio app:deploy

OPTIONS
  -a, --action=action        Deploy only a specific action, the flags can be specified multiple times, this will set
                             --no-publish

  -e, --extension=extension  Deploy only a specific extension, the flags can be specified multiple times

  -v, --verbose              Verbose output

  --[no-]actions             [default: true] Deploy actions if any

  --[no-]build               [default: true] Run the build phase before deployment

  --[no-]content-hash        [default: true] Enable content hashing in browser code

  --[no-]force-build         [default: true] Force a build even if one already exists

  --force-publish            Force publish extension(s) to Exchange, delete previously published extension points

  --open                     Open the default web browser after a successful deploy, only valid if your app has a
                             front-end

  --[no-]publish             [default: true] Publish extension(s) to Exchange

  --skip-actions             [deprecated] Please use --no-actions

  --skip-build               [deprecated] Please use --no-build

  --skip-deploy              [deprecated] Please use 'aio app build'

  --skip-static              [deprecated] Please use --no-web-assets

  --skip-web-assets          [deprecated] Please use --no-web-assets

  --version                  Show version

  --[no-]web-assets          [default: true] Deploy web-assets if any

  --web-optimize             [default: false] Enable optimization (minification) of web js/css/html

DESCRIPTION
  This will always force a rebuild unless --no-force-build is set.
```

_See code: [src/commands/app/deploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/deploy.js)_

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

_See code: [src/commands/app/get-url.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/get-url.js)_

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
```

_See code: [src/commands/app/info.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/info.js)_

## `aio app:init [PATH]`

Create a new Adobe I/O App

```
Create a new Adobe I/O App


USAGE
  $ aio app:init [PATH]

ARGUMENTS
  PATH  [default: .] Path to the app directory

OPTIONS
  -e, --extension=extension  Extension point(s) to implement
  -i, --import=import        Import an Adobe I/O Developer Console configuration file
  -s, --skip-install         [deprecated] Please use --no-install
  -v, --verbose              Verbose output

  -w, --workspace=workspace  [default: Stage] Specify the Adobe Developer Console Workspace to init from, defaults to
                             Stage

  -y, --yes                  Skip questions, and use all default values

  --[no-]extensions          Use --no-extensions to create a blank application that does not integrate with Exchange

  --[no-]install             [default: true] Run npm installation after files are created

  --[no-]login               Login using your Adobe ID for interacting with Adobe I/O Developer Console

  --version                  Show version
```

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/init.js)_

## `aio app:list`

List components for Adobe I/O App

```
List components for Adobe I/O App

USAGE
  $ aio app:list

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/list/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/list/index.js)_

## `aio app:list:extension`

List implemented extensions

```
List implemented extensions


USAGE
  $ aio app:list:extension

OPTIONS
  -j, --json     Output json
  -v, --verbose  Verbose output
  -y, --yml      Output yml
  --version      Show version

ALIASES
  $ aio app:list:ext
  $ aio app:list:extensions
```

_See code: [src/commands/app/list/extension.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/list/extension.js)_

## `aio app:list:extension-points`

List all extension points for the selected org

```
List all extension points for the selected org


USAGE
  $ aio app:list:extension-points

OPTIONS
  -j, --json     Output json
  -v, --verbose  Verbose output
  -y, --yml      Output yml
  --version      Show version

ALIASES
  $ aio app:list:ext-points
  $ aio app:list:extension-points
```

_See code: [src/commands/app/list/extension-points.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/list/extension-points.js)_

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

_See code: [src/commands/app/logs.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/logs.js)_

## `aio app:run`

Run an Adobe I/O App

```
Run an Adobe I/O App

USAGE
  $ aio app:run

OPTIONS
  -e, --extension=extension  Run only a specific extension, this flag can only be specified once
  -v, --verbose              Verbose output
  --[no-]actions             [default: true] Run actions, defaults to true, to skip actions use --no-actions
  --local                    Run/debug actions locally ( requires Docker running )
  --open                     Open the default web browser after a successful run, only valid if your app has a front-end
  --[no-]serve               [default: true] Start frontend server (experimental)
  --skip-actions             [deprecated] Please use --no-actions
  --version                  Show version
```

_See code: [src/commands/app/run.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/run.js)_

## `aio app:test`

Run tests for an Adobe I/O App

```
Run tests for an Adobe I/O App
If no flags are specified, by default only unit-tests are run.

For the --action flag, it tries a substring search on the 'package-name/action-name' pair for an action.
For the --extension flag, it tries a substring search on the 'extension-name' only.
If the extension has a hook called 'test' in its 'ext.config.yaml', the script specified will be run instead.



USAGE
  $ aio app:test

OPTIONS
  -a, --action=action        the action(s) to test
  -e, --extension=extension  the extension(s) to test
  --all                      run both unit and e2e tests
  --e2e                      run e2e tests
  --unit                     run unit tests

DESCRIPTION
  If no flags are specified, by default only unit-tests are run.

  For the --action flag, it tries a substring search on the 'package-name/action-name' pair for an action.
  For the --extension flag, it tries a substring search on the 'extension-name' only.
  If the extension has a hook called 'test' in its 'ext.config.yaml', the script specified will be run instead.
```

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/test.js)_

## `aio app:undeploy`

Undeploys an Adobe I/O App

```
Undeploys an Adobe I/O App


USAGE
  $ aio app:undeploy

OPTIONS
  -e, --extension=extension  Undeploy only a specific extension, the flags can be specified multiple times
  -v, --verbose              Verbose output
  --[no-]actions             [default: true] Undeploy actions if any
  --force-unpublish          Force unpublish extension(s) from Exchange, will delete all extension points
  --skip-actions             [deprecated] Please use --no-actions
  --skip-static              [deprecated] Please use --no-web-assets
  --skip-web-assets          [deprecated] Please use --no-web-assets
  --[no-]unpublish           [default: true] Unpublish selected extension(s) from Exchange
  --version                  Show version
  --[no-]web-assets          [default: true] Undeploy web-assets if any
```

_See code: [src/commands/app/undeploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/undeploy.js)_

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

  -w, --workspace=workspace            Specify the Adobe Developer Console Workspace name to import the configuration
                                       from

  -w, --workspace-name=workspace-name  [DEPRECATED]: please use --workspace instead

  --confirm-new-workspace              Skip and confirm prompt for creating a new workspace

  --confirm-service-sync               Skip the Service sync prompt and overwrite Service subscriptions in the new
                                       Workspace with current subscriptions

  --merge                              Merge any .aio and .env files during import of the Adobe Developer Console
                                       configuration file

  --no-input                           Skip user prompts by setting --no-service-sync and --merge. Requires one of
                                       config_file_path or --global or --workspace

  --no-service-sync                    Skip the Service sync prompt and do not attach current Service subscriptions to
                                       the new Workspace

  --overwrite                          Overwrite any .aio and .env files during import of the Adobe Developer Console
                                       configuration file

  --version                            Show version

  --workspaceId=workspaceId            Specify the Adobe Developer Console Workspace id to import the configuration from

DESCRIPTION
  If the optional configuration file is not set, this command will retrieve the console org, project, and workspace 
  settings from the global config.

  To set these global config values, see the help text for 'aio console --help'.

  To download the configuration file for your project, select the 'Download' button in the toolbar of your project's 
  page in https://console.adobe.io
```

_See code: [src/commands/app/use.js](https://github.com/adobe/aio-cli-plugin-app/blob/8.3.0/src/commands/app/use.js)_
<!-- commandsstop -->
