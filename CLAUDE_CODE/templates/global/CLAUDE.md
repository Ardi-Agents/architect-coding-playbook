# Global CLAUDE.md — Personal Identity Across All Projects

> **Location:** `~/.claude/CLAUDE.md`
> **Scope:** Every Claude Code session on this machine
> **Layer:** 1 of 3 (Global → Project → Implementation)

---

## About Me

- **Name:** [YOUR_NAME]
- **Location:** [CITY, STATE]
- **Role:** [YOUR_ROLE] at [COMPANY_OR_CONTEXT]
- **Background:** [2-3 SENTENCE SUMMARY — e.g., "Product management, AI/ML, enterprise SaaS"]
- **Interests:** [RELEVANT INTERESTS]

---

## Loaded Rules

These rule files are loaded for every Claude Code session. They live in `~/.claude/rules/`.

```
@rules/preferences.md          # Code style, formatting, communication tone
@rules/workflows.md            # Preferred ways of working (planning, review)
@rules/org-policies.md         # Org-wide tooling, security, autonomy limits
@rules/consistency-checks.md   # Cross-repo consistency check catalog
```

---

## Loaded Skills

Skills are loaded on-demand when their pattern matches the task. They live in `~/.claude/skills/`.

```
~/.claude/skills/
├── journal/SKILL.md           # Daily journal entries
├── todo/SKILL.md              # Task management across projects
└── explain-code/SKILL.md      # Code explanation utility
```

> See `~/.claude/skills/_README.md` for how to author new skills.

---

## Per-Project Memory

Claude Code maintains durable memory per project at `~/.claude/projects/<project>/memory/`:

```
~/.claude/projects/<project-name>/memory/
├── MEMORY.md                  # Auto-memory index (first 200 lines auto-loaded)
├── debugging.md               # Patterns Claude discovered during sessions
└── conventions.md             # Project-specific learnings
```

These accumulate across sessions and survive context resets.

---

## Source of Truth

The **Architect Coding Playbook** governs all coding work on this machine.
See [`@AGENTS.md`](https://github.com/farshadas/architect-coding-playbook/blob/main/AGENTS.md)
for the full P0–P4 priority matrix. The rules above supplement, not replace, AGENTS.md.

> Replace bracketed placeholders. Adjust sections to match your actual workflow.
