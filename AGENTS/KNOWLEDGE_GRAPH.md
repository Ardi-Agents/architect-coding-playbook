# Appendix: Knowledge Graph — Code + MCP + Vault

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Pair a code knowledge-graph with agent tooling for architectural recall

---

## Why This Appendix Exists

Agents forget codebases. Every new session, they start with a blank map — re-grepping for the same files, re-building the same mental model, re-asking the same "where is X?" questions the last agent already answered. This is the dominant hidden tax in multi-session work on a real codebase, and it gets worse as the codebase grows.

A **code knowledge graph** fixes it by extracting structure once — modules, functions, calls, imports, class hierarchies — and exposing the result to agents as a queryable artifact. The graph is cheap: AST-based extractors produce it deterministically with no LLM cost. Pair it with an **MCP server** that speaks graph queries and an **Obsidian (or equivalent) vault** of human-curated notes, and you have a persistent architectural memory that survives agent sessions, context compactions, and team handoffs.

This appendix describes the pattern. Extractor choice (graphify, tree-sitter, language-specific compilers) is up to your stack; the methodology is the same.

---

## The Three Pieces

### 1. The graph (structural, auto-generated)

A file that encodes your codebase's structure:

- **Nodes**: modules, functions, classes, methods, types.
- **Edges**: imports, calls, inheritance, instantiation, containment.
- **Metadata per node**: file path, line range, signature, docstring.
- **Communities**: clusters of highly-connected nodes (detected by Louvain or similar) that often correspond to logical subsystems.
- **Indicators**: "god nodes" (highest degree), orphans (degree 0), bridges (cut vertices between communities).

Format doesn't matter as long as it's programmatically queryable. JSON is fine; JSONL scales better for huge repos; a SQLite file is best for ad-hoc querying.

**Regeneration cadence**: after any non-trivial refactor, or on a schedule (nightly, pre-commit, post-merge). Keep generation fast enough to run on save; target <5 s for <10k-file repos.

### 2. The MCP server (programmatic access)

A small server exposing graph operations as MCP tools. Agents call them by name; no bespoke integration needed.

Suggested tool set:

| Tool | Purpose |
|------|---------|
| `query_graph` | Freeform query with filters (by name, file, community) |
| `get_node` | Full metadata for a single node |
| `get_neighbors` | Incoming and outgoing edges for a node |
| `get_community` | All nodes in a cluster |
| `god_nodes` | Top-N highest-degree nodes (useful for "where does this system center?") |
| `shortest_path` | Dependency path between two nodes |
| `graph_stats` | Overall counts, last-updated timestamp, generation-cost |

Register the server in your runtime's MCP config (`.mcp.local.json`, `.cursor/mcp.json`, or equivalent). See `TEMPLATES/knowledge-graph/` for a drop-in config template.

### 3. The vault (curated, human-readable)

A directory of markdown notes — one file per concept, symbol, or decision. Backlinks, tags, and freeform search make it useful for the long-running context that graphs can't capture: **why** a decision was made, not just **what** exists.

Tooling: Obsidian, Foam, Dendron, or plain markdown with a good grep. Obsidian's graph view + backlinks + canvas are especially useful for visualizing the *human* layer on top of the *machine* layer.

The vault is not auto-generated. It grows with the team — ADRs go here, postmortems go here, onboarding notes go here. Some teams auto-generate a **symbol index** (one file per function/class, linking back to the code) using a graph-extractor's `--obsidian` flag. Optional; useful for very large codebases.

---

## Pipeline Overview

```
source code
    │  (AST extraction — free, deterministic, no LLM)
    ▼
┌─────────────────────────────────┐
│    graph.json / graph.db        │
│  (nodes, edges, communities)    │
└─────────────────────────────────┘
    │
    ├──► MCP server ──► Agent tool calls
    │        (query_graph, get_node, god_nodes, …)
    │
    └──► Human-readable report (GRAPH_REPORT.md)
             │
             └──► Referenced by CLAUDE.md / AGENTS.md so the agent
                  knows to consult before answering architecture Qs
```

The vault sits beside this, populated by humans as they work. The agent reads the vault via standard file-read tools; no special integration needed.

---

## Ignore File Discipline

Graph extractors produce a mess without an ignore file. Exclude:

- `node_modules/`, `.venv/`, `vendor/` (third-party code — noise)
- `build/`, `dist/`, `target/`, `out/` (generated artifacts)
- `migrations/` (generated DB scripts — structural patterns are not useful here)
- Tests — *optionally*. Including them gives you the test-graph, which is useful for "where is this function tested?" but clutters architecture views. Many teams keep tests excluded and re-run with tests *included* only when doing coverage work.
- Large data files, fixtures, snapshots — structural noise, bloats the graph.

