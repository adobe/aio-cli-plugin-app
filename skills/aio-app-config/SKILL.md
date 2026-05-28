---
name: aio-app-config
description: >-
  Explains App Builder app.config.yaml, ext.config.yaml, Runtime manifests, actions,
  web assets, hooks, and extension points for aio-cli-plugin-app. Use when editing
  deploy manifests, adding actions, or configuring frontends and events.
---

# App configuration (`app.config.yaml`)

Validation schemas live in the plugin repo: `schema/config.schema.json`, `schema/deploy.yaml.schema.json`.

## Standalone application

```yaml
application:
  actions: actions          # folder for action sources
  web: web-src              # optional frontend root
  runtimeManifest:
    packages:
      my-package:
        license: Apache-2.0
        actions:
          my-action:
            function: actions/my-action/index.js
            web: 'yes'                    # HTTP-accessible
            runtime: nodejs:22
            inputs:
              LOG_LEVEL: debug
            annotations:
              require-adobe-auth: false
              final: true
  hooks:
    pre-app-build: node scripts/prebuild.js
    post-app-deploy: node scripts/postdeploy.js
```

## Multi-extension app

```yaml
extensions:
  dx/excshell/1:
    $include: src/dx-excshell-1/ext.config.yaml
```

Extension `ext.config.yaml` typically defines:

```yaml
operations:
  view:
    - type: web
      impl: index.html
actions: ./actions
web: ./web-src
runtimeManifest:
  packages:
    ...
```

Use `aio app add extension` to add extension points; use `-e` on build/deploy/run to target one.

## Web assets and CDN

- Frontend lives under `web` / `web-src` path from config.
- `aio app build` bundles to `dist`; `aio app deploy` uploads via `@adobe/aio-lib-web` (deploy-service CDN API).
- `web` section can include `response-headers` rules (paths → `adp-*` metadata on upload).

Requires valid `.env` / auth from `aio app use` (`ow.auth_handler` for bearer token).

## Events

Register event actions with `aio app add event`. Deploy with `--force-events` to sync registrations to config (can delete stray registrations).

## Log forwarding

```bash
aio app config get log-forwarding
aio app config set log-forwarding
```

Deploy runs log-forwarding update by default (`--no-log-forwarding-update` to skip).

## Hooks (common)

| Hook | When |
|------|------|
| `pre-app-build` / `post-app-build` | Around `aio app build` |
| `pre-app-deploy` / `post-app-deploy` | Around deploy |
| `deploy-static` | Replace default web deploy if script returns truthy |
| `post-app-run` | After `aio app run` |

Hook commands run in-process via `runInProcess` (see `src/lib/app-helper.js`).

## Config validation

Most commands default to `--config-validation`. Disable with `--no-config-validation` only when debugging broken YAML.

## Related skills

- Deploy commands: `aio-app-deploy`
- Setup / `aio app use`: `aio-cli-setup`
