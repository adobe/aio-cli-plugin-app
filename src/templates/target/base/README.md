

# <%= package_name %>

## Readme for overall project, what does the developer need to do to get started here?


# Adobe I/O Target App Starter

A starter project for building an Adobe I/O app using Adobe Target apis in Adobe I/O Runtime.

## Setup

- Populate the `.env` file in the project root and fill it as shown [below](#env)

## Local Dev

- `aio app run` to start your local Dev server
- App will run on `localhost:9080` by default
- Local dev server uses an expressJS proxy to invoke action code.

By default the UI will be served locally but actions will be deployed and served from Adobe I/O Runtime. To start a
local serverless stack and also run your actions locally use the `aio app run --local` option.

## Target Credential 

In all the code examples, you must pass in the {tenant} variable with your tenant value, your-bearer-token with the access token that you generate with your JWT and your-api-key with your API key from the Adobe I/O console.

- `aio rt action invoke /<your-namespace>/<package>/<action> -p tenant <your-tenant> -p apiKey <your-api-key> -p token <your-bearer-token>` 

for more information about how to get target credentail through Adobe I/O
[here](https://developers.adobetarget.com/api/#introduction)

## Test & Coverage

- Run `aio app test` to run unit tests for ui and actions
- Run `aio app test -e` to run e2e tests

## Deploy & Cleanup

- `aio app deploy` to build and deploy all actions on Runtime and static files to S3
- `aio app undeploy` to undeploy the app

Each of the above commands can either be run for actions or static files, append `-s` or `-a`, for
example `aio app deploy -s` will only build and deploy static files.

## Config

### `.env`

```bash
# This file should not be committed to source control

## please provide your Adobe I/O Runtime credentials
# AIO_RUNTIME_APIHOST=https://adobeioruntime.net
# AIO_RUNTIME_AUTH=
# AIO_RUNTIME_NAMESPACE=

## setting AIO_CNA_TVMURL will use adobeio provided hosting storage
AIO_CNA_TVMURL=https://adobeio.adobeioruntime.net/apis/tvm/

## [optional] alternatively you can comment out AIO_CNA_TVMURL and provide your
## s3 credentials to deploy your app's static files into your own storage
# AIO_CNA_AWSACCESSKEYID=
# AIO_CNA_AWSSECRETACCESSKEY=
# AIO_CNA_S3BUCKET=
```

### S3 Credentials

- Set the `TVM_URL` variable in `.env` to point to a deployed [Adobe I/O token vending
  machine](https://github.com/adobe/aio-tvm). It
  allows you to download temporary and restricted credentials to upload your
  static files to S3. Credentials will be cached in `.aws.tmp.creds.json`. Users
  with a valid namespace for Adobe I/O Runtime can simply use
  `https://adobeio.adobeioruntime.net/apis/tvm/`.

- Alternatively, you can bring your own AWS credentials by defining
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` vars in your `.env`
  file. In that case make sure to create the bucket beforehand.

### `package.json`

- We use the `name` and `version` fields for the deployment. Make sure to fill
  those out. Do not use illegal characters as this might break the deployment
  (e.g. `/`, `@`, `#`, ..).

### `manifest.yml`

- List your backend actions under the `actions` field within the `__APP_PACKAGE__`
package placeholder. We will take care of replacing the package name placeholder
by your project name and version.
- For each action, use the `function` field to indicate the path to the action
code.
- More documentation for supported action fields can be found
[here](https://github.com/apache/incubator-openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#actions).

#### Action Dependencies

- You have two options to resolve your actions' dependencies:

  1. **Packaged action file**: Add your action's dependencies to the root
   `package.json` and install them using `npm install`. Then set the `function`
   field in `manifest.yml` to point to the **entry file** of your action
   folder. We will use `parcelJS` to package your code and dependencies into a
   single minified js file. The action will then be deployed as a single file.
   Use this method if you want to reduce the size of your actions.

  2. **Zipped action folder**: In the folder containing the action code add a
     `package.json` with the action's dependencies. Then set the `function`
     field in `manifest.yml` to point to the **folder** of that action. We will
     install the required dependencies within that directory and zip the folder
     before deploying it as a zipped action. Use this method if you want to keep
     your action's dependencies separated.

## Debugging in VS Code

While running your local server (`aio app run`), both UI and actions can be debugged, to do so open the vscode debugger
and select the debugging configuration called `WebAndActions`.
Alternatively, there are also debug configs for only UI and each separate action.

## Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
