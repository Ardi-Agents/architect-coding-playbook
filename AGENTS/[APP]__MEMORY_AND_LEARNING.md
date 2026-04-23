# Appendix: Memory and Learning

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: How agents remember, rank, and learn across sessions

---

## Why This Appendix Exists

A session-scoped agent is a goldfish. Every new session it re-derives the same project conventions, re-learns the same user preferences, re-discovers the same "don't do X, we tried it last quarter" lessons — and does so with full confidence, because it doesn't know there was a last quarter. Memory turns the goldfish into a colleague.

But memory is dangerous. Stale memory produces confident nonsense. Unbounded memory dilutes signal. Memory without verdict makes every past attempt equal in weight, including the failures. This appendix describes a working shape for agent memory: a layered store (working / episodic / semantic), a backend priority that degrades gracefully, and a learning loop that judges outcomes and reweights patterns accordingly.

Your implementation may use different libraries (SQLite, Chroma, Pinecone, Postgres + pgvector, Weaviate, LMDB), but the *shape* — the three layers, the backend priority, the trajectory-verdict loop — transfers.

---

## Three Memory Layers

### 1. Working memory — the current session
- **What**: current conversation, loaded context, in-flight Active Plan, just-opened files.
- **Where**: in-process; no durable backing.
- **Lifetime**: dies at session end or compaction.
- **Access pattern**: every turn.

### 2. Episodic memory — recent sessions, specific events
- **What**: prior sessions' trajectories, decisions, outcomes. "Last Tuesday we decided X." "The PaymentService refactor took 3 days."
- **Where**: durable store indexed by time + semantic similarity.
- **Lifetime**: retained until explicitly archived (months).
- **Access pattern**: on `SessionStart`, on complex tasks, on postmortems.

### 3. Semantic memory — distilled patterns and rules
- **What**: consolidated knowledge. "This project uses pgBouncer transaction mode." "Feature flags in this codebase follow the `ff:<name>` convention." These are *rules* derived from *many* episodes, not raw episodes.
- **Where**: durable; small; usually flat markdown + a frontmatter index.
- **Lifetime**: indefinite, with periodic review for staleness.
- **Access pattern**: always, via `AGENTS.md` / `CLAUDE.md` references.

The kernel's `MEMORY.md` + per-topic memory files pattern (from the harness guidance) targets **semantic memory**. This appendix extends it to episodic.

---

## Backend Priority

Not every project needs a vector database. Match the backend to the workload:

```
Option A — minimal (<1k patterns, single-dev, local)
──────────────────────────────────────────────────
Semantic memory  →  flat markdown (MEMORY.md + topic files)
Episodic memory  →  JSON lines file, one per session
Working memory   →  agent's context window

Option B — standard (team, 1k–100k patterns)
──────────────────────────────────────────────────
Semantic memory  →  markdown + SQLite index for search
Episodic memory  →  SQLite WAL mode, queried by time + FTS
Working memory   →  context window + in-process cache

Option C — scale (multi-project, >100k patterns)
──────────────────────────────────────────────────
Semantic memory  →  vector DB (HNSW index) + markdown source-of-truth
Episodic memory  →  time-series DB or partitioned SQLite
Working memory   →  context + Redis/KV cache
```

**Backend priority with graceful degradation** (useful for long-lived projects that started with A and grew):

```
try:
    backend = VectorDB()          # fastest retrieval, scales well
except ConnectionError:
    backend = SQLiteBackend()     # local, durable
except FileSystemError:
    backend = JSONBackend()       # last resort — slow, but never down
```

The agent's code path is the same regardless of backend. The backend just gets worse (slower, less expressive) as you degrade. This is critical: memory unavailability should not block the agent — it should *warn the user* that retrieval is limited and proceed.

---

## HNSW Indexing (when you reach vector-DB scale)

**HNSW** (Hierarchical Navigable Small World) is the dominant algorithm for approximate nearest-neighbor search in vector DBs. Relevant parameters:

