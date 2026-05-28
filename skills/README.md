# Agent skills for Adobe I/O CLI (`aio app`)

These skills teach coding agents how to work with **App Builder** projects using the [`@adobe/aio-cli-plugin-app`](https://github.com/adobe/aio-cli-plugin-app) oclif plugin (`aio app` commands).

## Install

From any project (or globally):

```bash
# All skills, all supported agents (Cursor, Claude Code, Codex, etc.)
npx skills add adobe/aio-cli-plugin-app

# Cursor only, global user directory
npx skills add adobe/aio-cli-plugin-app -a cursor -g

# One skill
npx skills add adobe/aio-cli-plugin-app -s aio-app-deploy

# List skills without installing
npx skills add adobe/aio-cli-plugin-app --list
```

Install locations depend on the agent (for example Cursor: `.cursor/skills/` or `~/.cursor/skills/` with `-g`). See [skills.sh](https://skills.sh) and [Agent Skills](https://agentskills.io/) for details.

## Skills in this repo

| Skill | Use when |
|-------|----------|
| [aio-cli-setup](aio-cli-setup/SKILL.md) | Installing CLI/plugin, login, linking Developer Console workspace |
| [aio-app-scaffold](aio-app-scaffold/SKILL.md) | `aio app init`, `create`, `add`, project layout |
| [aio-app-deploy](aio-app-deploy/SKILL.md) | `build`, `deploy`, `run`, `undeploy`, deploy flags |
| [aio-app-config](aio-app-config/SKILL.md) | `app.config.yaml`, extensions, actions, web assets, hooks |
| [aio-app-debug](aio-app-debug/SKILL.md) | `logs`, `info`, `get-url`, `test`, common failures |

## Prerequisites

- Node.js **>= 20.5** (matches plugin `engines`)
- Adobe I/O CLI: `npm install -g @adobe/aio-cli`
- Plugin: `aio plugins:install @adobe/aio-cli-plugin-app` (or `aio discover -i`)
