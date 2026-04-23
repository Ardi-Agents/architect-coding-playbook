# Appendix: SPARC Methodology — Five-Phase Pipeline

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: A phase-based methodology for non-trivial feature work

---

## Why This Appendix Exists

The kernel's DESIGN-FIRST protocol (`AGENTS.md` → P1) says: for any feature touching >5 files or multiple layers, produce the design artifacts *before* writing code. SPARC is a concrete operationalization of that rule — a five-phase pipeline (**S**pecification → **P**seudocode → **A**rchitecture → **R**efinement → **C**ompletion) with explicit gate criteria between phases, so "design-first" becomes something you can actually check off instead of nod at.

SPARC is not new — it's an iteration on long-established engineering lifecycles (RUP, SDLC, V-model), adapted to work inside an agent session. The adaptation matters: an LLM agent is cheap to spawn and catastrophic to rerun from scratch, so the phases are tuned for **fail-fast at low phases** (spec errors are cheap; implementation errors are expensive). The gate criteria let you catch a scope or requirements drift before an agent has burned tokens implementing the wrong thing.

Use SPARC when: the feature is novel, multi-layer, or high-stakes. Don't use SPARC for: bug fixes, renames, small refactors, docs. Those skip the pipeline and proceed directly to targeted edits.

---

## The Five Phases

### Phase 1 — Specification

**Goal**: turn a high-level user request into testable, unambiguous requirements.

**Inputs**: user prompt; existing system state; non-functional constraints (performance, security, compliance, budget).

**Outputs**:
- Functional requirements (what it must do, with acceptance criteria)
- Non-functional requirements (latency, throughput, error handling, observability)
- Explicit out-of-scope list
- Edge cases and failure modes
- Any questions the user must answer before proceeding

