# Per-Project Memory

> **Location:** `~/.claude/projects/<project-name>/memory/`
> **Scope:** Durable, project-specific memory across Claude Code sessions

---

## What This Is

Claude Code maintains long-term memory per project outside the project repo. This memory:

- **Persists** across sessions and context resets
- **Auto-loads** the first ~200 lines of `MEMORY.md` at session start
- **Is private** to your machine (lives in `~/.claude/`, not the repo)
- **Accumulates** patterns, debugging notes, and conventions Claude discovers

## Directory Pattern

```
~/.claude/projects/
└── <project-name>/
    └── memory/
        ├── MEMORY.md              # Auto-loaded index — keep concise
        ├── debugging.md           # Patterns Claude discovered debugging this project
        ├── conventions.md         # Project-specific conventions Claude learned
        └── <topic>.md             # Optional: more granular memory files
```

## File Conventions

### `MEMORY.md`

The auto-loaded index. Keep tight — first 200 lines are loaded automatically.

```markdown
# Memory Index — <project-name>

## Active Context
- Currently working on: [feature/area]
- Last session: [YYYY-MM-DD] — [1-line summary]

## Critical Conventions
- [Highest-priority project rule that Claude must always remember]

## Pointers
- @debugging.md — Debugging patterns for this project
- @conventions.md — Project conventions
- @<topic>.md — Other domain memory
```

### `debugging.md`

```markdown
# Debugging Patterns — <project-name>

## <Symptom>
**Cause:** [root cause]
**Fix:** [resolution]
**Discovered:** [YYYY-MM-DD]
```

### `conventions.md`

```markdown
# Project Conventions — <project-name>

## <Convention Name>
- **Rule:** [specific rule]
- **Why:** [reasoning]
- **Discovered:** [YYYY-MM-DD] from user correction
```

## Discipline

When the user corrects Claude or shares a project-specific learning:

1. Identify which memory file applies (`MEMORY.md` index, `debugging.md`, `conventions.md`).
2. Append a concise entry with date and source (user correction, error encountered, etc.).
3. If the memory grows beyond ~500 lines for any single file, split by topic.

## Setup

The interactive `CLAUDE_CODE/SETUP.md` will create empty memory files for each project you list. Populate them organically as you work.

> Memory files are gitignored by convention — they belong to your machine, not the repo.
