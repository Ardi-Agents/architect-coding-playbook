# Appendix: Agent Hooks — Lifecycle Automation

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Hook events agents fire, how to wire handlers, what belongs in each handler

---

## Why This Appendix Exists

Most agent misbehavior is preventable with a well-placed hook. Context drift, memory loss after compaction, untracked tool executions, silent failures — all have the same root cause: no one is listening at the right moment. The kernel (`AGENTS.md`) sets the rules; hooks are how you **enforce and instrument** those rules mechanically, without relying on the agent to remember its own policy.

Think of hooks the way web developers think of middleware: small, composable functions attached to specific events in the agent's lifecycle. The goal is not to make agents smarter — it's to make their behavior observable and their errors recoverable. This appendix catalogs the events most agent runtimes expose (Claude Code, Codex CLI, Cursor, Aider, and the generic pattern) and gives templates for the handlers that pay off most.

Runnable handler stubs live in `TEMPLATES/hook-orchestration/`. This appendix is the *why* and the *where*; the templates are the *how*.

---

## Hook Event Catalog

Event names vary across runtimes — the table below uses the most common phrasing and notes the equivalent where relevant. The important part is the *moment*, not the name.

| Event | Fires | Typical handler work |
|-------|-------|----------------------|
| **SessionStart** | When an agent session boots | Restore prior context, auto-import memory files, run routing setup, warm HNSW index |
| **UserPromptSubmit** | Every user message | Route the task (keyword → agent), inject intelligence context, log prompt for trajectory |
| **PreToolUse** | Before any tool call | Safety validation, command denylist, unsaved-work snapshot, record execution-ID |
| **PostToolUse** | After any tool call | Outcome logging, file-change diffing, metrics, match back to the PreToolUse execution-ID |
| **PreCompact** | Before context compaction | Proactive archival of transcript + state; save patterns learned so far |
| **PostCompact** | After compaction | Reload minimal context, warn if critical state was lost |
| **SubagentStart** | Spawning a child agent | Record lineage, apply team policies, attach coordinator |
| **SubagentStop** | Child agent returns | Collect result, record outcome + duration, feed into parent's context |
| **SessionEnd** / **Stop** | Session terminating (clean or forced) | Persist learned patterns, write session report, flush memory to durable backend |
| **Notification** | Cross-agent / cross-process message | Route to the right listener, de-duplicate, log |