**Gate criteria** (must be true before Phase 2):
- [ ] Every requirement is testable (an agent could tell you whether it's met)
- [ ] No ambiguous adjectives ("fast", "robust", "seamless") without numbers
- [ ] Open questions escalated to the user, with defaults explicitly marked as defaults
- [ ] Out-of-scope list includes items the user might *assume* are in scope

**Typical agent**: `specification` — does research, reads existing code, drafts the spec, flags ambiguities.

### Phase 2 — Pseudocode

**Goal**: design the algorithm before designing the system.

**Inputs**: Specification from Phase 1.

**Outputs**:
- Pseudocode at function-level granularity
- Data structures and their rationale
- Complexity analysis (time / space / external-call count)
- Identified invariants (what must remain true across states)

**Gate criteria**:
- [ ] Every requirement from Phase 1 has a corresponding pseudocode block
- [ ] Complexity is stated and acceptable given the non-functional requirements
- [ ] Invariants are enumerated (these become test assertions later)
- [ ] No hidden I/O — every database call, HTTP request, file write is visible in pseudocode

**Typical agent**: `pseudocode` — translates requirements into algorithmic form; does not write real code yet.

### Phase 3 — Architecture

**Goal**: decide how the algorithm fits into the system — files, modules, services, contracts.

**Inputs**: Pseudocode from Phase 2.

**Outputs**:
- File list (create / modify / delete) with rationale
- Component boundaries and contracts (API shapes, DB schema changes, event payloads)
- Migration/rollback plan if any schema or contract change is involved
- Dependency additions (new libraries, new services) with justification
- Security review notes (authn/authz changes, secret handling, PII exposure)

**Gate criteria**:
- [ ] Every file touch is justified against Phase-1 requirements
- [ ] No "while I'm here" refactors (kernel P2)
- [ ] Schema changes have migrations and rollback strategy
- [ ] New dependencies are on the allowed list or have approval
- [ ] Security implications considered even if "no auth change" (which itself is a finding)

**Typical agent**: `architect` or `architecture` — reads existing structure, proposes minimal-surface-area changes.

### Phase 4 — Refinement

**Goal**: write the code + tests. TDD-first.

**Inputs**: Architecture from Phase 3.

**Outputs**:
- Failing tests first (regression and new-feature)
- Implementation that makes tests pass
- All Phase-3 files touched; no drift beyond
- Working static-analysis pass (lint, typecheck)

**Gate criteria**:
- [ ] Tests written before implementation (not retrofitted)
- [ ] All tests pass (unit + integration; E2E as applicable)
- [ ] Coverage meets targets (see kernel and `[APP]__STATIC_ANALYSIS.md`)
- [ ] No Phase-3 file touches were added or removed without an ADR
- [ ] Lint and typecheck pass with zero new warnings
- [ ] `git diff` reviewed by agent against Phase-3 plan — flag surprises

**Typical agents**: pair of `sparc-coder` (implementation) + `tester` (writes tests independently). Pairing is useful here — the two agents shouldn't share a context.

### Phase 5 — Completion

**Goal**: ship it safely.

**Inputs**: Working code from Phase 4.

**Outputs**:
- Code review findings and resolutions
- Documentation updates (README, ADR, API docs, CHANGELOG)
- Deployment checklist items completed
- Smoke tests run post-deploy (if applicable to the change)
- Session report with duration, tokens, decisions

**Gate criteria**:
- [ ] All review findings addressed or explicitly deferred to tech-debt log
- [ ] Docs reflect the new state (no stale commands, flags, or URLs)
- [ ] Deployment scripts updated if env vars, IAM, or infra changed
- [ ] Rule-improvement suggestions captured (per kernel P3)
- [ ] Session report written

**Typical agents**: `reviewer` (independent) + `production-validator` (runs the deployment checklist).

---

## Gate Criteria Are Not Optional

Gates prevent cascading waste. A spec error caught in Phase 1 costs minutes. The same error caught in Phase 4 costs hours (wrong tests, wrong architecture, wrong implementation). The same error caught in Phase 5 costs a rollback.

If a gate fails, the correct move is to **return to the prior phase**, not to patch over. "Let's just add this one thing in refinement" is how scope doubles.

---

## Anti-Patterns

- **Cargo-cult SPARC**: running all five phases for a 3-line bug fix. Proportionality. Bug fixes skip to Phase 4 with a targeted test.
- **Invisible Phase 2**: agent "thinks in pseudocode" without writing it down, and now no one can check the algorithm before coding.
- **Phase 4 starts Phase 3**: implementation reveals a missing architectural decision, and the agent silently makes it in code. Return to Phase 3; don't hide decisions in refinement.
- **Skipping gates to hit a deadline**: the debt compounds. Record the skip as tech debt explicitly so it's visible rather than silent.
- **One giant session for all five phases**: context bloat; Phase 1 artifacts forgotten by Phase 4. Break sessions or use the Active Plan file as durable state.

---

## Integration with Learning / ReasoningBank

If your setup has a pattern store (see `MEMORY_AND_LEARNING.md`), SPARC integrates naturally:

- **Entering a phase**: search the store for similar past SPARC patterns (same phase, similar domain, similar complexity). Top-K results go into the agent's context.
- **Exiting a phase**: record the outcome (success / fail / partial), duration, and a digest of the artifact. The next similar feature gets smarter suggestions.
- **Verdict judgment**: after Phase 5, judge the whole run (did it ship? did it stick? rollback count?) and tag the pattern accordingly. Failed patterns downweight; successful ones upweight.

This is optional but pays off heavily in long-lived projects — the agent stops making the same architectural mistake three times.

---

## When to Skip SPARC

Skip the pipeline entirely for:

- Bug fixes with an obvious fix and a regression test.
- Renames and mechanical refactors (no behavior change).
- Documentation-only PRs.
- Single-file tweaks under ~50 lines.

Collapse the pipeline (Spec + Architecture only) for:

- Schema-only changes (no logic).
- Dependency upgrades (follow `[APP]__DEPENDENCY_UPGRADES.md` instead).
- Configuration changes that affect deployment but not code.

Use the full pipeline for:

- New features that touch >5 files.
- Cross-service contracts (new API endpoints, new events).
- Security-sensitive changes.
- Anything where a rollback is expensive.

---

## Commands and Agent Files

Runnable SPARC agents live under `TEMPLATES/sparc-agents/`:

- `specification.md`, `pseudocode.md`, `architecture.md`, `refinement.md`, `completion.md` — one agent definition per phase, each with its own system prompt and tool allowlist.
- `sparc-orchestrator.md` — coordinator that runs all five phases in sequence, enforces gates, and writes the unified Session Report.

Copy into your runtime's agent directory (`.claude/agents/`, `.codex/agents/`, or wherever the runtime reads from). Invoke the orchestrator for full runs, or invoke individual phase agents for partial iteration.

---

## Checklist: Is This a SPARC Task?

- [ ] The feature touches more than 5 files.
- [ ] The feature crosses service/module boundaries.
- [ ] The user's request is ambiguous enough that Phase-1 clarification is worth the time.
- [ ] A rollback would be expensive.
- [ ] Non-functional requirements (latency, security, compliance) are part of the ask.

Two or more checked → run SPARC. One checked → consider partial SPARC (Spec + Refinement). None checked → skip to direct implementation.
