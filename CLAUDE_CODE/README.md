# Claude Code Integration

This directory adapts the Architect Coding Playbook for Claude Code. It maps the AGENTS.md three-layer architecture to Claude Code's `CLAUDE.md` hierarchy — so the same methodology that governs your agent behavior in Windsurf or Cursor works natively in Claude Code.

---

## Install — one paste

Open Claude Code in any project directory and paste:

```
Run the architect-coding-playbook Claude Code setup:
@CLAUDE_CODE/SETUP.md
```

Claude will read your existing setup, ask a few questions, and generate your `CLAUDE.md` files from the templates in this directory. It will not overwrite anything without showing you a diff first.

---

## How AGENTS.md maps to Claude Code

| Architect Coding layer | Claude Code equivalent | Scope |
|---|---|---|
| `AGENTS.md` — global kernel | `~/.claude/CLAUDE.md` + `~/.claude/rules/` | All projects on this machine |
| `AGENTS/[APP]__PROJECT_SPECIFIC.md` | `<project>/.claude/CLAUDE.md` | One project, shared with team |
| `AGENTS/[APP]__IMPLEMENTATION.md` etc. | `<project>/.claude/rules/*.md` | Loaded per task type |

The global layer holds identity and org-level policies. The project layer holds stack commands, team context, and `@` imports pointing back to the AGENTS/ appendices. Nothing is duplicated — the appendices stay as the source of truth.

---

## Other agents

`AGENTS.md` is agent-agnostic. The same content applies:

- **Windsurf**: use `.windsurfrules` at the project root. Populate it the same way as the project `CLAUDE.md` template.
- **Cursor**: use `.cursor/rules/` for project-level rules. Point to `AGENTS/` appendices with `@` imports.
- **Codex CLI**: use `AGENTS.md` directly — it reads the file natively.

---

## What's in this directory

| File | Purpose |
|---|---|
| `SETUP.md` | Interactive setup prompt — paste into Claude Code to scaffold your `CLAUDE.md` files |
| `templates/global-CLAUDE.md` | Template for `~/.claude/CLAUDE.md` |
| `templates/project-CLAUDE.md` | Template for `<project>/.claude/CLAUDE.md` |
| `templates/rules/org-policies.md` | Example always-loaded org rule file |
| `tooling/direnv-guide.md` | Multi-project environment management with direnv |

---

## Golden rules

1. **Global `CLAUDE.md` under 200 lines.** Use `@imports` and `rules/` for anything longer — context beyond 200 lines gets unreliable adherence.
2. **Rules = always follow this. Skills = do this when I ask.** Terminology, coding policies, output format → rules. Writing a PRD, running a security audit → skills.
3. **Path-scope rules that only apply to certain files.** Add `paths:` frontmatter so spec-writing rules don't load during debugging.
4. **Project `CLAUDE.md` points to AGENTS/ appendices — don't duplicate them.** Keep `AGENTS.md` as the policy kernel and import the relevant appendices per project.
5. **`settings.local.json` for machine-local overrides.** Tool permissions that shouldn't be committed (e.g., allowed bash commands for your local dev scripts) go here, gitignored.
