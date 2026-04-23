<!--
  Paste the content below into your root CLAUDE.md under an
  "Architecture" heading, adjusting paths to match your project.
  The goal: turn the graph from an unused artifact into an actively
  consulted one.
-->

## Architecture

Before answering architecture questions, making large-scale refactors,
or navigating unfamiliar parts of the codebase, consult the knowledge
graph in this order:

1. **Human summary** — read `graph-out/GRAPH_REPORT.md` (or the equivalent
   summary your extractor emits). Covers node counts, community labels,
   god-nodes, and any warnings about stale / malformed nodes.

2. **MCP tools** — the `code-graph` MCP server exposes:
   - `query_graph` — freeform search by name, file, or community
   - `god_nodes` — top-N most-connected symbols (where the system "centers")
   - `get_node` — full metadata for a symbol (file, line range, signature)
   - `get_neighbors` — callers and callees of a symbol
   - `get_community` — siblings within a cluster (logical subsystem)
   - `shortest_path` — dependency path between two symbols
   - `graph_stats` — last-updated timestamp and overall counts

   Prefer these over `rg` / `grep` when the question is about
   *structure* (who calls what, which module owns X, where does the
   system depend on Y).

3. **Vault** — `vault/` (or `docs/adr/`, `docs/postmortems/`) holds
   human-authored notes explaining *why* decisions were made.
   Consult the vault when the graph tells you *what* exists but not
   why it exists.

### Freshness policy

The graph is stamped with a last-generated timestamp. If it's older
than 7 days, treat results as hints; verify specific claims (files
exist, symbols exist at the cited paths) before acting.

### Do NOT

- Re-`grep` the codebase when any of the above already answers the
  question.
- Cite a graph node without verifying the file still exists at the
  cited path.
- Regenerate the graph inside a task unless the user asked —
  regeneration takes time and can be scheduled separately.
