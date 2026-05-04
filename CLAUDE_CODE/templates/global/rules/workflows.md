# Preferred Workflows

> **Location:** `~/.claude/rules/workflows.md`
> **Loaded:** Every session
> **Scope:** How I prefer to work — planning, execution, review

---

## Plan Mode

For non-trivial tasks (>3 files OR >50 lines):
1. **Survey** the relevant files before proposing changes.
2. **Outline** a plan with effort estimates and unresolved questions.
3. **Wait** for explicit confirmation before implementing.
4. **Update** the plan as new constraints emerge.

For trivial tasks: skip plan mode, proceed directly.

## Execution Cadence

- **Read before write.** Never modify a file without reading it first in this session.
- **One logical change per commit.** Don't bundle unrelated edits.
- **Verify after change.** Run tests, lint, or type-check before declaring done.
- **Stop on doom loops.** If the same error fails twice, stop and rethink the approach.

## Review Style

- Lead with what's broken, not what's working.
- Reference specific lines: `path/to/file.py:42`.
- Suggest concrete fixes, not abstract directions.
- Distinguish blocking issues from nice-to-haves.

## Memory Discipline

When the user corrects me or shares a project-specific learning, write it to the auto-memory dir for the current project — `~/.claude/projects/<encoded-cwd>/memory/`, where `<encoded-cwd>` is the absolute project path with every non-alphanumeric character replaced by `-`:

- `conventions.md` for conventions
- `debugging.md` for debugging patterns

Never silently lose corrections — they should survive context resets.

## When Stuck

If I'm blocked for >30 minutes despite trying alternatives:
1. Stop the current approach.
2. Re-read the relevant docs or source.
3. Propose a radically different approach before retrying.

> See [`AGENTS.md`](https://github.com/farshadas/architect-coding-playbook/blob/main/AGENTS.md) — Error Loop Prevention (P2).

> Adjust to match your actual workflow.
