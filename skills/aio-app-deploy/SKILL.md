---
name: aio-app-deploy
description: >-
  Builds, deploys, runs, and undeploys Adobe App Builder apps using aio app build,
  deploy, run, and undeploy. Use when shipping actions or static web assets to
  Adobe I/O Runtime and CDN, or running local dev.
---

# App lifecycle: build, deploy, run (`aio app`)

## Standard workflow

```bash
# From app root (app.config.yaml present)
aio app build
aio app deploy
```

`deploy` runs **build** by default for changed actions/web assets. Force full rebuild:

```bash
aio app deploy --force-build
```

First deploy to a **new** project/workspace often fails (404/503). Retry:

```bash
aio app clean && aio app deploy --force-deploy
```

## Build

```bash
aio app build
aio app build --no-web-assets      # actions only
aio app build --no-actions         # web only
aio app build -a my-pkg/my-action  # single action
aio app build -e <extension>       # single extension point
aio app build --web-optimize       # minify web assets
```

`aio app clean` removes `dist/` artifacts; next build is full.

## Deploy

```bash
aio app deploy
aio app deploy --no-publish        # skip Exchange publish (extension apps)
aio app deploy --no-web-assets     # Runtime actions only
aio app deploy --no-actions        # CDN static files only
aio app deploy -a my-pkg/my-action # one action
aio app deploy -e <extension>      # one extension
aio app deploy --open              # open frontend URL after deploy
aio app deploy --force-deploy      # Production workspace published on Exchange
aio app deploy --force-publish     # replace published extension points
```

Deploy overwrites existing Runtime deployments for changed actions. Static web deploy clears namespace assets before upload (via `@adobe/aio-lib-web`).

## Local development

```bash
aio app run
aio app run --open
aio app run --no-actions           # frontend only
aio app run -e <extension>         # required if multiple extensions
```

There is **no** `aio app dev` command; use **`aio app run`**. Multi-extension apps error unless `-e` selects one extension.

Hooks in config (e.g. `post-app-run`) can run scripts during `run`.

## Undeploy

```bash
aio app undeploy
aio app undeploy --no-web-assets
aio app undeploy --no-actions
aio app undeploy --force-unpublish
```

## Pack / install (distribution)

```bash
aio app pack [path] -o dist/app.zip
aio app install <path-to-package>
```

## After deploy

```bash
aio app get-url              # action invoke URLs
aio app get-url --cdn
aio app logs
aio app logs -a my-pkg/my-action --tail
```

## Related skills

- Config / hooks: `aio-app-config`
- Failures: `aio-app-debug`
- CLI install: `aio-cli-setup`
