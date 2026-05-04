# Architect Coding Playbook — Claude Code Plugin

This directory packages the playbook's Claude-Code-native surfaces (skills + subagents) as a Claude Code plugin. It is **additive** — the canonical install path is still `CLAUDE_CODE/SETUP.md`, which sets up `AGENTS.md`, project-level `CLAUDE.md`, rules, and memory. The plugin only ships the things Claude Code can install natively as a unit.

---

## What this plugin ships

```
claude-code-plugin/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── skills/
│   ├── journal/SKILL.md         # /journal — dated personal journal entries
│   ├── todo/SKILL.md            # /todo — personal cross-project todos
│   ├── explain-code/SKILL.md    # /explain-code — layered code explanations
│   └── verify-install/SKILL.md  # /verify-install — drift-check the install
└── agents/
    ├── researcher.md            # Read-only codebase exploration
    └── reviewer.md              # Code review specialist
```

What the plugin does **not** ship (these come from `CLAUDE_CODE/SETUP.md` instead):

- `AGENTS.md` and the `AGENTS/[APP]__*.md` appendices — methodology source of truth, copied per-project.
- Project-level `CLAUDE.md`, rules, settings.json — generated interactively per project.
- Per-project memory directories under `~/.claude/projects/<encoded-cwd>/memory/`.
- Global rules under `~/.claude/rules/` — installed by SETUP.md interactively.

---

## Install

### Option A: from this repo as a local marketplace

```
# In Claude Code, from any directory:
/plugin marketplace add /path/to/architect-coding-playbook
/plugin install architect-coding-playbook@architect-coding-playbook
```

### Option B: from a published GitHub marketplace

If/when this repo is registered as an Anthropic-discoverable marketplace:

```
/plugin marketplace add farshadas/architect-coding-playbook
/plugin install architect-coding-playbook@farshadas/architect-coding-playbook
```

---

## Relationship to `CLAUDE_CODE/SETUP.md`

| Surface | Where it comes from |
|---|---|
| Global skills (`/journal`, `/todo`, `/explain-code`, `/verify-install`) | This plugin |
| Project subagents (`researcher`, `reviewer`) | This plugin (or SETUP.md interactive install per project) |
| `AGENTS.md` + appendices | `cp` from repo root via `CLAUDE_CODE/SETUP.md` |
| Project `CLAUDE.md` + rules | Interactive `CLAUDE_CODE/SETUP.md` |
| Per-project memory dirs | Interactive `CLAUDE_CODE/SETUP.md` |
| `~/.claude/CLAUDE.md` user identity | Interactive `CLAUDE_CODE/SETUP.md` |

The plugin path is fastest if you only want the skills/subagents and you'll author your `AGENTS.md` and `CLAUDE.md` by hand. The interactive SETUP.md path is the full self-install, including methodology files.

---

## Limitations of plugin-shipped subagents

Per Anthropic's docs, plugin subagents do **not** support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields (security restriction). The `researcher.md` and `reviewer.md` shipped here use only the supported subset (`name`, `description`, `tools`, `model`).

---

## Update / uninstall

```
/plugin update architect-coding-playbook
/plugin uninstall architect-coding-playbook
```

Plugin uninstall removes the plugin's skills and subagents but leaves project files (`AGENTS.md`, project `CLAUDE.md`, etc.) intact — those are managed by the SETUP.md flow and the install receipt at `~/.architect-playbook-manifest.json` (HOME root, not inside `~/.claude/`).

→ Plugin docs: https://code.claude.com/docs/en/plugins