- `M` — number of connections per node. Higher = better recall, more memory. Start 16–32.
- `efConstruction` — build-time search breadth. Higher = better index, slower build. Start 200.
- `efSearch` — query-time search breadth. Higher = better recall, slower query. Start 50; tune per workload.

You don't need to implement HNSW — every serious vector DB ships it. What you *do* need:

1. **Rebuild cadence**: HNSW indexes don't love high churn. Rebuild nightly or on watermark (every N inserts).
2. **Dimensionality discipline**: pick one embedding model, stick with it. Mixing 768-d and 1536-d vectors in the same index silently corrupts retrieval.
3. **Metadata filtering**: most DBs support `filter + vector search`. Use it — filtering to recent patterns, to the current project, to non-archived items improves quality more than tuning `efSearch` does.

---

## Trajectory Recording

A **trajectory** is the record of a single task from prompt to outcome:

```
trajectory = {
  id: <uuid>,
  started_at: <ts>,
  ended_at: <ts>,
  prompt: <user request>,
  agent: <agent name>,
  steps: [
    { t: ts, action: "read", target: "path/to/file", result_summary: "..." },
    { t: ts, action: "edit", target: "path/to/file", diff_digest: "sha256:..." },
    { t: ts, action: "bash", command: "pnpm test", exit_code: 0 },
    ...
  ],
  outcome: "success" | "failure" | "partial",
  verdict: <see below>,
  tokens: { input: N, output: M },
  duration_ms: N
}
```

Record from hooks (`UserPromptSubmit` starts; `PreToolUse` / `PostToolUse` append; `SessionEnd` closes). Keep `result_summary` short — trajectories aren't archives; they're searchable breadcrumbs.

Retrieval: when starting a new task, search for trajectories similar to the current prompt (embedding similarity + time decay). The top 2–3 provide *grounded priors* — concrete evidence of how similar tasks went, not vague maxims.

---

## Verdict Judgment

A trajectory without a verdict is just noise. After the task ends, someone (or something) judges it:

| Verdict | Meaning | Effect on pattern weight |
|---------|---------|--------------------------|
| **success** | Shipped; no rollback; user accepted | +weight (recall more often) |
| **partial** | Landed but with known issues | neutral |
| **failure** | Rolled back, reverted, or user rejected | −weight (recall less) |
| **unknown** | Verdict not yet determined | neutral until judged |

Who judges? In order of reliability:
1. **Explicit user feedback**: "merged and shipped" or "rolling back".
2. **Derived from git/CI**: the PR was merged → likely success; reverted within 7 days → likely failure.
3. **Self-report by the agent**: least reliable; agents are optimistic about their own work.

**EWC-style consolidation** (elastic weight consolidation, a concept from continual learning): when a pattern is confirmed successful, raise its "importance" so later updates can't easily override it. When a pattern fails repeatedly, lower importance and let newer patterns replace it. This is more conservative than raw up/down weighting and resists over-correction from one bad session.

---

## Freshness and Staleness

Memory rots. File paths change, function names get renamed, flags ship or get removed. A memory that was true 6 months ago is not the same as a memory that's true today.

**Tag every memory with a last-verified timestamp**. When retrieving, show the age to the agent. The agent's policy:

- Fresh (<7 days): use with normal confidence.
- Medium (7–30 days): use, but verify the specific claim before acting (e.g., confirm the file still exists).
- Stale (>30 days): treat as a hint, not a fact. Verify before citing.

For semantic memory (rules, preferences), the review cadence should be explicit — a quarterly sweep to retire stale entries.

---

## Learning Loop

Put it all together:

```
1. SessionStart
   └─ Warm caches: load recent episodic trajectories, load semantic
      memory index.

2. UserPromptSubmit
   ├─ Search: embed prompt; retrieve top-K similar trajectories.
   ├─ Rank: boost by verdict (success > partial > failure), decay
            by time, filter by current project.
   └─ Inject: top 3 into agent context with age + verdict tags.

3. Tool calls
   └─ Append each step to the in-flight trajectory record.

4. Task end
   ├─ Close trajectory (outcome, duration, tokens).
   ├─ Write to episodic store.
   └─ If explicit verdict available: apply weight update.

5. Background consolidation
   ├─ Merge repeated trajectories into patterns.
   ├─ Promote patterns with ≥3 successes to semantic memory.
   └─ Demote patterns with repeated failures.

6. Periodic review (human)
   └─ Retire stale entries; correct misclassified verdicts.
```

**Failure modes to expect**:
- **Cold-start**: first weeks, no trajectories; agents rely on semantic memory and kernel only. Set realistic expectations.
- **Groupthink**: similar trajectories reinforce each other even when wrong. Mitigate by weighting *diverse* trajectories higher when disagreement is found.
- **Verdict lag**: many trajectories sit in "unknown" for days or weeks. Retrieval should be robust to missing verdicts.
- **Forgetting**: aggressive decay drops useful memory. Keep a minimum half-life (e.g., success memories ≤ 50% weight only after 90 days, not 7).

---

## Shared vs Per-Agent Memory

Teams often ask: one shared memory or per-agent silos?

**Shared**: all agents write to and read from the same store. Pro: knowledge compounds across specializations. Con: noise — a `frontend-dev` doesn't need 500 SQL-tuning memories.

**Per-agent**: each agent has its own store. Pro: clean, relevant. Con: duplication; the same decision gets re-learned by each agent; no cross-pollination.

**Recommended hybrid**: one store, tagged by agent. Retrieval filters by tag by default (so `frontend-dev` sees frontend patterns first) but can search unfiltered when explicit. Best of both.

---

## Anti-Patterns

- **Memory without verdict**: every past attempt weighted equally; failures pollute future suggestions.
- **Memory as infinite log**: nothing consolidated; retrieval returns a stew. Consolidate or prune.
- **Memory as ground truth**: agents cite a memory and skip verification. Wrong in any fast-changing codebase. Verify before relying.
- **Per-session memory that overrides global**: a hot recent trajectory outweighs a well-established semantic rule. Use distinct priority; semantic memory should dominate when it conflicts with a single recent episode.
- **Unbounded backend**: SQLite file growing to many GB, queries get slow. Set retention (archive episodic older than 1 year) and measure.
- **Secret leakage**: prompt + tool calls recorded verbatim; secrets end up in the pattern store. Redact at ingestion — mask tokens, long numeric IDs, email addresses.

---

## Integration with Other Appendices

- `[APP]__AGENT_HOOKS.md` — the hooks (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SessionEnd`) drive the recording and retrieval cycle.
- `[APP]__SPARC_METHODOLOGY.md` — each SPARC phase entry searches patterns; each exit stores outcomes tagged by phase.
- `[APP]__KNOWLEDGE_GRAPH.md` — the graph is structural memory; this appendix covers episodic + procedural memory. Both are consulted during `UserPromptSubmit`.
- `[APP]__TASK_ROUTING.md` — the router learns from outcomes stored here (which agent succeeded on which prompt).

---

## Checklist: Memory System Readiness

- [ ] The three layers (working / episodic / semantic) exist and are distinguishable
- [ ] Backend priority with graceful degradation is in place
- [ ] Every memory entry has a last-verified timestamp
- [ ] Trajectory recording captures prompt → steps → outcome
- [ ] A verdict field exists (even if often `unknown`)
- [ ] PII/secret redaction runs at ingestion, not retrieval
- [ ] A consolidation job promotes repeated trajectories into patterns
- [ ] A quarterly human review retires stale semantic memories
- [ ] Retrieval output surfaces age and verdict to the agent
- [ ] The system fails open (agent works even if retrieval is down — warns, doesn't block)
