---
name: aio-app-scaffold
description: >-
  Scaffolds Adobe App Builder apps with aio app init, create, and add (actions,
  web-assets, extensions, events). Use when creating a new I/O app, adding Runtime
  actions, or generating project structure from templates.
---

# Scaffold App Builder apps (`aio app`)

## Create a new app

```bash
# Interactive (templates, extensions, console login)
aio app init [path]

# Non-interactive standalone app (minimal prompts)
aio app init --standalone-app --yes --no-login --linter none

# From Developer Console export
aio app init --import ./workspace.json

# From GitHub quick-start (owner/repo/path)
aio app init --repo adobe/generator-aio-app
```

`aio app create [path]` is similar but uses default parameters (less prompting than `init`).

After scaffold, link credentials:

```bash
aio console where
aio app use -g --no-input --overwrite
```

## Add components to an existing app

```bash
aio app add action          # Runtime action under configured actions folder
aio app add web-assets      # web-src + frontend tooling
aio app add extension       # extension point (e.g. Experience Cloud shell)
aio app add event           # Adobe I/O Events action
aio app add ci              # CI workflow files
aio app add service         # subscribe workspace to services
```

Common flags: `-y` (defaults), `-e <extension>` (target extension), `--no-install` (skip npm).

## Delete components

```bash
aio app delete action [pkg/name]
aio app delete web-assets
aio app delete extension -e <extension-id>
```

## Project layout (typical)

| Path | Role |
|------|------|
| `app.config.yaml` | Root manifest: `application` and/or `extensions` |
| `actions/` or per-ext `actions/` | Runtime action source |
| `web-src/` | Frontend (if `web` / `web-assets` enabled) |
| `src/<extension>/ext.config.yaml` | Extension-specific manifest (`$include` from root) |
| `.env` | Runtime namespace, credentials (from `aio app use`) |
| `.aio` | Console metadata |
| `dist/` | Build output (actions zip, web bundles) |

Standalone apps use top-level `application:` in `app.config.yaml`. Multi-extension apps add `extensions:` with `$include` to per-extension configs.

## List what exists

```bash
aio app list
aio app list extension
```

## Related skills

- Setup: `aio-cli-setup`
- Config schema: `aio-app-config`
- Deploy after scaffold: `aio-app-deploy`
