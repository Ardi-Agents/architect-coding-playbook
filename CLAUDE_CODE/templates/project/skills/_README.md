# Project Skills

> **Location:** `<project>/.claude/skills/<skill-name>/SKILL.md`
> **Scope:** This project only — invokable as slash-commands

---

## What Are Project Skills?

Project skills are reusable Claude Code capabilities scoped to one project. They are committed to the repo so the whole team has access. Each skill becomes available as a slash-command (e.g., `/deploy`, `/review-pr`, `/prd-writer`).

## Directory Pattern

```
<project-root>/.claude/skills/
├── deploy/
│   └── SKILL.md             # Required — the skill definition
├── review-pr/
│   └── SKILL.md
└── prd-writer/
    ├── SKILL.md             # Required
    ├── template.md          # Optional — reusable template
    └── examples/            # Optional — example outputs
        └── sample.md
```

## SKILL.md Structure

```markdown
# <Skill Name>

## Slash Command
/<skill-slug>

## When to Invoke
- User types `/<skill-slug>` explicitly
- Or when the user describes a task matching: [pattern]

## What It Does
[1–2 sentence description]

## Inputs
- [What the skill needs from the user or context]

## Outputs
- [What the skill produces — files written, commands run, etc.]

## Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Safety
- [Any guardrails — e.g., "Never push to main without confirmation"]
- [What requires explicit user confirmation]

## Examples
[Link to `examples/` directory or inline samples]
```

## Common Project Skills

- **`deploy/`** — Wrap deploy commands with checks (tests pass, lint clean, no uncommitted changes).
- **`review-pr/`** — Structured PR review against AGENTS.md rules.
- **`prd-writer/`** — Generate product requirement docs from a brief.
- **`migrate-db/`** — Generate and run database migrations safely.
- **`hotfix/`** — Branch off main, apply fix, prepare PR with rollback plan.

## Authoring Workflow

1. Identify a recurring task in this project.
2. Create `<project>/.claude/skills/<name>/SKILL.md`.
3. Test it: invoke as `/<name>` and refine.
4. Commit when stable. Team gets it on next pull.

## Promoting to Global

If a skill proves portable across projects, promote it:

```bash
cp -r .claude/skills/<name> ~/.claude/skills/
```

Then remove from this project (or keep both with project-specific overrides).

> Skills are a Claude Code feature. See Claude Code documentation for the canonical SKILL.md spec.
