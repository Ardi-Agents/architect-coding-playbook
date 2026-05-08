# Appendix: Design Posture

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-05-08
>
> **Owns**: Locked architectural decisions with explicit backout triggers. Single source of truth for "this was decided; reopen only when condition X holds".
>
> **Fires when**: "what's our stance on X", "why did we choose Y", "should we switch to Z", design reviews, architecture audits, "is decision N still valid?".

> **⚠️ TEMPLATE NOTE**: When the playbook setup copies this file into your project, **replace the example content below** with your project's actual locked decisions. The structure (sections + format) is the deliverable; the example values illustrate the shape.

---

## Purpose

Architectural decisions tend to drift over time as new engineers join, requirements shift, and tooling changes. This file is the **durable record of the decisions that have been made and the conditions that would justify reopening them**.

Without this file, every "why don't we just use X?" question requires re-litigating the original analysis. With it, the answer is "we considered X; here's the trigger that would make us revisit it."

---

## Locked Decisions

> Each entry names the decision, the rationale, and the alternatives considered. Mark each entry with the date it was locked and the commit/PR that established it.

### Decision 1: `<DECISION_NAME>`

**Locked**: `<YYYY-MM-DD>` (commit `<SHA>` or PR `<#>`)

**Decision**: `<one-sentence statement of what was decided>`

**Rationale**: `<why this choice; what factors mattered>`

**Alternatives considered**:

- `<Alt A>` — `<why rejected>`
- `<Alt B>` — `<why rejected>`

**Backout triggers**: see § Backout Triggers below for the specific conditions that would reopen this decision.

---

### Decision 2: `<DECISION_NAME>`

_(repeat the structure for each locked decision)_

---

## Worked example structure

To illustrate the shape, here's how a real decision might look:

> **Decision**: Storage layer is SQLite with SQL queries; not a graph database.
>
> **Rationale**: Most target queries are SQLite-native trivial; only blast-radius queries meaningfully benefit from a graph DB, and they run in milliseconds at expected scale via recursive CTEs. Zero-install matters for a developer tool — adding a daemon dependency raises the contribution bar and creates an operational burden disproportionate to the gain.
>
> **Alternatives considered**:
>
> - **Neo4j** — daemon dependency defeats the embedded-tool story; AGPL-3.0 Community Edition complicates downstream proprietary use.
> - **Kuzu** — embedded, MIT, native Cypher. Candidate for a future switch (see Backout Triggers § "switch storage to embedded graph DB").
> - **Postgres + pgrouting** — daemon dependency same as Neo4j; weaker graph features than Kuzu.
>
> **Backout triggers**: see § "Switch storage from SQLite to embedded graph DB".

---

## Backout Triggers

> Each backout trigger names a measurable condition that would justify revisiting a locked decision. Triggers are **specific** — "performance is a concern" is too vague; "blast-radius query exceeds 5s on a 100k-node DB" is a real trigger.

### Trigger A: `<condition that would reopen Decision N>`

**Reopens**: Decision `<N>`

**Condition** (any one):

- `<Specific measurable condition 1>` — e.g., "node count exceeds 1M on a real-world consumer"
- `<Specific measurable condition 2>` — e.g., "query latency exceeds 5s for the blast-radius case at expected scale"
- `<Specific measurable condition 3>` — e.g., "team adds three contributors uncomfortable with recursive CTEs"

**When fired**: Update this file with the observed condition (specific measurement, date, source) **before** proposing the change. Document in the commit message.

---

### Trigger B: `<another condition>`

_(repeat the structure)_

---

## Rationale for Future Audits

> The "show your work" section. When future-you (or another agent) asks "why did we lock decision N this way?", this section is the durable answer.

Each rationale entry covers:

- The constraints active when the decision was made
- The data points that drove the choice
- The expected lifetime of the decision (months, until a specific event, indefinite)

### `<DECISION_NAME>` rationale

`<paragraph or two of context — what was true at decision time, what data drove it, what's expected to change that would invalidate it>`

---

## How to Apply These Decisions

When a question would reopen one of the locked decisions:

1. **Check § Backout Triggers** first. If no trigger condition holds, the locked choice stands — close the discussion.
2. **If a trigger fires**: update this file with the observed condition (specific measurement, date, source) **before** proposing the change.
3. **Document the change** in the commit message of the change itself. The commit that flips a locked decision should reference this file.

---

## Relationship to Other Appendices

- **`[APP]__PROJECT_SPECIFIC.md`** — declares the Stack Composition; this file declares architectural decisions *within* that composition.
- **`[APP]__CHECKLISTS.md`** § Architecture Documentation — the design-first protocol references this file for backout triggers in implementation-roadmap units.
- **`[APP]__VERSIONING.md`** — versioning decisions (e.g., "we ship under SemVer with a Roslyn pin") live there, but the *choice* of versioning scheme is a design decision that may be locked here.
