# Global Skills

> **Location:** `~/.claude/skills/<skill-name>/SKILL.md`
> **Scope:** Available across all projects on this machine

---

## What Are Skills?

Skills are reusable Claude Code capabilities, invoked when their pattern matches the user's request. Each skill lives in its own directory with a `SKILL.md` describing it.

## Directory Pattern

```
~/.claude/skills/
├── journal/
│   └── SKILL.md
├── todo/
│   └── SKILL.md
├── explain-code/
│   └── SKILL.md
└── <your-skill>/
    ├── SKILL.md           # Required — the skill definition
    ├── template.md        # Optional — reusable template
    └── examples/          # Optional — example outputs
        └── sample.md
```

## SKILL.md Structure

Each `SKILL.md` should declare:

```markdown
# <Skill Name>

## When to Invoke
- Triggered when user asks: [pattern]
- Or when context contains: [signal]

## What It Does
[1–2 sentence description]

## Inputs
- [What the skill needs from the user or context]

## Outputs
- [What the skill produces]

## Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Examples
[Optional examples or links to `examples/` directory]
```

## Suggested Global Skills

Common patterns from real Claude Code usage:

- **`journal/`** — Daily journal entries (Thariq's pattern)
- **`todo/`** — Task management across projects
- **`explain-code/`** — Code explanation utility
- **`commit-message/`** — Conventional commit message generation
- **`session-summary/`** — End-of-session summary into project memory

## Authoring Workflow

1. Identify a recurring task you do across projects.
2. Create `~/.claude/skills/<name>/SKILL.md`.
3. Iterate the skill over a few sessions; refine wording.
4. Move project-specific variants to `<project>/.claude/skills/`.

> Skills can be promoted from project-level to global when the pattern proves portable.
