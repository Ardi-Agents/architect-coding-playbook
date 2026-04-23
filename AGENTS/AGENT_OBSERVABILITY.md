# Appendix: Agent Observability

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Make agent behavior auditable — tool calls, file changes, sessions

---

## Why This Appendix Exists

Most agent incidents are debugged after the fact. A tool call fired twice; a file was overwritten; a session hung for an hour; a change landed that nobody remembers authorizing. Without observability, the agent is a black box, and the only forensic tools are git blame and user memory — both unreliable.

This appendix describes the minimum observability stack: a way to **correlate pre- and post-tool events** even when they run in different processes, a **three-tier file-change lifecycle** that supports review and rollback, **idle/stale session detection** so abandoned agents don't hold resources forever, and a **stdio-based IPC protocol** that lets a local inspector process consume events from any runtime without vendor lock-in. Together these are the difference between "we think the agent is behaving" and "we can prove it."

Runnable reference code lives in `TEMPLATES/observability/`. This appendix is the design; the templates are the implementation.

---

## Execution-ID Correlation

**Problem**: `PreToolUse` and `PostToolUse` hooks often run in separate processes — different PIDs, different working directories, no shared memory. How do you know which `Post` corresponds to which `Pre`?

**Solution**: a deterministic execution ID derived from the hook's inputs. No shared state required.

```
execution_id = hash(session_id + tool_name + tool_input)
```

Any stable hash works — MD5 of a canonical JSON serialization is fine (collision risk is negligible in this domain; not a cryptographic use). The important property: *same inputs produce the same ID in both hooks*.

Embed the ID in:
- Pre-use log record
- Post-use log record
- Diff record (if the tool modified files)
- Trajectory step (see `MEMORY_AND_LEARNING.md`)

Now join across tables by `execution_id` and you have a complete per-call record regardless of which process wrote which row.

**Pitfalls**:
- **Canonicalize the tool_input before hashing.** JSON with different key ordering hashes differently. Use a canonical serializer (sort keys, stable whitespace).
- **Don't include a timestamp in the input to hash.** That defeats the purpose.
- **Session scope matters.** Two identical tool calls in two different sessions should have different IDs — include the session ID in the hash.

---

## Three-Tier File-Change Lifecycle

**Problem**: agents modify files. Sometimes you want to keep the change; sometimes revert; sometimes review before deciding. Without structure, you get git conflicts and guesswork.

**Solution**: every file change passes through three states.

```
 (before)                                    (after)
────────                                    ───────
 Tracked    ───snapshot───►   Pending   ───keep───► Resolved(kept)
 (snapshot of                (diff                   │
  original           computed;                       └─ archived record
  version)       awaiting human              ─revert─► Resolved(reverted)
                   decision)                             │
                                                         └─ file restored
                                                            from snapshot
```

### State 1: Tracked
The pre-change snapshot is captured by `PreToolUse` (or equivalent) before the edit runs. Stored with the `execution_id`.

### State 2: Pending
After the edit, the diff is computed between snapshot and new content. The change sits in *pending* state. The user, an orchestrator, or a test suite reviews.

### State 3: Resolved
User (or policy) picks one:
- **Keep**: archive the pending record with a `kept_at` timestamp. File stays as-is.
- **Revert**: restore from snapshot; archive with a `reverted_at` timestamp and a reason.

Why this matters:
- Agents can write speculatively; humans accept or reject.
- "What did this agent change in this session?" becomes a single DB query.
- Rollback is a structured operation, not "git checkout HEAD~1 and pray".
- Auditors can replay exactly which changes landed and which were rejected.

### Storage
A single table (or JSONL file) with columns: `execution_id`, `file_path`, `snapshot_content_ref`, `new_content_ref`, `diff_hunks`, `state`, `state_changed_at`, `reason`.

`*_content_ref` should be a pointer (hash, path) to the content rather than the content inline — avoids bloating the index for large files.

