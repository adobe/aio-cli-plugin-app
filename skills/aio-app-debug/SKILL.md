---
name: aio-app-debug
description: >-
  Debugs Adobe App Builder apps using aio app logs, info, get-url, and test.
  Use when deployments fail, actions return errors, web assets missing, or
  verifying Runtime/CDN URLs.
---

# Debug App Builder apps (`aio app`)

## Quick checks

```bash
aio console where          # correct org / project / workspace?
aio app info               # namespace, creds, manifest summary
aio app info --json
aio app get-url            # action web URLs after deploy
aio app get-url --cdn
```

## Logs

```bash
aio app logs
aio app logs --tail        # follow (alias: --watch, --poll)
aio app logs -a my-pkg/my-action
aio app logs -l 10         # last N activations (1–50)
aio app logs --strip       # one line per activation
```

Use `-v` on any command for verbose plugin output.

## Tests

```bash
aio app test               # unit tests (default)
aio app test --e2e
aio app test --all
aio app test -a my-action
aio app test -e <extension>
```

Extension `ext.config.yaml` may define a `test` hook script instead of default test runner.

## Common failures

| Symptom | Things to try |
|---------|----------------|
| First deploy 404/503 | `aio app clean && aio app deploy --force-deploy` |
| `aio app` unknown | Install plugin: `aio plugins:install @adobe/aio-cli-plugin-app` |
| Wrong namespace / creds | `aio console where` then `aio app use -g --overwrite` |
| Production deploy blocked | App published on Exchange; use `--force-deploy` or retract in Exchange |
| Web deploy auth error | Re-login; ensure `aio app use` refreshed `.env` |
| Empty UI after first deploy | `web-src/src/config.json` empty until deploy; use runtime URL fallback (see scaffold docs) |
| Multiple extensions on `run` | Pass `-e <extension-id>` |
| Nothing to deploy | Pass `--actions` and/or `--web-assets` (both default true) |

## Build vs deploy artifacts

```bash
aio app clean              # wipe dist/
aio app build --force-build
```

If actions look stale, deploy always overwrites changed actions; use `--force-build` to rebuild everything.

## Validate config only

```bash
aio app deploy --no-actions --no-web-assets   # not useful alone
# Prefer fixing YAML against schema; use normal command with validation on
```

## Related skills

- Deploy flags: `aio-app-deploy`
- Config structure: `aio-app-config`
- Setup: `aio-cli-setup`
