# Consistency Checks Catalog

> **Location:** `~/.claude/rules/consistency-checks.md`
> **Loaded:** Every session
> **Scope:** Cross-repo consistency checks applicable to any project
> **Source of truth:** [`@AGENTS/[APP]__STATIC_ANALYSIS.md`](../../../AGENTS/%5BAPP%5D__STATIC_ANALYSIS.md)

---

Reusable checks to apply after Claude Code does substantive work. Run iteratively —
each pass has limited depth, so re-running the same check peels the next layer.

## 1. Entry Point Integrity

Every CLI entry point (`pyproject.toml` scripts, `package.json` bin, etc.) resolves
to a valid module with the expected export. No orphaned entry points after deletions.

## 2. Cross-Repo Import Health

All files that import from sibling packages or repos resolve to existing modules
and named exports. No stale imports pointing at deleted or renamed symbols.

## 3. Stale Comments and References

Grep for names of deleted modules, functions, CLIs, and artifacts. Check for
outdated terminology, old stage/phase numbering, and renamed concepts.

## 4. Documentation Separation of Concerns

Each concept lives in one file. No content duplicated across documentation
files — reference the authoritative source instead.

## 5. Documentation Referential Integrity

Every file, function, or CLI mentioned in docs exists in the code. Every
module in the code appears in the correct documentation domain.

## 6. Test Coverage Gaps

Every source module has a corresponding test file. Test files don't import
deleted functions. New modules get tests.

## 7. Dead Code Detection

Zero-caller modules, functions, entry points, and artifacts. If nothing
imports or invokes it, delete it — dead code wastes context.

## 8. Runbook Accuracy

Walk through any runbook or pipeline docs mentally. Do the commands, file
paths, and sequencing match what the code actually does?

## 9. Plan File Staleness

Check for completed or obsolete plan files that should be cleaned up.

## 10. README Accuracy

Repo structure trees match actual files. Feature descriptions match
implemented (not aspirational) behavior. Unimplemented features marked as planned.

---

## How to Run

When the user requests "run consistency checks" or after substantive refactoring work:

1. Run all 10 checks in sequence.
2. Report findings grouped by check number.
3. Distinguish **blocking** (broken imports, dead entry points) from **advisory** (stale comments).
4. Do not auto-fix. Propose fixes; require confirmation before applying.

> Detailed per-check methodology lives in [`AGENTS/[APP]__STATIC_ANALYSIS.md`](../../../AGENTS/%5BAPP%5D__STATIC_ANALYSIS.md).
> Originally proposed by Brian Boyd (`@briansboyd`).
