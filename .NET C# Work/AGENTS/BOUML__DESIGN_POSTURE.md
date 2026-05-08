# SemanticCodeGraph Design Posture

> **Parent**: [AGENTS.md](../AGENTS.md)
> **Owns**: Locked architectural decisions with explicit backout triggers — license, storage choice, consumer surface, node-kind modeling, scope exclusions, phase ordering.
>
> See root `AGENTS.md §10` for the full domain map. Content migrated from the AInewUI memory file `project_semantic_code_graph_decisions.md` during Phase 0 scaffolding — that memory now points here as the authoritative source.

---

## 1) Locked architectural decisions

- **License:** proprietary today; planned to become open source. The
  proprietary stance reflects current ownership; the OSS direction
  shapes how new code is written (no contributor-hostile blanket
  suppressions, careful commit hygiene, README posture). The license
  flip itself is a separate downstream change.
- **Intermediate format:** SQLite primary; JSON is an on-demand export.
- **Node-kind modeling:** hybrid. Sealed-class discriminated union in
  memory (type-safe per kind); single `Nodes` table in SQLite with a
  `Properties` JSON column for kind-specific fields; a mapper converts
  at the storage boundary.
- **Consumer surface:** CLI only. No MCP server today (revisit per §2 backout triggers).
- **Language:** C# throughout (.NET 10 / C# 14).
- **Phase ordering:** strict. SemanticCodeGraph was the gating
  predecessor for AInewUI work; that gate cleared at commit
  `89526c5` (the `phase-10e` commit, which rolled docs over to ship
  posture). Phase ordering is now about feature work landing in
  coherent slices (per-feature plan files in `AGENTS/`), not gating
  predecessor sequencing.
- **Scope exclusions:** F# and VB.NET not supported (C# only).

## 2) Backout triggers — revisit these decisions only when

### Add an MCP server back into scope only when at least one holds

- CLI text/JSON parsing of query output becomes measurably lossy for the
  agent, OR
- A non-Claude MCP-aware consumer needs the query surface, OR
- The CLI command surface grows past ~15 distinct commands — schema
  discovery earns its keep at that scale.

### Switch storage from SQLite to an embedded graph DB only when at least one holds

Leading candidate for the switch: **Kuzu** (MIT-licensed, embedded,
native Cypher, single-file storage).

- The KG exceeds ~1M nodes on a real-world consumer, OR
- Blast-radius queries routinely run 6+ hops and recursive CTEs become
  too slow, OR
- Path enumeration or graph algorithms (centrality, community detection)
  become core to the query list, OR
- Recursive-CTE maintenance burden outweighs the embedded-graph learning
  curve.

The schema is portable across SQLite ↔ Kuzu — only the query layer
changes.

**Neo4j is explicitly not on the switch list.** A daemon dependency
defeats the embedded-tool story; AGPL-3.0 Community Edition complicates
proprietary use.

## 3) Rationale for future audits

- **CLI over MCP:** Claude already has Bash/Read/Grep at hand; MCP's
  schema and auto-complete advantages don't clear the cost bar today.
- **SQLite over Neo4j:** 6 of 7 target queries (callers, implementers,
  recently-changed, covering-tests, ontology-mapping, similar-types) are
  SQLite-native trivial; only blast radius meaningfully benefits from a
  graph DB, and it runs in milliseconds at AInewUI-scale depths.
  Zero-install matters for a dev tool.
- **Hybrid node-kind modeling:** type safety where we write code, schema
  simplicity where queries happen. The mapper at the storage boundary is
  the small price for both benefits.
- **Proprietary license today, OSS-planned future:** the proprietary
  stance reflects current ownership and avoids prematurely committing
  to a public-API contract while the schema is still settling.
  Open-sourcing is the planned destination — recent design choices
  (analyzer baseline that doesn't preclude contributors, no
  blanket-suppression patterns, README rolled toward neutral OSS
  posture in `7951423`) reflect that direction. The license flip
  itself is a separate downstream change once the schema is stable
  and the test suite is hardened against external contributors.

## 4) How to apply these decisions

When discussing SemanticCodeGraph architecture, default to the locked
decisions in §1. If a question would reopen one, check §2 backout
triggers first — if no trigger is satisfied, the locked choice stands.

When a trigger fires: update this file with the observed condition
(specific KG size, measured query latency, the new consumer's
requirements, etc.) *before* proposing the change. Document in the
commit message.

## 5) Relationship to the 10-phase plan

The 10 phases in root `AGENTS.md` + `SCG__PROJECT_SPECIFIC.md` implement
these decisions:

- Phase 0 scaffolds the repo under the §1 constraints.
- Phase 1 delivers the hybrid node-kind model (§1.3).
- Phases 2–7 build the extractor writing to SQLite (§1.2).
- Phase 8 exposes the SQL-backed query API.
- Phase 9 ships the CLI (§1.4) and AInewUI integration.
- Phase 10 validates and prepares for NuGet.

MCP work does not appear in any phase (§1.4) — that is deliberate, not
an oversight.
