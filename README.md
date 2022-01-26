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
* [`aio app:config`](#aio-appconfig)
* [`aio app:config:get`](#aio-appconfigget)
* [`aio app:config:get:log-forwarding`](#aio-appconfiggetlog-forwarding)
* [`aio app:config:get:log-forwarding:errors`](#aio-appconfiggetlog-forwardingerrors)
* [`aio app:config:set`](#aio-appconfigset)
* [`aio app:config:set:log-forwarding`](#aio-appconfigsetlog-forwarding)
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
USAGE
  $ aio app

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/index.ts)_

## `aio app:add`

Add a new component to an existing Adobe I/O App

```
USAGE
  $ aio app:add

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/index.ts)_

## `aio app:add:action`

Add new actions

```
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

_See code: [src/commands/app/add/action.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/action.ts)_

## `aio app:add:ci`

Add CI files

```
USAGE
  $ aio app:add:ci

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/add/ci.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/ci.ts)_

## `aio app:add:event`

Add a new Adobe I/O Events action

```
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

_See code: [src/commands/app/add/event.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/event.ts)_

## `aio app:add:extension`

Add new extensions or a standalone application to the project

```
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

_See code: [src/commands/app/add/extension.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/extension.ts)_

## `aio app:add:service`

Subscribe to Services in the current Workspace

```
USAGE
  $ aio app:add:service

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:add:services
```

_See code: [src/commands/app/add/service.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/service.ts)_

## `aio app:add:web-assets`

Add web assets support

```
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

_See code: [src/commands/app/add/web-assets.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/add/web-assets.ts)_

## `aio app:build`

Build an Adobe I/O App

```
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

_See code: [src/commands/app/build.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/build.ts)_

## `aio app:config`

Manage app config

```
USAGE
  $ aio app:config

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:config
  $ aio app:config
```

_See code: [src/commands/app/config/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/config/index.ts)_

## `aio app:config:get`

Get app config

```
USAGE
  $ aio app:config:get

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:config:get
```

_See code: [src/commands/app/config/get/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/config/get/index.ts)_

## `aio app:config:get:log-forwarding`

Get log forwarding destination configuration

```
USAGE
  $ aio app:config:get:log-forwarding

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:config:get:log-forwarding
  $ aio app:config:get:lf
```

_See code: [src/commands/app/config/get/log-forwarding.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/config/get/log-forwarding.ts)_

## `aio app:config:get:log-forwarding:errors`

Get log forwarding errors

```
USAGE
  $ aio app:config:get:log-forwarding:errors

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:config:get:log-forwarding:errors
  $ aio app:config:get:lf:errors
```

_See code: [src/commands/app/config/get/log-forwarding/errors.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/config/get/log-forwarding/errors.ts)_

## `aio app:config:set`

Set app config

```
USAGE
  $ aio app:config:set

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:config:set
```

_See code: [src/commands/app/config/set/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/config/set/index.ts)_

## `aio app:config:set:log-forwarding`

Set log forwarding destination configuration

```
USAGE
  $ aio app:config:set:log-forwarding

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:config:set:log-forwarding
  $ aio app:config:set:lf
```

_See code: [src/commands/app/config/set/log-forwarding.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/config/set/log-forwarding.ts)_

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

_See code: [src/commands/app/create.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/create.ts)_

## `aio app:delete`

Delete a component from an existing Adobe I/O App

```
USAGE
  $ aio app:delete

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/delete/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/index.ts)_

## `aio app:delete:action [ACTION-NAME]`

Delete existing actions

```
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

_See code: [src/commands/app/delete/action.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/action.ts)_

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

_See code: [src/commands/app/delete/ci.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/ci.ts)_

## `aio app:delete:event [EVENT-ACTION-NAME]`

Delete existing Adobe I/O Events actions

```
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

_See code: [src/commands/app/delete/event.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/event.ts)_

## `aio app:delete:extension`

Add new extensions or a standalone application to the project

```
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

_See code: [src/commands/app/delete/extension.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/extension.ts)_

## `aio app:delete:service`

Delete Services in the current Workspace

```
USAGE
  $ aio app:delete:service

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version

ALIASES
  $ aio app:delete:services
```

_See code: [src/commands/app/delete/service.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/service.ts)_

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

_See code: [src/commands/app/delete/web-assets.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/delete/web-assets.ts)_

## `aio app:deploy`

Build and deploy an Adobe I/O App

```
USAGE
  $ aio app:deploy

OPTIONS
  -a, --action=action           Deploy only a specific action, the flags can be specified multiple times, this will set
                                --no-publish

  -e, --extension=extension     Deploy only a specific extension, the flags can be specified multiple times

  -v, --verbose                 Verbose output

  --[no-]actions                [default: true] Deploy actions if any

  --[no-]build                  [default: true] Run the build phase before deployment

  --[no-]content-hash           [default: true] Enable content hashing in browser code

  --[no-]force-build            [default: true] Force a build even if one already exists

  --force-publish               Force publish extension(s) to Exchange, delete previously published extension points

  --[no-]log-forwarding-update  [default: true] Update log forwarding configuration on server

  --open                        Open the default web browser after a successful deploy, only valid if your app has a
                                front-end

  --[no-]publish                [default: true] Publish extension(s) to Exchange

  --skip-actions                [deprecated] Please use --no-actions

  --skip-build                  [deprecated] Please use --no-build

  --skip-deploy                 [deprecated] Please use 'aio app build'

  --skip-static                 [deprecated] Please use --no-web-assets

  --skip-web-assets             [deprecated] Please use --no-web-assets

  --version                     Show version

  --[no-]web-assets             [default: true] Deploy web-assets if any

  --web-optimize                [default: false] Enable optimization (minification) of web js/css/html

DESCRIPTION
  This will always force a rebuild unless --no-force-build is set.
```

_See code: [src/commands/app/deploy.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/deploy.ts)_

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

_See code: [src/commands/app/get-url.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/get-url.ts)_

## `aio app:info`

Display settings/configuration in use by an Adobe I/O App

```
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

_See code: [src/commands/app/info.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/info.ts)_

## `aio app:init [PATH]`

Create a new Adobe I/O App

```
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

  --confirm-new-workspace    Skip and confirm prompt for creating a new workspace

  --[no-]extensions          Use --no-extensions to create a blank application that does not integrate with Exchange

  --[no-]install             [default: true] Run npm installation after files are created

  --[no-]login               Login using your Adobe ID for interacting with Adobe I/O Developer Console

  --version                  Show version
```

_See code: [src/commands/app/init.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/init.ts)_

## `aio app:list`

List components for Adobe I/O App

```
USAGE
  $ aio app:list

OPTIONS
  -v, --verbose  Verbose output
  --version      Show version
```

_See code: [src/commands/app/list/index.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/list/index.ts)_

## `aio app:list:extension`

List implemented extensions

```
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

_See code: [src/commands/app/list/extension.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/list/extension.ts)_

## `aio app:list:extension-points`

List all extension points for the selected org

```
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

_See code: [src/commands/app/list/extension-points.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/list/extension-points.ts)_

## `aio app:logs`

Fetch logs for an Adobe I/O App

```
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

_See code: [src/commands/app/logs.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/logs.ts)_

## `aio app:run`

Run an Adobe I/O App

```
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

_See code: [src/commands/app/run.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/run.ts)_

## `aio app:test`

Run tests for an Adobe I/O App

```
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

_See code: [src/commands/app/test.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/test.ts)_

## `aio app:undeploy`

Undeploys an Adobe I/O App

```
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

_See code: [src/commands/app/undeploy.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/undeploy.ts)_

## `aio app:use [CONFIG_FILE_PATH]`

Import an Adobe Developer Console configuration file.

```
USAGE
  $ aio app:use [CONFIG_FILE_PATH]

ARGUMENTS
  CONFIG_FILE_PATH  path to an Adobe I/O Developer Console configuration file

OPTIONS
  -g, --global                         Use the global Adobe Developer Console Org / Project / Workspace configuration,
                                       which can be set via `aio console` commands

  -v, --verbose                        Verbose output

  -w, --workspace=workspace            Specify the Adobe Developer Console Workspace name or Workspace id to import the
                                       configuration from

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

DESCRIPTION
  If the optional configuration file is not set, this command will retrieve the console org, project, and workspace 
  settings from the global config.

  To set these global config values, see the help text for 'aio console --help'.

  To download the configuration file for your project, select the 'Download' button in the toolbar of your project's 
  page in https://console.adobe.io
```

_See code: [src/commands/app/use.ts](https://github.com/adobe/aio-cli-plugin-app/blob/8.5.0-0/src/commands/app/use.ts)_
<!-- commandsstop -->
