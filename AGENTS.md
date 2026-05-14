# Global Rules for AI Coding Agents

> **Version**: 3.0 | **Last Updated**: 2026-05-08 | **Target**: clarity over line count

---

## Quick Reference Card

### P0 - Security, Auth & Data Integrity (NEVER VIOLATE)

1. **Never modify auth** without explicit approval (applies when auth is present)
2. **Verify schema consistency** across ORM, services, tests
3. **Never commit secrets** or API keys
4. **Never commit or deploy code** unless explicitly requested by user
5. **Never push to git or execute deployment scripts** - user manages all releases

### P1 - Correctness & Planning (MUST FOLLOW)

6. **Design before implementation** for complex features (see [P1: DESIGN-FIRST](#p1-design-first-protocol))
7. **Write tests** before/during implementation
8. **Run full test suite** after significant changes
9. **Fix bugs** before adding features
10. **Build clean** — zero warnings, zero errors, on the default configuration. Track-specific operationalization in `[APP]__STATIC_ANALYSIS.md`.
11. **Acceptance tests over touch-points** — every unit-of-work plan declares a specific assertion that proves the work landed, not just a file list.
12. **UTC timestamp contract** — shared timestamps normalized to UTC with trailing `Z`; tests assert that exact format.

### P2 - Scope & Stability (SHOULD FOLLOW)

13. **Only modify** what's necessary for current milestone
14. **Use working code** as reference, don't reinvent
15. **Touch minimal components**
16. **No silent deferral** — never mark work as "future work" / "out of scope" without explicit user authorization

### P3 - Architecture & Design (GOOD PRACTICE)

17. **Document technical debt** in roadmap
18. **Suggest rule improvements** after each task

### P4 - Simplicity & Optimization (PREFER)

19. **Prefer simple solutions** over complex ones
20. **Improve incrementally** rather than big-bang rewrites

---

## Rule Precedence (Conflict Resolution)

| Level  | Focus                           | Description                                                     |
| ------ | ------------------------------- | --------------------------------------------------------------- |
| **P0** | Security, Auth & Data Integrity | Never compromise. Stop and flag if requirement conflicts.       |
| **P1** | Correctness & Planning          | Test coverage mandatory. Bugs fixed before features.            |
| **P2** | Scope & Stability               | Only modify what's needed. Don't break unrelated functionality. |
| **P3** | Architecture & Design           | API-first, TDD. Can defer if documented as tech debt.           |
| **P4** | Simplicity & Optimization       | Prefer simple solutions. Can improve incrementally.             |

**Resolution**: If rules conflict, follow higher priority. Example: "add tests" (P1) > "touch minimal components" (P2).

---

## Stack Composition & Track Discipline

This playbook supports projects with one or more language tracks. The set of tracks active in a repo is its **Stack Composition**, declared at the top of `[APP]__PROJECT_SPECIFIC.md`. A repo can be single-track (e.g., pure .NET) or multi-track (e.g., .NET service + Python ML pipeline + TypeScript frontend).

### Active Tracks

The playbook recognizes these tracks. Each is first-class with its own tooling, test runner, packaging conventions, and idioms:

- **dotnet** — C#, F#, VB.NET on .NET 8+ / .NET 10
- **python** — Python 3.10+
- **typescript** — TypeScript / JavaScript on Node.js / browsers
- **go** — Go 1.21+
- **rust** — Rust 1.75+

### How tracks fire

The agent applies whichever track matches the file being edited (`.cs` → dotnet; `.py` → python; `.ts` / `.tsx` / `.js` → typescript; `.go` → go; `.rs` → rust). The Stack Composition table tells the agent which tracks can legitimately fire in this repo and (optionally) which subtree each track owns.

### Track Discipline (agent-native rule)

When reading this playbook:

1. **Concept → kernel.** If a *concept* applies regardless of language ("write tests"; "fix bugs before features"; "build clean"; "wrap errors with context"), it lives in the kernel (this file or a non-track section of an appendix). No track subsection.
2. **Command or syntax → track.** If the *commands* differ across languages (`pytest --cov` vs `dotnet test --collect:"XPlat Code Coverage"` vs `vitest --coverage`), the guidance lives under a `### Track: <name>` subsection within the relevant appendix.
3. **Stack-specific terms must not appear in kernel sections.** When editing a kernel file (this `AGENTS.md`, or non-track sections of any `[APP]__*.md`), the following terms are red flags that a track-divergent claim leaked: `pytest`, `dotnet`, `cargo`, `go test`, `vitest`, `jest`, `npm`, `pyproject.toml`, `csproj`, `tsconfig`, `Cargo.toml`, `go.mod`, `ConfigureAwait`, `IAsyncEnumerable`, `asyncio`, `ProblemDetails`. If any appear in a kernel section, move them to a track subsection.

### Cross-track concepts (live in this kernel; appendices carry per-track recipes)

- **Build-clean posture** — zero warnings, zero errors. Operationalization in `[APP]__STATIC_ANALYSIS.md` per track.
- **Authoritative-workspace rule** — build/test from the workspace root (track-specific workspace file declared in `[APP]__PROJECT_SPECIFIC.md`), never a single project.
- **Pre-/post-edit lifecycle ritual** — orient against the track's structural tool before the first Edit; after the editing session, run build + tests + structural delta + write happy-path AND adversarial tests. Per-track structural tools in `[APP]__TOOL_USAGE.md`.
- **Error-handling philosophy** — never swallow errors silently; wrap with context at boundaries; fail loudly. Per-track recipes in `[APP]__OBSERVABILITY.md`.
- **Async/concurrency discipline** — propagate cancellation; bound goroutine/task lifetimes; document thread-safety. Per-track recipes in `[APP]__OBSERVABILITY.md`.
- **Structured logging** — key-value pairs, not interpolated strings. Per-track recipes in `[APP]__OBSERVABILITY.md`.
- **Authentication** (if present) — modify only with explicit approval. Per-track patterns in `[APP]__API_DESIGN.md` § Authentication.

---

## P1: DESIGN-FIRST Protocol

**Trigger Conditions**:

- User requests "architecture", "design", or "planning"
- Feature involves >5 files or multiple system layers
- Database schema changes, third-party integrations
- Adding a new track to the Stack Composition

**Required Artifacts** (before implementation):

| Document                    | Purpose                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `ARCHITECTURE_OVERVIEW.md`  | System design, diagrams, data flows                              |
| `DATABASE_SCHEMA.md`        | Complete SQL schema with indexes, migrations                     |
| `API_SPECIFICATION.md`      | REST API contract with examples                                  |
| `IMPLEMENTATION_ROADMAP.md` | Week-by-week execution plan **with acceptance criteria per unit**|

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
- [ ] Does each unit of work declare its acceptance test, not just the files it touches?

---

## Agent-Native Working Rules

These rules optimize the playbook for how AI coding agents actually function. They auto-load every session via this kernel and apply across every track.

### Evidence-Tier Discipline

Internally grade every non-trivial assertion before stating it:

- **VERIFIED** — observed the behavior (built, ran, diffed, reproduced)
- **READ** — cite a specific `file:line` but haven't executed
- **INFERRED** — reasoned from context
- **GUESSED / HEDGED** — no concrete evidence; soft language in lieu of proof

Any claim below VERIFIED gets **promoted** via investigation OR **explicitly marked** as unverified with the action that would settle it. Hedging language never substitutes for actual investigation.

### No Prose Without Verification

Comments, doc-strings, commit messages, README claims, design rationale — all are **claims that get verified before commit**:

- **Symbol references** (`MyClass.SomeMethod`) → grep before commit. If it doesn't appear in source, the reference is a hallucination.
- **Performance claims** ("sub-second", "scales to N") → measure. Record wall-clock against actual data.
- **Behavioral claims** ("framework X does Y") → run a small probe. The probe takes 30 seconds; the false claim takes a future review round to catch.
- **Schema/type claims** → read the actual definition; don't recall from working memory.

If a claim isn't verifiable in 30 seconds, write "expected" / "untested" / "estimated" rather than asserting fact.

### Deferral Hygiene

Never mark work as **"future work" / "out of scope" / "deferred" / "filed for later"** without explicit user authorization. Default is "fix it now"; deferral is a checkpoint, not a default.

When uncertain whether something is in scope: **ask** rather than silently defer. The question is "Can I fix this now? Want me to?" — pre-asking is cheap; silently deferring is expensive.

### Adversarial-Review Checkpoint (claim-heavy outputs)

Before publishing any claim-heavy output — state-of-project report, test suite, coverage audit, architectural assessment, design document — attempt to disprove the claims rather than confirm them.

- Run the build before claiming it builds.
- Run the tests before claiming they pass.
- Diff the files before claiming what changed.
- If a reviewer subagent is available, invoke it.
- If no reviewer available, self-review with the explicit goal of finding holes.

A claim that survives adversarial attack is *earned*. A claim that hasn't been attacked is *assumed*.

### Tool Priority (Structural Tools First)

For structural questions ("who calls X?", "what implements Y?", "blast radius of Z?", "which tests cover W?"), use the language-specific structural tool first; **grep is the fallback, not the default**.

Per-track structural tools live in `[APP]__TOOL_USAGE.md`. Grep sees text; structural tools see semantics.

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
3. Document rationale in Decision Log (template in `[APP]__CHECKLISTS.md`)
4. Proceed without pausing

**Flag for human input only when**:

- Security/auth implications (P0)
- Destructive operations (file deletion, data migration, bulk changes)
- Requirements contradict design docs
- > 30 minutes stuck despite trying alternatives
- Package version changes to locked dependencies
- Code changes require deployment script updates (must document what to update)
- A potential deferral surfaces (per Deferral Hygiene above)

### Tool & File Discipline

- **Read-Verify-Write (P0)**: Never modify a file without reading it in the current or immediately preceding turn. Anti-pattern: User says "fix bug" → Agent rewrites based on memory (WRONG). Required: Read file → Analyze → Make targeted edits.
- **Read before modifying**: Always read existing files before proposing changes
- **No speculative creation**: Don't create files/folders without checking project conventions
- **Prefer targeted edits**: Use minimal edits over full file rewrites when possible
- **One logical change**: Don't bundle unrelated changes in single operation
- **Verify before delete**: Confirm file/code is unused before removal (structural tool, then grep, then tests)
- **Authoritative-workspace rule**: Build and test from the workspace root, never a single project. Track-specific entry point in `[APP]__PROJECT_SPECIFIC.md`.
- **UI status parity**: When adding new UI status text, update accompanying CSS (if needed) and add/adjust a UI test covering the new state.
- **Docker access**: Agents may start/manage Docker Desktop (and required containers) whenever needed for local services/tests, avoiding destructive container actions outside task scope.
- **Cloud/GitHub CLI usage**: Agents may invoke CLI tools for GitHub and cloud providers (GCP/Azure/AWS) when required, provided secrets remain protected and documented deploy procedures are followed.
- **Verify active branch before commit**: The working tree may be shared across sessions. Run `git status` before any `git commit` — if HEAD is not on the expected branch, halt and ask.
- **Error Loop Prevention (P2)**: If a command/test fails **twice** with the same error: (1) STOP execution, (2) Read documentation or source code, (3) Propose a radically different approach before trying again. Prevents "doom loops" that burn tokens.

### Process Hygiene

- **One purpose per shell call** — don't chain `cmd1; cmd2 | head` for unrelated operations.
- **Narrate before long-running calls** — "starting full build" before a multi-minute command — so the user can distinguish "working" from "hung".
- **Prefer background mode** for long builds/tests when parallel work is available.

### Large-Scale Refactoring

When renaming terminology across the codebase:

1. **Update in order**: Models → Schemas → Repositories → Services → API → Tests
2. **Database migrations**: Track-specific migration tool (see `[APP]__IMPLEMENTATION.md` § Database Updates)
3. **Test file updates**: Update imports and all assertions using old terminology
4. **Clean stale artifacts**: After renames or moves, remove caches or generated outputs that may retain old paths or names.
5. **Verify Cloud state**: Cloud data store may already have schema changes from prior deployments

---

## Documentation Discipline

### Domain Ownership Map

Each appendix declares its scope in an `> **Owns**:` header at the top. The Appendix Index below is the **single source of truth** for which file owns which topic — a concept appears in exactly one row.

When a new appendix is added, add a row to the Appendix Index in the same change, and give the new file a matching `> **Owns**:` header.

### Trigger-Phrase Headers

Each appendix declares the user-prompt phrases that should cause it to load:

```markdown
> **Owns**: <scope>.
> **Fires when**: <trigger phrases — "fix the API", "add an endpoint", "write a migration", etc.>
```

This is how the agent knows when to load each appendix without scanning all of them.

### File-Length Guideline (advisory)

Aim for contributor-facing markdown files under **300 lines** to keep agent context efficient and per-document scope focused. **The cap is advisory — clarity wins when it conflicts.** When a file would need to lose meaningful content to fit the cap, leave it long; if surprised, ASK whether the rule should bend rather than compressing.

**In scope for the guideline**: per-feature SOPs, kernel `AGENTS.md`, project `CLAUDE.md` prose.

**Exempt entirely** (audience is humans evaluating or onboarding; quality over brevity): `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, any top-level user-facing doc.

---

## Project-Specific Rules

> **Location**: [AGENTS/[APP]__PROJECT_SPECIFIC.md](AGENTS/[APP]__PROJECT_SPECIFIC.md)

This kernel is intentionally minimal. All project-specific rules, conventions, Stack Composition declaration, and tool false positives are maintained in the project file above.

**When copying this framework to a new project:**

1. Copy `AGENTS.md` and `AGENTS/` folder
2. Replace the contents of `AGENTS/[APP]__PROJECT_SPECIFIC.md` with your project-specific details — including the **Stack Composition** declaration at the top.

---

## Appendix Index

> **Reading Guide**: Start with this `AGENTS.md` for cross-track rules. Reference appendix files as needed for detailed procedures and per-track recipes. Always read `[APP]__PROJECT_SPECIFIC.md` first to understand the current project's Stack Composition and conventions.

| Document                                                                     | Owns                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [AGENTS/[APP]__PROJECT_SPECIFIC.md](AGENTS/[APP]__PROJECT_SPECIFIC.md)       | **Stack Composition**, project-specific rules, environment, false positives           |
| [AGENTS/[APP]__IMPLEMENTATION.md](AGENTS/[APP]__IMPLEMENTATION.md)           | TDD, scope enforcement, error recovery, lifecycle ritual, database updates per track  |
| [AGENTS/[APP]__API_DESIGN.md](AGENTS/[APP]__API_DESIGN.md)                   | REST API design, HTTP status codes, error formats per track, optional auth per track  |
| [AGENTS/[APP]__CHECKLISTS.md](AGENTS/[APP]__CHECKLISTS.md)                   | Pre-completion checklist, claim-heavy output checklist, decision/blocker templates    |
| [AGENTS/[APP]__STATIC_ANALYSIS.md](AGENTS/[APP]__STATIC_ANALYSIS.md)         | Linting, dead code, coverage, doc & artifact integrity, build-clean per track         |
| [AGENTS/[APP]__DEPENDENCY_UPGRADES.md](AGENTS/[APP]__DEPENDENCY_UPGRADES.md) | Phased upgrade methodology, conflict resolution, license compatibility, rollback      |
| [AGENTS/[APP]__TOOL_USAGE.md](AGENTS/[APP]__TOOL_USAGE.md)                   | File exploration, structural-tool priority per track, command safety, git operations  |
| [AGENTS/[APP]__DESIGN_POSTURE.md](AGENTS/[APP]__DESIGN_POSTURE.md)           | Locked architectural decisions with explicit backout triggers                         |
| [AGENTS/[APP]__VERSIONING.md](AGENTS/[APP]__VERSIONING.md)                   | Versioning policy, host-runtime pin pattern, package-version source of truth          |
| [AGENTS/[APP]__OBSERVABILITY.md](AGENTS/[APP]__OBSERVABILITY.md)             | Production diagnostics, structured logging, error-handling, async/concurrency rules   |

---

## Session Reporting

At the end of each prompt/task, report (all timestamps in the user's local time — read from system clock; do not hardcode):

- **Start time**: When work began (use the user-request timestamp in local time)
- **End time**: When task completed (local time)
- **Duration**: Exact minutes = `(End - Start)` rounded to nearest minute (no manual overrides)
- **Tokens Used**: Total tokens consumed for the task (use best available estimate from API/tooling; if unavailable, label as `N/A` but explain why)

Format:

```
⏱️ Session Report
- Start: [HH:MM AM/PM] (your local time)
- End: [HH:MM AM/PM] (your local time)
- Duration: [X] minutes
- Tokens: [Y]
```

---

## Pre-Completion Checklist (Quick)

Before marking any task complete:

- [ ] Follows existing patterns and conventions
- [ ] All new/modified code has tests (with the unit's stated acceptance assertion)
- [ ] All tests pass (unit, integration, and end-to-end)
- [ ] Build clean — zero warnings, zero errors
- [ ] Only modified necessary components
- [ ] Schema changes: ORM + migrations + services + tests updated
- [ ] No silent deferrals (anything skipped was authorized)
- [ ] Technical debt documented
- [ ] Followed rule precedence (P0 > P1 > P2 > P3 > P4)

> Full checklists: [AGENTS/[APP]__CHECKLISTS.md](AGENTS/[APP]__CHECKLISTS.md), including the **claim-heavy output checklist** for state reports / audits / architectural assessments.

---

## Continuous Improvement

After completing each task:

1. **Review**: Identify gaps or missed opportunities in these rules
2. **Propose**: Generate concrete rule suggestions with section placement
3. **Where-to-land**: For each new directive, name the candidate locations (kernel `AGENTS.md` for cross-track; track subsection of an appendix for stack-specific; `[APP]__PROJECT_SPECIFIC.md` for project-specific) and let the user pick before persisting

**Quality Standards**:

- Specific and actionable (not "be careful")
- Include concrete examples or commands
- Focus on preventive measures

---

## Context Preservation

For non-trivial tasks (>3 tool calls OR >10 message turns), maintain working state in your agent harness's persistent memory location (e.g., Claude Code's `~/.claude/projects/<encoded-cwd>/memory/MEMORY.md`, auto-loaded at session start).

Do NOT create per-project session directories at the project root — the harness's memory tree already serves this purpose and survives context resets.

---

## Glossary

| Term                   | Definition                                                                       |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Non-trivial change** | >50 lines OR >2 files OR core business logic                                     |
| **Working component**  | Component/service that currently functions correctly                             |
| **P0-P4**              | Priority levels for conflict resolution (P0 highest)                             |
| **Stack Composition**  | The set of language tracks active in a project, declared in `[APP]__PROJECT_SPECIFIC.md` |
| **Track**              | A language-specific guidance set (`dotnet`, `python`, `typescript`, `go`, `rust`)|
| **Terminology rename** | Systematic replacement of domain terms across codebase                           |
| **Acceptance test**    | A specific assertion that proves a unit-of-work landed (not just touch-points)   |
| **Claim-heavy output** | A deliverable making many factual claims — state-of-project report, audit, architecture assessment — requiring adversarial review before publishing |

---

*For details, see appendix documents. Clarity wins when length conflicts.*
