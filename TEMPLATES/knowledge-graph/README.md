# Knowledge-Graph Template

Drop-in configs for pairing a code knowledge-graph with your agent runtime, implementing the pattern in [`AGENTS/KNOWLEDGE_GRAPH.md`](../../AGENTS/KNOWLEDGE_GRAPH.md).

## What you get

- `.mcp.local.json.template` — MCP server registration (Claude Code format; adapt for your runtime)
- `.graphifyignore.template` — ignore rules for a clean, code-only graph
- `CLAUDE.md-snippet.md` — the paragraph you paste into your root `CLAUDE.md` so agents know to consult the graph before architectural questions

## Assumptions

- You have (or will install) a code-graph extractor that reads your source tree and writes a JSON/DB artifact. Common choices: graphify, tree-sitter-based scripts, language-compiler extractors.
- The extractor ships an MCP server that exposes graph-query tools (`query_graph`, `god_nodes`, `get_node`, `get_neighbors`, `get_community`, `shortest_path`, `graph_stats`). If it doesn't, this template's MCP config is the contract your wrapper should meet.

## Installation

1. Install your extractor and run a full build once. Verify the output (`graph.json` or equivalent) exists.
2. Copy `.graphifyignore.template` to your repo root as `.graphifyignore` (adjust the filename if your extractor expects a different one). Edit patterns if your project uses non-default build/output directories.
3. Copy `.mcp.local.json.template` to `.mcp.local.json` (or your runtime's equivalent). Replace the `command` and `args` lines with your extractor's server binary and graph path.
4. Paste `CLAUDE.md-snippet.md` into your root `CLAUDE.md` under an "Architecture" heading.
5. Start a new agent session and ask an architecture question. Confirm the agent calls `query_graph` or `god_nodes` before answering.

## Regeneration cadence

- Pre-commit (incremental): cheap if your extractor supports it; catches drift early.
- Post-merge on `main`: full rebuild; keeps the shared graph current.
- Nightly scheduled: catches anything that slipped.
- Before and after large refactors: explicit regeneration with a diff against baseline.

See `KNOWLEDGE_GRAPH.md` for the full discipline.

## Vault pairing (optional)

If you also maintain a human-curated vault (Obsidian, Foam, Dendron, etc.), note its location in the same `CLAUDE.md` paragraph. The graph answers structural questions; the vault answers *why*. Both together beat either alone.