---

## Session Lifecycle States

**Problem**: agents can hang, disconnect, or get abandoned. A "session" state machine catches this cheaply.

```
        ┌──────────┐
        │  active  │  (recent activity: tool use, prompt, stream)
        └──────────┘
             │
             │  no activity for N minutes (configurable, 30 min default)
             ▼
        ┌──────────┐
        │   idle   │  (still reachable, not actively working)
        └──────────┘
             │
             │  no activity for M hours (configurable, 2h default)
             ▼
        ┌──────────┐
        │completed │  (terminal; releases resources; archived)
        └──────────┘
```

### Implementation
A background task — often the same daemon that runs consolidation (see `MEMORY_AND_LEARNING.md`) — scans every N seconds:

```
for each active session:
  if now - last_activity > IDLE_THRESHOLD:
    transition to idle
for each idle session:
  if now - last_activity > COMPLETED_THRESHOLD:
    transition to completed (persist final state, archive trajectory, release resources)
```

Run the scan on the order of 1 minute. Transitions fire events (see "IPC" below) so UIs and loggers can react.

### Why care
- Abandoned sessions leak file handles, memory, connection pool slots.
- "Sessions still active from yesterday" often means a crashed client — it's a signal, not a feature.
- Idle-timeout values are tunable; align with your users' work rhythm.

---

## JSON-RPC 2.0 over stdio IPC

**Problem**: observability data needs to reach a consumer — an inspector UI, a log aggregator, a dashboard — without coupling your agent's runtime to a specific transport.

**Solution**: JSON-RPC 2.0 over stdio. Boring, universal, works everywhere.

### Why stdio
- Every language and runtime has it. No socket configuration, no port conflicts.
- Process isolation: the inspector crashes, your agent doesn't. Agent crashes, inspector logs the last message and survives.
- Firewall-agnostic: nothing to open.

### Why JSON-RPC 2.0
- Schema you can point at. Validators exist in every language.
- Bi-directional: request/response + notifications (fire-and-forget events).
- Versionable: you can add methods without breaking old clients.

### Minimal method surface
Start small. You can add later.

| Method | Direction | Purpose |
|--------|-----------|---------|
| `logs.query` | client → server | Fetch logs by filter |
| `logs.subscribe` | client → server | Subscribe to log stream (notifications) |
| `sessions.list` | client → server | List current sessions with states |
| `sessions.activity` | client → server | Merged log + tool-exec feed for a session |
| `file_changes.pending` | client → server | List pending file changes |
| `file_changes.keep` / `.revert` | client → server | Resolve a pending change |
| `log` (notification) | server → client | New log line |
| `session` (notification) | server → client | Session state change |
| `file_change` (notification) | server → client | File change state change |

### Event flow
```
agent runtime → hook handler → POST http://localhost:<port>/hooks
                                             │
                                             ▼
                                      inspector core
                                             │
                                             ├─ append to log store
                                             ├─ update session state machine
                                             ├─ update file-change records
                                             └─ broadcast notifications over stdio
                                                       │
                                                       ▼
                                               inspector UIs
                                                (VS Code, CLI, web)
```

### Portability
This entire pipeline is runtime-agnostic. Claude Code, Cursor, Codex, Aider, or a custom harness can all feed the same inspector core as long as their hooks POST to the same endpoint with the canonical schema.

See `TEMPLATES/observability/` for starter code: pre/post-tool-use shell templates with exec-ID hashing, idle-detector stub, file-change-lifecycle skeleton.

---

## Logging Conventions

