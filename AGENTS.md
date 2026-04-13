# Global Rules for AI Coding Agents

> **Version**: 2.4 | **Last Updated**: 2026-01-22 | **Target**: <300 lines

---

## Quick Reference Card

### P0 - Security, Auth & Data Integrity (NEVER VIOLATE)

1. **Never modify auth** without explicit approval
2. **Verify schema consistency** across ORM, services, tests
3. **Never commit secrets** or API keys
4. **Never commit or deploy code** unless explicitly requested by user
5. **Never push to git or execute deployment scripts** - user manages all releases

### P1 - Correctness & Planning (MUST FOLLOW)

6. **Design before implementation** for complex features (see [P1: DESIGN-FIRST](#p1-design-first-protocol))
7. **Write tests** before/during implementation
8. **Run full test suite** after significant changes
9. **Fix bugs** before adding features
- **UTC timestamp contract**: Shared timestamps must be normalized to UTC with a trailing `Z`, and tests must assert that exact format.

### P2 - Scope & Stability (SHOULD FOLLOW)

10. **Only modify** what's necessary for current milestone
11. **Use working code** as reference, don't reinvent
12. **Touch minimal components**

### P3 - Architecture & Design (GOOD PRACTICE)

13. **Document technical debt** in roadmap
14. **Suggest rule improvements** after each task

### P4 - Simplicity & Optimization (PREFER)

15. **Prefer simple solutions** over complex ones
16. **Improve incrementally** rather than big-bang rewrites

---

## Rule Precedence (Conflict Resolution)

**Priority Order** (highest to lowest):

| Level  | Focus                           | Description                                                     |
| ------ | ------------------------------- | --------------------------------------------------------------- |
| **P0** | Security, Auth & Data Integrity | Never compromise. Stop and flag if requirement conflicts.       |
| **P1** | Correctness & Planning          | Test coverage mandatory. Bugs fixed before features.            |
| **P2** | Scope & Stability               | Only modify what's needed. Don't break unrelated functionality. |
| **P3** | Architecture & Design           | API-first, TDD. Can defer if documented as tech debt.           |
| **P4** | Simplicity & Optimization       | Prefer simple solutions. Can improve incrementally.             |

**Resolution**: If rules conflict, follow higher priority. Example: "add tests" (P1) > "touch minimal components" (P4).

---

## P1: DESIGN-FIRST Protocol

**Trigger Conditions**:

- User requests "architecture", "design", or "planning"
- Feature involves >5 files or multiple system layers
- Database schema changes, third-party integrations

**Required Artifacts** (before implementation):

| Document                    | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `ARCHITECTURE_OVERVIEW.md`  | System design, diagrams, data flows          | 
| `DATABASE_SCHEMA.md`        | Complete SQL schema with indexes, migrations |
| `API_SPECIFICATION.md`      | REST API contract with examples              |
| `IMPLEMENTATION_ROADMAP.md` | Week-by-week execution plan                  |

**Quality Standards**:

- Include runnable code snippets (not pseudocode)
- Explain *why* decisions were made
- Cross-reference documents
- Add ASCII/Mermaid diagrams

**Reflection Checklist**:

- [ ] Can a new engineer implement Phase 1 without questions?
- [ ] Are all error cases documented?
- [ ] Do database schema & API responses align?
- [ ] Is there a clear migration/rollback strategy?

---

## Core Principles

### Understanding Context

- **Read before writing**: Study codebase before non-trivial changes (>50 lines OR >2 files)
- **Code is truth**: When docs conflict with code, follow working code patterns

### Scope Discipline

- **Impact analysis**: Document why change is necessary for current milestone
- **If unrelated, don't touch it**: No "while I'm here" refactoring
- **Checkpoint tests**: Verify unrelated systems still work after changes

### Simplicity

- **Minimal footprint**: Touch fewest components possible
- **No over-engineering**: Use existing validation, don't build custom frameworks

### Decision Documentation

When uncertain:

1. Analyze options using rules framework
2. Choose approach aligned with P0 > P1 > P2... hierarchy
3. Document rationale in Decision Log
4. Proceed without pausing

**Flag for human input only when**:

- Security/auth implications (P0)
- Destructive operations (file deletion, data migration, bulk changes)
- Requirements contradict design docs
- > 30 minutes stuck despite trying alternatives
- Package version changes to locked dependencies
- Code changes require deployment script updates (must document what to update)

### Tool & File Discipline

- **Read-Verify-Write (P0)**: Never modify a file without reading it in the current or immediately preceding turn. Anti-pattern: User says "fix bug" → Agent rewrites based on memory (WRONG). Required: Read file → Analyze → Make targeted edits.
- **Read before modifying**: Always read existing files before proposing changes
- **No speculative creation**: Don't create files/folders without checking project conventions
- **Prefer targeted edits**: Use minimal edits over full file rewrites when possible
- **One logical change**: Don't bundle unrelated changes in single operation
- **Verify before delete**: Confirm file/code is unused before removal (grep, tests)
- **UI status parity**: When adding new UI status text, update accompanying CSS (if needed) and add/adjust a UI test covering the new state.
- **Docker access**: Agents may start/manage Docker Desktop (and required containers) whenever needed for local services/tests, avoiding destructive container actions outside task scope.
- **Cloud/GitHub CLI usage**: Agents may invoke CLI tools for GitHub and cloud providers (GCP/Azure/AWS) when required, provided secrets remain protected and documented deploy procedures are followed.
- **Error Loop Prevention (P2)**: If a command/test fails **twice** with the same error: (1) STOP execution, (2) Read documentation or source code, (3) Propose a radically different approach before trying again. Prevents "doom loops" that burn tokens.

### Large-Scale Refactoring

When renaming terminology across the codebase (e.g., `prompt` → `directive`):

1. **Update in order**: Models → Schemas → Repositories → Services → API → Tests
2. **Database migrations**: Create Alembic migration for table/column renames
3. **Enum handling**: PostgreSQL enums require text conversion (can't modify in-place)
4. **Test file updates**: Update imports and all assertions using old terminology
5. **Clean stale artifacts**: After renames or moves, remove caches or generated outputs that may retain old paths or names.
6. **Verify Cloud state**: Cloud data store may already have schema changes from prior deployments

---

## Project-Specific Rules

> **Location**: [AGENTS/[APP]__PROJECT_SPECIFIC.md](AGENTS/[APP]__PROJECT_SPECIFIC.md)

This section is intentionally minimal. All project-specific rules, conventions, and configurations are maintained in the project file above.

**When copying this framework to a new project:**

1. Copy `AGENTS.md` and `AGENTS/` folder
2. Replace the contents of `AGENTS/[APP]__PROJECT_SPECIFIC.md` with your project-specific details (including known tool false positives, suppressions, and exceptions).

**Common project-specific guidance:**

- Test scripts and commands
- Framework and architectural conventions
- Package and SDK version policies
- Database migration procedures
- Technology stack details
- Known tooling false positives, suppressions, and exceptions

---

## Appendix Index

> **Reading Guide**: Start with this AGENTS.md for all rules. Reference appendix files as needed for detailed procedures. Always read `[APP]__PROJECT_SPECIFIC.md` to understand current project conventions.

| Document                                                                     | Contents                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [AGENTS/[APP]__PROJECT_SPECIFIC.md](AGENTS/[APP]__PROJECT_SPECIFIC.md)       | **Project-specific rules** (replace content per project)          |
| [AGENTS/[APP]__IMPLEMENTATION.md](AGENTS/[APP]__IMPLEMENTATION.md)           | TDD, scope enforcement, error recovery                            |
| [AGENTS/[APP]__API_DESIGN.md](AGENTS/[APP]__API_DESIGN.md)                   | REST API design rules, HTTP status codes, error formats           |
| [AGENTS/[APP]__CHECKLISTS.md](AGENTS/[APP]__CHECKLISTS.md)                   | Pre-completion checklist, decision log template, tech debt format |
| [AGENTS/[APP]__STATIC_ANALYSIS.md](AGENTS/[APP]__STATIC_ANALYSIS.md)         | Linting, dead code, test coverage, doc & artifact integrity       |
| [AGENTS/[APP]__DEPENDENCY_UPGRADES.md](AGENTS/[APP]__DEPENDENCY_UPGRADES.md) | Phased upgrade methodology, conflict resolution, rollback         |
| [AGENTS/[APP]__TOOL_USAGE.md](AGENTS/[APP]__TOOL_USAGE.md)                   | File exploration, search patterns, command safety, git operations |

---

## Session Reporting

At the end of each prompt/task, report (all timestamps in the USER'S local time, currently **UTC-08:00**):

- **Start time**: When work began (use the user-request timestamp in local time)
- **End time**: When task completed (local time)
- **Duration**: Exact minutes = `(End - Start)` rounded to nearest minute (no manual overrides)
- **Tokens Used**: Total tokens consumed for the task (use best available estimate from API/tooling; if unavailable, label as `N/A` but explain why)

Format:

```
⏱️ Session Report
- Start: [HH:MM AM/PM] (UTC-08:00)
- End: [HH:MM AM/PM] (UTC-08:00)
- Duration: [X] minutes
- Tokens: [Y]
```

---

## Pre-Completion Checklist (Quick)

Before marking any task complete:

- [ ] Follows existing patterns and conventions
- [ ] All new/modified code has tests
- [ ] All tests pass (unit, integration, and end-to-end)
- [ ] Only modified necessary components
- [ ] Schema changes: ORM + migrations + services + tests updated
- [ ] Technical debt documented
- [ ] Followed rule precedence (P0 > P1 > P2 > P3 > P4)

> Full checklist: [AGENTS/[APP]__CHECKLISTS.md](AGENTS/[APP]__CHECKLISTS.md)

---

## Continuous Improvement

After completing each task:

1. **Review**: Identify gaps or missed opportunities in these rules
2. **Propose**: Generate concrete rule suggestions with section placement
3. **Format**: Present in ready-to-insert markdown

**Quality Standards**:

- Specific and actionable (not "be careful")
- Include concrete examples or commands
- Focus on preventive measures

---

## Context Preservation

For non-trivial tasks (>3 tool calls OR >10 message turns), maintain working state in:

```
agent_sessions_tmp/ACTIVE_PLAN.md
```

**Note**: `agent_sessions_tmp/` lives at the repo root and is gitignored. Session files are temporary and not committed.

**Trigger Conditions**:

- More than 3 sequential tool calls
- More than 10 message turns
- Complex multi-phase task
- Resuming a previously interrupted task

**Format**:

```markdown
# ACTIVE PLAN for [Task ID]
## Current Objective: [User request]
## Completed Steps
- [x] Step 1: [Description]
## Next Immediate Step
- [ ] **Current Focus**: [Clear, executable action]
## Blockers & Questions
- [Known issues or questions for user]
## Decision Log
- Decision #1: [What and why]
```

**Archival**: On task completion:

```bash
mkdir -p agent_sessions_tmp/archive
mv agent_sessions_tmp/ACTIVE_PLAN.md agent_sessions_tmp/archive/PLAN_<TaskID>_$(date +%Y%m%d).md
```

---

## Glossary

| Term                   | Definition                                             |
| ---------------------- | ------------------------------------------------------ |
| **Non-trivial change** | >50 lines OR >2 files OR core business logic           |
| **Working component**  | Component/service that currently functions correctly   |
| **P0-P4**              | Priority levels for conflict resolution (P0 highest)   |
| **Terminology rename** | Systematic replacement of domain terms across codebase |

---

*Total Lines: ~280 | For details, see Appendix documents*
