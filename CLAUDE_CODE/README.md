# Claude Code Integration

This directory adapts the Architect Coding Playbook for **Claude Code**. It maps the AGENTS.md three-layer architecture to Claude Code's `CLAUDE.md` hierarchy — so the same methodology that governs your agent behavior in Windsurf or Cursor works natively in Claude Code.

---

## Install — One Paste

Open Claude Code **inside a clone of `architect-coding-playbook`** and paste:

```
Run the architect-coding-playbook Claude Code setup:
@CLAUDE_CODE/SETUP.md
```

> If you're running Claude Code from elsewhere, paste the absolute path: `@/path/to/architect-coding-playbook/CLAUDE_CODE/SETUP.md`. The `@` import is resolved relative to your current working directory.

Claude Code will:

1. Detect any existing `~/.claude/` or `.claude/` setup.
2. Ask a few onboarding questions (identity, projects, org policies, `[APP]__` prefix).
3. Generate global and per-project files from the templates below — every write traceable to a `manifestId` in [`install.manifest.json`](./install.manifest.json).
4. Backup before any modification to `~/.claude/.architect-playbook-backups/`.
5. Auto-copy `AGENTS/[APP]__*.md` into each project with the `[APP]__` prefix substituted.
6. Write an install receipt at `~/.architect-playbook-manifest.json` for clean uninstall + drift detection.
7. Never overwrite anything without showing a diff and getting confirmation.

After install, run `/verify-install` to drift-check.

### Alternative: install via plugin

If you only want the skills + subagents (and you'll author your `AGENTS.md` and `CLAUDE.md` by hand), install the Claude Code plugin variant — see [`claude-code-plugin/README.md`](../claude-code-plugin/README.md).

---

## How AGENTS.md Maps to Claude Code

The Architect Coding Playbook uses a three-layer model. Claude Code mirrors this structure:

| Architect Coding Layer | Claude Code Equivalent | Scope |
|---|---|---|
| `AGENTS.md` (kernel) + `~/.claude/CLAUDE.md` + `~/.claude/rules/` | Personal identity, preferences, org policies | All projects on this machine |
| `<project>/CLAUDE.md` + `<project>/.claude/` | Project-shared rules, skills, subagents | One project, shared with team |
| `AGENTS/[APP]__*.md` appendices | Loaded via `@` imports from project CLAUDE.md | Per-task domain methodology |

The kernel rules in `AGENTS.md` and `AGENTS/` stay as the **source of truth**. The Claude Code layer surfaces and operationalizes them in Claude Code's native format.

---

## Directory Structure

This directory installs into your filesystem in two layers:

### Layer 1 — Global (`~/.claude/`)

```
~/.claude/
├── CLAUDE.md                       # Personal identity (all projects)
├── rules/
│   ├── preferences.md              # Code style, formatting, tone
│   ├── workflows.md                # Preferred ways of working
│   ├── org-policies.md             # Org-wide tooling, security, autonomy limits
│   └── consistency-checks.md       # Brian's 10-check catalog
├── skills/
│   └── _README.md                  # How to author global skills (journal, todo, etc.)
└── projects/
    └── <project-name>/memory/
        ├── MEMORY.md               # Auto-loaded project memory index
        ├── debugging.md            # Patterns Claude discovered debugging
        └── conventions.md          # Project-specific learnings
```

### Layer 2 — Project (`<project>/.claude/`)

```
my-project/
├── CLAUDE.md                       # Main project instructions
└── .claude/
    ├── settings.json               # Permissions, tool access (committed)
    ├── settings.local.json         # Local overrides (gitignored)
    ├── rules/
    │   ├── code-style.md           # Coding standards for this stack
    │   ├── testing.md              # Testing conventions
    │   ├── api-design.md           # API patterns
    │   └── frontend/
    │       └── components.md       # Path-scoped: loads for frontend/ only
    ├── skills/
    │   ├── _README.md              # How to author project skills
    │   ├── deploy/SKILL.md         # /deploy slash-command (example)
    │   ├── review-pr/SKILL.md      # /review-pr slash-command (example)
    │   └── prd-writer/             # Multi-file skill with templates
    │       ├── SKILL.md
    │       ├── template.md
    │       └── examples/sample.md
    └── agents/
        ├── researcher.md           # Read-only codebase exploration subagent
        └── reviewer.md             # Code review specialist subagent
```

> The `settings.local.json` file is gitignored via the repo-level `.gitignore`.

---

## Templates Provided

This repo ships templates for both layers in `CLAUDE_CODE/templates/`:

### Global Templates (`templates/global/`)

| File | Purpose |
|---|---|
| `CLAUDE.md` | Personal identity entry point |
| `rules/preferences.md` | Communication & code style |
| `rules/workflows.md` | Plan mode, execution cadence, memory discipline |
| `rules/org-policies.md` | Open source policies, security, autonomy limits |
| `rules/consistency-checks.md` | 10-check catalog for cross-repo consistency |
| `skills/_README.md` | How to author global skills |
| `projects/_README.md` | Per-project memory pattern documentation |

### Project Templates (`templates/project/`)

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project identity, stack commands, AGENTS imports |
| `settings.json` | Tool permissions, rule paths, skills/agents directories |
| `rules/code-style.md` | Project-specific coding standards |
| `rules/testing.md` | Testing conventions and coverage targets |
| `rules/api-design.md` | API conventions (status codes, errors, pagination) |
| `skills/_README.md` | How to author project slash-commands |
| `agents/researcher.md` | Read-only codebase exploration subagent |
| `agents/reviewer.md` | Code review specialist subagent |

---

## Other Agents (CLI-Agnostic)

`AGENTS.md` + `AGENTS/[APP]__*.md` is the cross-tool kernel. Per-CLI bootstraps live in sibling directories with their own quickstarts:

- **Cursor:** [`CURSOR/README.md`](../CURSOR/README.md) — Cursor reads `AGENTS.md` natively; this shim covers `.cursor/rules/*.mdc` for path scoping.
- **Codex CLI:** [`CODEX/README.md`](../CODEX/README.md) — two `cp` commands; Codex reads `AGENTS.md` natively.
- **Windsurf / Cline / Aider / Copilot:** read `AGENTS.md` natively at the repo root. Copy `AGENTS.md` + `AGENTS/` and you're done.

The Claude-Code-specific files (`CLAUDE.md`, `.claude/settings.json`, etc.) only matter when running Claude Code. Other agents consume `AGENTS.md` and the `AGENTS/` appendices directly.

> **Important:** Claude Code does **not** read `AGENTS.md` natively — it reads `CLAUDE.md`. The setup flow generates a thin project `CLAUDE.md` whose first line is `@AGENTS.md`, bridging the gap. Alternatively, `ln -s AGENTS.md CLAUDE.md`.

---

## Tooling

- **`tooling/direnv-guide.md`** — Walkthrough for using `direnv` to manage per-project environment variables. Recommended when working across multiple projects with different stacks.

---

## Credits

- Three-layer structure inspired by Nirnay Patel's Claude Code organization (see `CONTRIBUTORS.md`).
- Consistency checks catalog by Brian Boyd (see `templates/global/rules/consistency-checks.md`).
- Architect Coding methodology by Farshad A. Samimi (see `CONCEPT.md`).