Keep the ignore file in version control (`.graphifyignore`, `.graph-ignore`, or whatever your extractor reads). Review it quarterly.

See `TEMPLATES/knowledge-graph/.graphifyignore.template` for a starter.

---

## When to Regenerate the Graph

| Trigger | Cost | Worth it? |
|---------|------|-----------|
| Every file save | Low (if incremental), high (if full) | Incremental: yes. Full: no. |
| Pre-commit hook | Low | Yes, if incremental is fast |
| Post-merge to main | Medium | Yes — keeps the shared graph current |
| Nightly scheduled | Medium | Yes — catches anything that slipped |
| Before a large refactor | Medium | Yes — establishes baseline for diff |
| After a large refactor | Medium | Yes — new reality; stale graph misleads the next agent |

**Incremental is much cheaper than full rebuild.** If your extractor supports it (graphify `--update`, compiler-watcher flows, tree-sitter's incremental parsing), enable it. Full rebuilds belong in post-merge and nightly slots.

---

## How the Agent Should Use It

Reference the graph from your project's `CLAUDE.md` / `AGENTS.md` so agents know it exists:

```
## Architecture

Before answering architecture questions or making large-scale
refactors, consult:

1. `graph-out/GRAPH_REPORT.md` for a human summary
2. MCP tools `query_graph`, `god_nodes`, `get_neighbors` for specifics
3. The vault directory (`vault/` or `docs/`) for human-written ADRs
   and postmortems

Do not re-grep the codebase when any of the above already answers
the question.
```

This single instruction turns an untapped artifact into an actively-used one. Without it, agents default to `rg` and reinvent.

---

## Graph + Vault Together

The graph shows structure; the vault shows meaning. Examples of questions each answers:

| Question | Answer source |
|----------|--------------|
| What calls `processPayment`? | Graph (get_neighbors) |
| Why does `processPayment` exist? | Vault (ADR or original design doc) |
| What's the most-connected module? | Graph (god_nodes) |
| Why is it the most-connected? What was the constraint? | Vault |
| Which files will change if I refactor `User`? | Graph (shortest_path + neighbors) |
| What did the last refactor miss? | Vault (postmortem) |

Agents that consult both before acting write materially better code. Agents that consult only the graph miss intent; agents that consult only the vault miss structure; agents that consult neither rewrite things by accident.

---

## Anti-Patterns

- **Graph without a reference**: the graph sits in the repo, no CLAUDE.md line points to it, no agent ever uses it. Dead artifact.
- **Stale graph mistaken for truth**: agent reads a 3-month-old graph, answers confidently, is wrong. Stamp the graph with a last-updated timestamp; agents should distrust graphs older than N days.
- **Graph of the whole universe**: no ignore file; `node_modules` in the graph; god-nodes are all library internals. Useless.
- **Graph that costs $$$ per run**: avoid extractors that rely on LLM semantic extraction for the whole graph. AST is deterministic and free; reserve LLMs for narrow enrichment (e.g., summarizing a community, not extracting call edges).
- **Vault without backlinks**: notes accumulate but don't cross-reference. Use a tool that enforces or at least supports backlinks (Obsidian, Foam, etc.).
- **Auto-regenerating the vault**: the vault is *human*. If it auto-regenerates, it's not a vault, it's another graph. Keep them separate.

---

## Integration with Other Appendices

- `AGENT_HOOKS.md` — `SessionStart` can warm the graph (load it into memory or seed the MCP server cache)
- `META_ORCHESTRATION.md` — shared-working-memory pattern can use the MCP graph as the backend
- `TASK_ROUTING.md` — graph communities can inform routing (prompts mentioning a community's top node route to that module's specialist)
- `E2E_HARNESS.md` — invariants can be seeded from god-node and bridge-node analysis ("these are the things most callers depend on; they need the most tests")

---

## Checklist: Knowledge-Graph Readiness

- [ ] An extractor is wired into the build / pre-commit
- [ ] The graph output is in version control or a known artifact location
- [ ] An ignore file excludes noise (`node_modules`, `build`, `migrations`)
- [ ] An MCP server serves the graph and is registered with the agent runtime
- [ ] `CLAUDE.md` / `AGENTS.md` instructs agents to consult the graph before architectural answers
- [ ] A `GRAPH_REPORT.md` (human-readable summary) is regenerated with the graph
- [ ] The graph's last-updated timestamp is visible to agents
- [ ] A vault (Obsidian or equivalent) exists for human-authored notes and is linked from the repo
- [ ] Regeneration cadence is chosen (incremental on save + full on merge to main + nightly)