Not all runtimes expose all events. Fewer events is fine — prioritize `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, and `SessionEnd`. Those five cover ~90% of what hooks are good for.

---

## Handler Composition Rules

### 1. Fast handlers, async when possible
Hooks run synchronously in the hot path. A slow hook slows the agent. Target <100 ms for `PreToolUse`, <500 ms for `SessionStart`. Anything heavier should be fire-and-forget (dispatch a job; don't block).

### 2. Fail-open, not fail-closed (for observational hooks)
Logging and metrics handlers should *never* block tool execution on their own failure. If your logging endpoint is down, the agent should keep working. Wrap in try/catch and emit a warning.

### 3. Fail-closed for safety hooks
Handlers that enforce policy (command denylist, secret detection, auth check) must fail closed: if the check can't run, refuse the action. Better to pause than to leak.

### 4. One handler per file, composed via an index
Each handler in its own file. A top-level handler dispatcher (`hook-handler.cjs` or similar) routes events. This scales better than a 2,000-line switch statement.

### 5. Handler state is dangerous
Prefer stateless handlers. If state is required (session data, counters), put it in a shared store (sqlite, redis, KV). In-memory state dies with the process and corrupts retries.

### 6. Handlers must be idempotent
Events can fire twice (retries, reconnects). Writing the same log entry twice is acceptable; sending the same destructive notification twice is not. Design for at-least-once delivery.

---

## Canonical Handlers

What each event should *usually* do. Adapt to your stack; skip what doesn't apply.

### SessionStart — restore context
- Load the previous session's Active Plan (see `AGENTS.md` — Context Preservation)
- Import memory files (`MEMORY.md` + per-topic memory files) into the working context or a searchable index
- Warm the vector index if you have one (HNSW load into memory)
- Report loaded pattern count and any corruption warnings to the user

### UserPromptSubmit — route and enrich
- **Routing**: keyword-match the prompt to candidate agents, emit a recommendation with confidence score and alternatives (see `TASK_ROUTING.md`)
- **Context injection**: append the top-K semantically-matched patterns from memory
- **Trajectory start**: record this prompt as the start of a new trajectory record (for later verdict judgment)
- **Archival tick**: every Nth prompt, write an incremental archive so a crash or forced compaction doesn't lose hours of work

### PreToolUse — validate and record
- **Denylist check**: refuse dangerous shell commands unless user already approved (per kernel P0)
- **Unsaved-work snapshot**: if the tool will modify a file, snapshot the current version (enables tracked-pending-resolved lifecycle — see `AGENT_OBSERVABILITY.md`)
- **Execution-ID assignment**: hash the tool_input (md5 of serialized input is a good default) so PreToolUse + PostToolUse can be correlated even across process boundaries
- **Rate-limit check**: some tools (API calls, MCP servers) benefit from a per-session quota

### PostToolUse — reconcile and learn
- Match back to the `PreToolUse` execution-ID
- Record duration and outcome (`success` / `error` / `partial`)
- For file-writes: compute diff, add to the session's change log
- Append to the trajectory started at `UserPromptSubmit` (one trajectory, many steps)

### PreCompact — proactive archival
- Write the current transcript + all session state to durable storage
- Persist the trajectory + verdict (if known) to the pattern store
- Do NOT wait for `SessionEnd` — compaction can delete context irrecoverably if the backing store is in-process memory

### SessionEnd — persist and report
- Flush any pending learning patterns to the durable backend
- Write the Session Report (duration, tokens, outcomes)
- Archive the Active Plan into `agent_sessions_tmp/archive/PLAN_<TaskID>_<date>.md` (per kernel pattern)
- Close open file handles (sqlite, network sockets)

---

## Memory-Import Lifecycle

A recurring pain point: the agent starts fresh each session and forgets prior learnings. A three-stage hook pattern solves it.

1. **Stage 1 — SessionStart**: import durable memory files (markdown `MEMORY.md` index + individual topic files) into the session's working context or index them in a search store. Keep this minimal — only load what's relevant, not the entire history.
2. **Stage 2 — UserPromptSubmit**: semantically rank imported memories against the current prompt, inject the top 3–5 into the agent's context. More than 5 creates signal dilution.
3. **Stage 3 — SessionEnd / Stop**: sync any memory updates from this session back to durable storage. New patterns, confirmations of past patterns, corrections of outdated ones.

**Freshness check**: memory claims about file paths, function names, or flags may be stale. Hooks should tag memories with a last-verified timestamp; agents should distrust memories older than N days for *current-state* questions and verify before acting.

---

## Daemon Worker Pool (Optional)

For longer-lived setups, a background daemon that runs hook-adjacent work off the hot path:

| Worker | Typical interval | Purpose |
|--------|------------------|---------|
| `consolidate` | Every 1–4 hours | Merge trajectory records into patterns; prune duplicates |
| `audit` | Hourly | Scan recent commits for policy violations (secrets committed, missing tests) |
| `optimize` | Every 30 min | Re-rank memory patterns by recent usage for better recall |
| `testgaps` | On demand | Compute coverage diff; report files missing tests |
| `benchmark` | Every 4 hours | Record agent latency / token-use baselines for regression detection |
| `preload` | Every 30 min | Pre-warm hot patterns into the in-memory cache |

**When to add a daemon**: when your hooks are doing too much on the hot path and user-facing latency suffers. Start without one; add workers only as real bottlenecks appear.

**Daemon failure modes**: split-brain (two daemons running), stuck worker (never completes), state corruption (shared store not updated atomically). Put worker state under a watchdog with timeouts and health checks.

---

## Cross-Runtime Portability

Hook naming varies, but the events are largely the same. A portable convention:

- Write handlers in language-agnostic form (shell or node scripts work in most runtimes)
- Use stdin for event payload, stdout for result
- Use HTTP logging (POST to `http://localhost:<port>/hooks`) so you can centralize ingestion regardless of which runtime fires the hook
- Keep runtime-specific logic in a thin adapter; the real handler is pure

Example adapter (conceptual):

```
runtime-hook-dispatch(event) →
  normalize(event) →
  POST http://localhost:9999/hooks/{event_type}
```

This lets you run Claude Code, Codex CLI, and Cursor side-by-side with one ingestion pipeline.

---

## Security Considerations

- Hook handlers run with the agent's full tool authority. A compromised handler is an agent-level compromise. Keep the handler directory in version control, code-review changes, run with minimum filesystem permissions.
- Don't put secrets in hook scripts. Read them from the environment or a secret store, same as application code.
- Log prompts and tool calls with PII redaction on by default (mask emails, tokens, long numeric IDs). Raw prompts may contain user PII or internal URLs.
- Hooks that call external services (HTTP logging) must be **non-blocking** (`curl --max-time 1s &`) so an outage elsewhere can't brick the agent.

---

## Anti-Patterns

- **Hooks that silently mutate state**: a `PreToolUse` that rewrites the tool_input to "sanitize" it will baffle anyone debugging why the agent did something the user didn't ask for. Hooks can *block*; they should not *mutate*.
- **Handlers that throw uncaught**: a single exception in a handler can take down the session. Wrap in try/catch; degrade gracefully.
- **Hooks that call the agent itself**: infinite-loop risk. Hooks consume events; they don't generate new prompts.
- **Distributing secrets via hook env**: secret rotation becomes impossible.
- **Serializing megabytes through handlers**: dispatch identifiers, not payloads. Handlers read the payload from the store using the ID.

---

## Checklist: Before Shipping a New Hook

- [ ] Does the handler fit in <100 ms (or is async-dispatched)?
- [ ] Does it fail-open (observational) or fail-closed (safety)?
- [ ] Is it idempotent under retry?
- [ ] Is all state externalized (not held in handler memory)?
- [ ] Is it under version control, code-reviewed like application code?
- [ ] Does it redact PII before logging?
- [ ] Is it documented — what event, what it does, what it assumes?
- [ ] Is there a way to disable it without a full redeploy (feature flag / config toggle)?
