# aio-cli-plugin-app

Create, Build and Deploy Adobe I/O Apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-cli-plugin-app.svg)](https://npmjs.org/package/@adobe/aio-cli-plugin-app)
![Node.js CI](https://github.com/adobe/aio-cli-plugin-app/workflows/Node.js%20CI/badge.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-cli-plugin-app/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-cli-plugin-app/)

<!-- toc -->
* [aio-cli-plugin-app](#aio-cli-plugin-app)
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
* [`aio app add`](#aio-app-add)
* [`aio app add action`](#aio-app-add-action)
* [`aio app add ci`](#aio-app-add-ci)
* [`aio app add event`](#aio-app-add-event)
* [`aio app add extension`](#aio-app-add-extension)
* [`aio app add service`](#aio-app-add-service)
* [`aio app add web-assets`](#aio-app-add-web-assets)
* [`aio app build`](#aio-app-build)
* [`aio app clean`](#aio-app-clean)
* [`aio app create [PATH]`](#aio-app-create-path)
* [`aio app delete`](#aio-app-delete)
* [`aio app delete action [ACTION-NAME]`](#aio-app-delete-action-action-name)
* [`aio app delete ci`](#aio-app-delete-ci)
* [`aio app delete extension`](#aio-app-delete-extension)
* [`aio app delete service`](#aio-app-delete-service)
* [`aio app delete web-assets`](#aio-app-delete-web-assets)
* [`aio app deploy`](#aio-app-deploy)
* [`aio app get-url [ACTION]`](#aio-app-get-url-action)
* [`aio app info`](#aio-app-info)
* [`aio app init [PATH]`](#aio-app-init-path)
* [`aio app install PATH`](#aio-app-install-path)
* [`aio app list`](#aio-app-list)
* [`aio app list extension`](#aio-app-list-extension)
* [`aio app logs`](#aio-app-logs)
* [`aio app pack [PATH]`](#aio-app-pack-path)
* [`aio app run`](#aio-app-run)
* [`aio app test`](#aio-app-test)
* [`aio app undeploy`](#aio-app-undeploy)
* [`aio app use [CONFIG_FILE_PATH]`](#aio-app-use-config_file_path)

## `aio app`

Create, run, test, and deploy Adobe I/O Apps

```
USAGE
  $ aio app [-v] [--version] [--config-validation]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Create, run, test, and deploy Adobe I/O Apps
```

_See code: [src/commands/app/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/index.js)_

## `aio app add`

Add a new component to an existing Adobe I/O App

```
USAGE
  $ aio app add [-v] [--version] [--config-validation]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Add a new component to an existing Adobe I/O App
```

_See code: [src/commands/app/add/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/index.js)_

## `aio app add action`

Add new actions

```
USAGE
  $ aio app add action [-v] [--version] [--config-validation] [--install] [-y] [-e <value>]

FLAGS
  -e, --extension=<value>       Add actions to a specific extension
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]install            [default: true] Run npm installation after files are created
      --version                 Show version

DESCRIPTION
  Add new actions


ALIASES
  $ aio app add actions
```

_See code: [src/commands/app/add/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/action.js)_

## `aio app add ci`

Add CI files

```
USAGE
  $ aio app add ci [-v] [--version] [--config-validation]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Add CI files
```

_See code: [src/commands/app/add/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/ci.js)_

## `aio app add event`

Add a new Adobe I/O Events action

```
USAGE
  $ aio app add event [-v] [--version] [--config-validation] [--install] [-y] [-e <value>]

FLAGS
  -e, --extension=<value>       Add events to a specific extension
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]install            [default: true] Run npm installation after files are created
      --version                 Show version

DESCRIPTION
  Add a new Adobe I/O Events action


ALIASES
  $ aio app add events
```

_See code: [src/commands/app/add/event.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/event.js)_

## `aio app add extension`

Add new extensions to the project

```
USAGE
  $ aio app add extension [-v] [--version] [--config-validation] [--install] [-y] [-e <value>...]

FLAGS
  -e, --extension=<value>...    Specify extensions to add, skips selection prompt
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]install            [default: true] Run npm installation after files are created
      --version                 Show version

DESCRIPTION
  Add new extensions to the project


ALIASES
  $ aio app add ext
  $ aio app add extensions
```

_See code: [src/commands/app/add/extension.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/extension.js)_

## `aio app add service`

Subscribe to Services in the current Workspace

```
USAGE
  $ aio app add service [-v] [--version] [--config-validation] [--use-jwt]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --use-jwt                 if the config has both jwt and OAuth Server to Server Credentials (while migrating),
                                prefer the JWT credentials
      --version                 Show version

DESCRIPTION
  Subscribe to Services in the current Workspace


ALIASES
  $ aio app add services
```

_See code: [src/commands/app/add/service.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/service.js)_

## `aio app add web-assets`

Add web assets support

```
USAGE
  $ aio app add web-assets [-v] [--version] [--config-validation] [--install] [-y] [-e <value>]

FLAGS
  -e, --extension=<value>       Add web-assets to a specific extension
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]install            [default: true] Run npm installation after files are created
      --version                 Show version

DESCRIPTION
  Add web assets support
```

_See code: [src/commands/app/add/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/add/web-assets.js)_

## `aio app build`

Build an Adobe I/O App

```
USAGE
  $ aio app build [-v] [--version] [--config-validation] [--actions | -a <value>...] [--web-assets]
    [--force-build] [--content-hash] [--web-optimize] [-e <value>... | ]

FLAGS
  -a, --action=<value>...       Build only a specific action, the flags can be specified multiple times, this will set
                                --no-publish
  -e, --extension=<value>...    Build only a specific extension point, the flags can be specified multiple times
  -v, --verbose                 Verbose output
      --[no-]actions            [default: true] Build actions if any
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]content-hash       [default: true] Enable content hashing in browser code
      --[no-]force-build        [default: true] Force a build even if one already exists
      --version                 Show version
      --[no-]web-assets         [default: true] Build web-assets if any
      --web-optimize            [default: false] Enable optimization (minification) of js/css/html

DESCRIPTION
  Build an Adobe I/O App

  Build the actions and web assets for an Adobe I/O App. Build is optimized to only build what is necessary.
  Use the --force-build flag to force a build even if one already exists.
```

_See code: [src/commands/app/build.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/build.js)_

## `aio app clean`

Remove all build artifacts from the local machine

```
USAGE
  $ aio app clean [-v] [--version] [--config-validation]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Remove all build artifacts from the local machine
  This command completely cleans all build artifacts from the dist directory including:
  - Action build files
  - Web assets (both production and development)
  - Build tracking files
  - Deployment tracking files

  Note that this will require a full rebuild on your next build command.
```

_See code: [src/commands/app/clean.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/clean.js)_

## `aio app create [PATH]`

Create a new Adobe I/O App with default parameters

```
USAGE
  $ aio app create [PATH] [-v] [--version] [--config-validation] [-i <value>]

ARGUMENTS
  [PATH]  [default: .] Path to the app directory

FLAGS
  -i, --import=<value>          Import an Adobe I/O Developer Console configuration file
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Create a new Adobe I/O App with default parameters
```

_See code: [src/commands/app/create.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/create.js)_

## `aio app delete`

Delete a component from an existing Adobe I/O App

```
USAGE
  $ aio app delete [-v] [--version] [--config-validation]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Delete a component from an existing Adobe I/O App
```

_See code: [src/commands/app/delete/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/delete/index.js)_

## `aio app delete action [ACTION-NAME]`

Delete existing actions

```
USAGE
  $ aio app delete action [ACTION-NAME] [-v] [--version] [--config-validation] [-y]

ARGUMENTS
  [ACTION-NAME]  Action `pkg/name` to delete, you can specify multiple actions via a comma separated list

FLAGS
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Delete existing actions


ALIASES
  $ aio app delete actions
```

_See code: [src/commands/app/delete/action.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/delete/action.js)_

## `aio app delete ci`

Delete existing CI files

```
USAGE
  $ aio app delete ci [-v] [--version] [--config-validation] [-y]

FLAGS
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Delete existing CI files
```

_See code: [src/commands/app/delete/ci.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/delete/ci.js)_

## `aio app delete extension`

Delete existing extensions

```
USAGE
  $ aio app delete extension [-v] [--version] [--config-validation] [-y] [--install] [-e <value>...]

FLAGS
  -e, --extension=<value>...    Specify extensions to delete, skips selection prompt
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]install            [default: true] Run npm installation after files are created
      --version                 Show version

DESCRIPTION
  Delete existing extensions


ALIASES
  $ aio app delete ext
  $ aio app delete extensions
```

_See code: [src/commands/app/delete/extension.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/delete/extension.js)_

## `aio app delete service`

Delete Services in the current Workspace

```
USAGE
  $ aio app delete service [-v] [--version] [--config-validation] [--use-jwt]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --use-jwt                 if the config has both jwt and OAuth Server to Server Credentials (while migrating),
                                prefer the JWT credentials
      --version                 Show version

DESCRIPTION
  Delete Services in the current Workspace


ALIASES
  $ aio app delete services
```

_See code: [src/commands/app/delete/service.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/delete/service.js)_

## `aio app delete web-assets`

Delete existing web assets

```
USAGE
  $ aio app delete web-assets [-v] [--version] [--config-validation] [-y]

FLAGS
  -v, --verbose                 Verbose output
  -y, --yes                     Skip questions, and use all default values
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Delete existing web assets
```

_See code: [src/commands/app/delete/web-assets.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/delete/web-assets.js)_

## `aio app deploy`

Deploy an Adobe I/O App

```
USAGE
  $ aio app deploy [-v] [--version] [--config-validation] [--actions | -a <value>...] [--web-assets]
    [--force-build | ] [--content-hash] [--web-optimize] [-e <value>... | ] [--build] [--open] [--force-deploy |
    --publish | --force-publish] [--force-events |  | ] [--log-forwarding-update]

FLAGS
  -a, --action=<value>...           Deploy only a specific action, the flags can be specified multiple times, this will
                                    set --no-publish
  -e, --extension=<value>...        Deploy only a specific extension, the flags can be specified multiple times
  -v, --verbose                     Verbose output
      --[no-]actions                [default: true] Deploy actions if any
      --[no-]build                  [default: true] Run the build phase before deployment
      --[no-]config-validation      [default: true] Validate the app configuration file(s) before continuing.
      --[no-]content-hash           [default: true] Enable content hashing in browser code
      --[no-]force-build            [default: true] Force a build even if one already exists
      --force-deploy                [default: false] Force deploy changes, regardless of production Workspace being
                                    published in Exchange.
      --[no-]force-events           [default: false] Force event registrations and delete any registrations not part of
                                    the config file
      --force-publish               [default: false] Force publish extension(s) to Exchange, delete previously published
                                    extension points
      --[no-]log-forwarding-update  [default: true] Update log forwarding configuration on server
      --open                        Open the default web browser after a successful deploy, only valid if your app has a
                                    front-end
      --[no-]publish                [default: true] Publish extension(s) to Exchange
      --version                     Show version
      --[no-]web-assets             [default: true] Deploy web-assets if any
      --web-optimize                [default: false] Enable optimization (minification) of web js/css/html

DESCRIPTION
  Deploy an Adobe I/O App

  Deploys the actions and web assets for an Adobe I/O App.
  This will also build any changed actions or web assets before deploying.
  Use the --force-build flag to force a build even if one already exists.
  Deploy is optimized to only deploy what is necessary. Be aware that deploying actions will overwrite any previous
  deployments.
  Use the --force-deploy flag to force deploy changes, regardless of production Workspace being published in Exchange.
```

_See code: [src/commands/app/deploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/deploy.js)_

## `aio app get-url [ACTION]`

Get action URLs

```
USAGE
  $ aio app get-url [ACTION] [-v] [--version] [--config-validation] [--cdn] [-j] [-h] [-y]

FLAGS
  -h, --hson                    Output human readable json
  -j, --json                    Output json
  -v, --verbose                 Verbose output
  -y, --yml                     Output yml
      --cdn                     Display CDN based action URLs
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Get action URLs
```

_See code: [src/commands/app/get-url.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/get-url.js)_

## `aio app info`

Display settings/configuration in use by an Adobe I/O App

```
USAGE
  $ aio app info [-v] [--version] [--config-validation] [-j | -h | -y] [--mask]

FLAGS
  -h, --hson                    Output human readable json
  -j, --json                    Output json
  -v, --verbose                 Verbose output
  -y, --yml                     Output yml
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]mask               Hide known private info
      --version                 Show version

DESCRIPTION
  Display settings/configuration in use by an Adobe I/O App
```

_See code: [src/commands/app/info.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/info.js)_

## `aio app init [PATH]`

Create a new Adobe I/O App

```
USAGE
  $ aio app init [PATH] [-v] [--version] [--config-validation] [--install] [-y] [--login] [-e <value>... | -t
    <value>... | --repo <value>] [--standalone-app |  | ] [--template-options <value>] [-o <value> | -i <value> | ] [-p
    <value> |  | ] [-w <value> |  | ] [--confirm-new-workspace] [--use-jwt] [--github-pat <value> ] [--linter
    none|basic|adobe-recommended]

ARGUMENTS
  [PATH]  [default: .] Path to the app directory

FLAGS
  -e, --extension=<value>...        Extension point(s) to implement
  -i, --import=<value>              Import an Adobe I/O Developer Console configuration file
  -o, --org=<value>                 Specify the Adobe Developer Console Org to init from (orgId, or orgCode)
  -p, --project=<value>             Specify the Adobe Developer Console Project to init from (projectId, or projectName)
  -t, --template=<value>...         Specify a link to a template that will be installed
  -v, --verbose                     Verbose output
  -w, --workspace=<value>           [default: Stage] Specify the Adobe Developer Console Workspace to init from,
                                    defaults to Stage
  -y, --yes                         Skip questions, and use all default values
      --[no-]config-validation      [default: true] Validate the app configuration file(s) before continuing.
      --[no-]confirm-new-workspace  Prompt to confirm before creating a new workspace
      --github-pat=<value>          github personal access token to use for downloading private quickstart repos
      --[no-]install                [default: true] Run npm installation after files are created
      --linter=<option>             [default: basic] Specify the linter to use for the project
                                    <options: none|basic|adobe-recommended>
      --[no-]login                  Login using your Adobe ID for interacting with Adobe I/O Developer Console
      --repo=<value>                Init from gh quick-start repo. Expected to be of the form <owner>/<repo>/<path>
      --standalone-app              Create a stand-alone application
      --template-options=<value>    Optional template options, as a base64-encoded json string
      --use-jwt                     if the config has both jwt and OAuth Server to Server Credentials (while migrating),
                                    prefer the JWT credentials
      --version                     Show version

DESCRIPTION
  Create a new Adobe I/O App
```

_See code: [src/commands/app/init.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/init.js)_

## `aio app install PATH`

This command will support installing apps packaged by 'aio app pack'.

```
USAGE
  $ aio app install PATH [-v] [--version] [--config-validation] [--allow-scripts] [-o <value>] [--tests]

ARGUMENTS
  PATH  Path to the app package to install

FLAGS
  -o, --output=<value>          [default: .] The packaged app output folder path
  -v, --verbose                 Verbose output
      --[no-]allow-scripts      Allow post and preinstall scripts during npm install/npm ci
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]tests              Run packaged app unit tests (e.g. aio app:test)
      --version                 Show version

DESCRIPTION
  This command will support installing apps packaged by 'aio app pack'.
```

_See code: [src/commands/app/install.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/install.js)_

## `aio app list`

List components for Adobe I/O App

```
USAGE
  $ aio app list [-v] [--version] [--config-validation]

FLAGS
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  List components for Adobe I/O App
```

_See code: [src/commands/app/list/index.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/list/index.js)_

## `aio app list extension`

List implemented extensions

```
USAGE
  $ aio app list extension [-v] [--version] [--config-validation] [-j] [-y]

FLAGS
  -j, --json                    Output json
  -v, --verbose                 Verbose output
  -y, --yml                     Output yml
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  List implemented extensions


ALIASES
  $ aio app list ext
  $ aio app list extensions
```

_See code: [src/commands/app/list/extension.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/list/extension.js)_

## `aio app logs`

Fetch logs for an Adobe I/O App

```
USAGE
  $ aio app logs [-v] [--version] [--config-validation] [-l <value>] [-a <value>...] [-r] [-t | -w | -o]

FLAGS
  -a, --action=<value>...       Fetch logs for a specific action
  -l, --limit=<value>           [default: 1] Limit number of activations to fetch logs from ( 1-50 )
  -o, --poll                    Fetch logs continuously
  -r, --strip                   strip timestamp information and output first line only
  -t, --tail                    Fetch logs continuously
  -v, --verbose                 Verbose output
  -w, --watch                   Fetch logs continuously
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --version                 Show version

DESCRIPTION
  Fetch logs for an Adobe I/O App
```

_See code: [src/commands/app/logs.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/logs.js)_

## `aio app pack [PATH]`

This command will support packaging apps for redistribution.

```
USAGE
  $ aio app pack [PATH] [-v] [--version] [--config-validation] [--lock-file] [-o <value>]

ARGUMENTS
  [PATH]  [default: .] Path to the app directory to package

FLAGS
  -o, --output=<value>          [default: dist/app.zip] The packaged app output file path
  -v, --verbose                 Verbose output
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]lock-file          Include the package-lock.json file in the packaged app. When disabled, compatibility
                                validation is skipped since the provisioner will use npm install instead of npm ci.
      --version                 Show version

DESCRIPTION
  This command will support packaging apps for redistribution.
```

_See code: [src/commands/app/pack.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/pack.js)_

## `aio app run`

Run an Adobe I/O App

```
USAGE
  $ aio app run [-v] [--version] [--config-validation] [--serve] [--actions] [--open] [-e <value>]

FLAGS
  -e, --extension=<value>       Run only a specific extension, this flag can only be specified once
  -v, --verbose                 Verbose output
      --[no-]actions            [default: true] Run actions, defaults to true, to skip actions use --no-actions
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --open                    Open the default web browser after a successful run, only valid if your app has a
                                front-end
      --[no-]serve              [default: true] Start frontend server (experimental)
      --version                 Show version

DESCRIPTION
  Run an Adobe I/O App
```

_See code: [src/commands/app/run.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/run.js)_

## `aio app test`

Run tests for an Adobe I/O App

```
USAGE
  $ aio app test [-v] [--version] [--config-validation] [-e <value>... | -a <value>...] [--all] [--e2e]
    [--unit]

FLAGS
  -a, --action=<value>...       the action(s) to test
  -e, --extension=<value>...    the extension(s) to test
  -v, --verbose                 Verbose output
      --all                     run both unit and e2e tests
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --e2e                     run e2e tests
      --unit                    run unit tests
      --version                 Show version

DESCRIPTION
  Run tests for an Adobe I/O App
  If no flags are specified, by default only unit-tests are run.

  For the --action flag, it tries a substring search on the 'package-name/action-name' pair for an action.
  For the --extension flag, it tries a substring search on the 'extension-name' only.
  If the extension has a hook called 'test' in its 'ext.config.yaml', the script specified will be run instead.
```

_See code: [src/commands/app/test.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/test.js)_

## `aio app undeploy`

Undeploys an Adobe I/O App

```
USAGE
  $ aio app undeploy [-v] [--version] [--config-validation] [--actions] [--events] [--web-assets] [-e <value>...]
    [--force-unpublish | --unpublish]

FLAGS
  -e, --extension=<value>...    Undeploy only a specific extension, the flags can be specified multiple times
  -v, --verbose                 Verbose output
      --[no-]actions            [default: true] Undeploy actions if any
      --[no-]config-validation  [default: true] Validate the app configuration file(s) before continuing.
      --[no-]events             [default: true] Undeploy (unregister) events if any
      --force-unpublish         Force unpublish extension(s) from Exchange, will delete all extension points
      --[no-]unpublish          [default: true] Unpublish selected extension(s) from Exchange
      --version                 Show version
      --[no-]web-assets         [default: true] Undeploy web-assets if any

DESCRIPTION
  Undeploys an Adobe I/O App
```

_See code: [src/commands/app/undeploy.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/undeploy.js)_

## `aio app use [CONFIG_FILE_PATH]`

Import an Adobe Developer Console configuration file.

```
USAGE
  $ aio app use [CONFIG_FILE_PATH] [-v] [--version] [--config-validation] [--overwrite | -m] [-g | -w
    <value>] [--confirm-new-workspace] [--no-service-sync | --confirm-service-sync] [--no-input] [--use-jwt]

ARGUMENTS
  [CONFIG_FILE_PATH]  path to an Adobe I/O Developer Console configuration file

FLAGS
  -g, --global                      Use the global Adobe Developer Console Org / Project / Workspace configuration,
                                    which can be set via `aio console` commands
  -m, --merge                       Merge any .aio and .env files during import of the Adobe Developer Console
                                    configuration file
  -v, --verbose                     Verbose output
  -w, --workspace=<value>           Specify the Adobe Developer Console Workspace name or Workspace id to import the
                                    configuration from
      --[no-]config-validation      [default: true] Validate the app configuration file(s) before continuing.
      --[no-]confirm-new-workspace  Prompt to confirm before creating a new workspace
      --confirm-service-sync        Skip the Service sync prompt and overwrite Service subscriptions in the new
                                    Workspace with current subscriptions
      --no-input                    Skip user prompts by setting --no-service-sync and --merge. Requires one of
                                    config_file_path or --global or --workspace
      --no-service-sync             Skip the Service sync prompt and do not attach current Service subscriptions to the
                                    new Workspace
      --overwrite                   Overwrite any .aio and .env files during import of the Adobe Developer Console
                                    configuration file
      --use-jwt                     if the config has both jwt and OAuth Server to Server Credentials (while migrating),
                                    prefer the JWT credentials
      --version                     Show version

DESCRIPTION
  Import an Adobe Developer Console configuration file.

  If the optional configuration file is not set, this command will retrieve the console org, project, and workspace
  settings from the global config.

  To set these global config values, see the help text for 'aio console --help'.

  To download the configuration file for your project, select the 'Download' button in the toolbar of your project's
  page in https://developer.adobe.com/console/
```

_See code: [src/commands/app/use.js](https://github.com/adobe/aio-cli-plugin-app/blob/14.4.1/src/commands/app/use.js)_
<!-- commandsstop -->
