# Hook Orchestration Template

Minimal, runtime-agnostic reference implementation of the patterns in [`AGENTS/AGENT_HOOKS.md`](../../AGENTS/AGENT_HOOKS.md).

## What you get

- `settings.json.template` — curated `hooks` block for Claude Code (adapt for Cursor / Codex CLI — the contract is the same)
- `hooks/session-start.mjs` — memory-file import + graph warm-up + status banner
- `hooks/user-prompt-submit.mjs` — keyword routing + top-K memory injection + trajectory-start
- `hooks/pre-compact.mjs` — proactive transcript archival

Each handler reads event JSON from stdin, writes decision/output to stdout.

## Installation

1. Copy this directory to your repo under `.claude/hooks/` (or the equivalent path your runtime reads).
2. Copy the relevant hook block from `settings.json.template` into your `.claude/settings.json`.
3. Mark the handlers executable: `chmod +x hooks/*.mjs`.
4. Create the durable store location (default: `.claude/state/`) and add it to `.gitignore`.
5. Trigger a new session; the SessionStart hook should print a status banner.

## What each handler does

### `session-start.mjs`
- Imports markdown memory files from `.claude/memory/` (or your equivalent) into a session-scoped cache
- Warms the knowledge-graph cache (if a graph MCP server is registered)
- Prints a one-line status banner: `[harness] loaded N memories, G graph nodes, K recent trajectories`

### `user-prompt-submit.mjs`
- Runs a keyword router (configurable patterns) and emits a structured recommendation
- Retrieves top-K semantically-similar trajectories from the store
- Starts a new trajectory record tied to the session

### `pre-compact.mjs`
- Serializes the current transcript + in-flight trajectory to `.claude/state/archive/<session-id>/<ts>.json`
- Flushes any pending learnings to the durable memory backend
- Emits a warning if the durable backend is unavailable

## Contract

Handlers receive JSON on stdin:

```json
{ "session_id": "...", "event": "SessionStart", "payload": { ... } }
```

They write a JSON result on stdout (optional; most handlers are side-effect-only). Non-zero exit codes signal a handler error; the runtime decides whether to block the session or warn.

**Rule**: safety-critical handlers (e.g., command denylist in PreToolUse) exit non-zero to block. Observational handlers (logging, memory injection) never block — they warn on failure.

## Customization hooks

Search the files for `// CUSTOMIZE:` comments — each marks a spot where you plug in project-specific logic (router patterns, memory backend, graph endpoint).
