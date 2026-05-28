---
name: aio-cli-setup
description: >-
  Installs and configures Adobe I/O CLI and the aio-cli-plugin-app plugin for App
  Builder. Use when setting up aio, logging in, linking Developer Console org/project/workspace,
  or running aio app use / aio console commands.
---

# Adobe I/O CLI setup (`aio app`)

## Install CLI and plugin

```bash
npm install -g @adobe/aio-cli
aio plugins:install @adobe/aio-cli-plugin-app
# or discover all Adobe plugins:
aio discover -i
aio app --help
```

The `aio app` topic comes from **@adobe/aio-cli-plugin-app** (oclif). Without the plugin, `aio app` is unavailable.

## Login and console context

```bash
aio login
aio console org list
aio console project list
aio console project select <projectNameOrId>
aio console workspace select Stage    # or Production
aio console where                     # verify org / project / workspace
```

Always run `aio console where` before linking an app. Wrong global selection causes `aio app use` to wire the wrong workspace silently.

## Link app to Developer Console

From the app root (contains `app.config.yaml`):

```bash
# Use globally selected org/project/workspace → writes .env and .aio
aio app use -g --no-input --overwrite

# Or import a downloaded workspace JSON from developer.adobe.com/console
aio app use ./path/to/workspace.json --overwrite

# Merge instead of overwrite
aio app use -g --merge
```

Flags worth knowing:

| Flag | Purpose |
|------|---------|
| `-g, --global` | Use global console selection (no local file path) |
| `-w, --workspace` | Pick workspace by name or id |
| `--overwrite` / `--merge` | How to combine with existing `.env` / `.aio` |
| `--no-service-sync` | Do not copy service subscriptions to new workspace |
| `--use-jwt` | Prefer JWT creds when both JWT and OAuth S2S exist |

## Inspect configuration

```bash
aio app info
aio app info --json
aio app info --mask          # hide secrets in output
```

## Related skills

- Scaffold: `aio-app-scaffold`
- Deploy: `aio-app-deploy`
- Config files: `aio-app-config`