- **Structured, not string**: every log line is JSON (or equivalent). Text logs turn into regex archaeology.
- **Mandatory fields**: `timestamp`, `session_id`, `execution_id` (if applicable), `level`, `event`, `details`.
- **Redact PII at ingestion**: mask emails, tokens, long numeric IDs, session cookies. Downstream consumers can't un-leak; source-side redaction is the only safe place.
- **Levels used sparingly**: `debug` (dev only), `info` (default), `warn` (something's odd), `error` (something broke). Don't stratify further.
- **Don't log entire file contents**. Log the `execution_id` and store the content once, keyed by hash.
- **Include the tool name** on every tool-related log. Grouping and filtering depends on this.

---

## Metrics to Track

A starter kit. Emit as metrics (Prometheus, OpenTelemetry, or just periodic log lines in a structured shape):

- `agent.tool.invocation_count{tool=...}` — per-tool call volume
- `agent.tool.latency_ms{tool=...}` — pre → post duration
- `agent.tool.error_rate{tool=...}` — exit code != 0 or explicit error
- `agent.session.active` — current active count
- `agent.session.transitions{from=..., to=...}` — state transition rate
- `agent.file_change.pending` — backlog of unresolved changes
- `agent.file_change.resolution_rate{outcome=kept|reverted}` — acceptance ratio
- `agent.prompt.tokens_input` / `agent.prompt.tokens_output` — cost tracking

Alert on: sudden drop in tool success rate, unbounded growth in `file_change.pending`, sessions stuck in `idle` forever (suggests clock skew or a stuck state machine).

---

## Security and Privacy

- **The observability stream contains everything the agent sees.** Protect it accordingly. Local-only by default; don't ship to a remote log aggregator without PII review.
- **Inspector consumers need auth too.** Anyone who can read the stream can read the user's prompts. If it's a multi-user environment, enforce per-user streams.
- **Do not log service credentials.** Even in debug mode. Redact at source (see Logging Conventions).
- **Retention policy**: most observability data has a useful life of days to weeks. Automate pruning; don't let a curious archive become tomorrow's breach.

---

## Anti-Patterns

- **Observability without correlation**: logs exist, but there's no execution-ID, so you can't follow a call end-to-end. Useless when debugging a specific incident.
- **Session state as a boolean**: "active or not". Misses stuck agents and abandoned ones. The three-state machine is barely more complex and catches both.
- **Pending file changes that never resolve**: a feature without a review UI is just tech debt. Either ship review or auto-resolve (kept/reverted-default) by policy.
- **Inspector tightly coupled to one runtime**: can only observe Claude Code, or only Cursor. IPC-over-stdio decouples this; use it.
- **Log everything mentality**: disk fills, ingestion lags, signal dilutes. Log the interesting, not the exhaustive.
- **Un-redacted logs posted to chat**: happens every week somewhere. Redact at source.

---

## Integration with Other Appendices

- `AGENT_HOOKS.md` — the hooks emit the events; this appendix defines how they're structured and correlated.
- `MEMORY_AND_LEARNING.md` — trajectory records use the same `execution_id` scheme; observability and learning share a substrate.
- `META_ORCHESTRATION.md` — swarm runs emit per-agent observability; aggregate into a swarm-level session report.
- `KNOWLEDGE_GRAPH.md` — agents that edit files feed the file-change lifecycle; a graph-backed dashboard can visualize which communities an agent touched.

---

## Checklist: Observability Readiness

- [ ] `PreToolUse` and `PostToolUse` emit records with a shared `execution_id` derived deterministically from inputs
- [ ] File changes pass through tracked → pending → resolved states, persisted
- [ ] Sessions have an explicit state machine (active / idle / completed) with configurable thresholds
- [ ] A background task scans sessions and transitions them on timeout
- [ ] Logs are structured JSON with mandatory fields
- [ ] PII/secret redaction runs at ingestion, not retrieval
- [ ] An IPC surface (JSON-RPC over stdio or equivalent) exposes events to consumers
- [ ] A consumer (UI, dashboard, CLI) exists and is actively used — observability nobody reads is compost
- [ ] Retention policy exists and is automated
- [ ] Metrics and alerts are in place for the obvious failure modes (rising error rate, backlog growth, stuck sessions)
