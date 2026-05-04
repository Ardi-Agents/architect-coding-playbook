# Per-Project Memory

> **Location:** `~/.claude/projects/<encoded-path>/memory/`
> **Scope:** Durable, project-specific memory that Claude Code's auto-memory feature reads on session start.

---

## What This Is

Claude Code maintains long-term memory per project at `~/.claude/projects/<encoded-path>/memory/`. This memory:

- **Persists** across sessions and context resets.
- **Auto-loads** the first 200 lines (or 25 KB, whichever comes first) of `MEMORY.md` at session start.
- **Is private** to your machine (lives in `~/.claude/`, not the repo).
- **Accumulates** patterns, debugging notes, and conventions Claude discovers.

---

## The encoded path

`<encoded-path>` is the **absolute project path with every non-alphanumeric character replaced by `-`**. This is the same scheme Claude Code uses internally for transcript storage, so memory you write here is discovered by Claude Code's auto-memory system.

| Project absolute path | Encoded directory |
|---|---|
| `/Users/you/CascadeProjects/ardi-paralegal` | `-Users-you-CascadeProjects-ardi-paralegal` |
| `/Users/you/Desktop/dev/myapp` | `-Users-you-Desktop-dev-myapp` |
| `/home/you/repos/api` | `-home-you-repos-api` |

> **Why encoded paths instead of friendly names?** Claude Code's auto-memory implementation walks `~/.claude/projects/<encoded-cwd>/memory/MEMORY.md` based on your current working directory. Friendly names (e.g. `ardi-paralegal/`) wouldn't be discovered. The encoded scheme also avoids collisions when two projects share a name on different paths.

### Find your project's encoded path

```bash
# From inside the project root:
echo "/$(pwd)" | sed 's|[^A-Za-z0-9]|-|g' | sed 's|^-||' | sed 's|^|-|'
# Or simply: list ~/.claude/projects/ after running Claude Code in the project once.
ls -1 ~/.claude/projects/ | grep "$(basename "$(pwd)")"
```

---

## Directory pattern

```
~/.claude/projects/
└── <encoded-path>/
    └── memory/
        ├── MEMORY.md              # Auto-loaded index — keep concise
        ├── debugging.md           # Patterns Claude discovered debugging this project
        ├── conventions.md         # Project-specific conventions Claude learned
        └── <topic>.md             # Optional: more granular memory files
```

> **Reserved tree.** `~/.claude/projects/<encoded-path>/` also stores Claude Code's session JSONL transcripts. **Do not write outside the `memory/` subdirectory.** The installer only ever creates and writes to `memory/`.

---

## File conventions

### `MEMORY.md`

The auto-loaded index. Keep tight — first 200 lines / 25 KB are loaded automatically.

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

---

## Discipline

When the user corrects Claude or shares a project-specific learning:

1. Identify which memory file applies (`MEMORY.md` index, `debugging.md`, `conventions.md`).
2. Append a concise entry with date and source (user correction, error encountered, etc.).
3. If the memory grows beyond ~500 lines for any single file, split by topic.

---

## Setup

The interactive `CLAUDE_CODE/SETUP.md` will:

1. Ask for each project's absolute path.
2. Compute the encoded directory.
3. Create `~/.claude/projects/<encoded-path>/memory/{MEMORY.md,debugging.md,conventions.md}` if absent.
4. Record the writes in the install manifest receipt.

> Memory files are personal — they live in `~/.claude/`, not in the project repo.
