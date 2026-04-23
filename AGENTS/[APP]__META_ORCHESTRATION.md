# Appendix: Meta-Orchestration — Topologies and Coordination

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: How to coordinate multiple agents on a single task

---

## Why This Appendix Exists

The kernel (`AGENTS.md`) governs how *an* agent behaves. Once you delegate to multiple agents — parallel exploration, a review pipeline, a SPARC run — a second set of decisions appears: who leads, how results merge, what happens when two agents disagree. Those decisions are the **topology**.

Most real teams start with one agent, add a second ad-hoc, then discover by incident that the absence of a topology is itself a topology — and usually a bad one (two agents editing the same file, three agents researching the same question, a reviewer blocked on a builder who's already moved on). This appendix names the common shapes, states when each fits, and gives swarm-sizing heuristics so you can pick deliberately instead of drifting.

Rule of thumb: **reach for more than one agent only when the task has genuine parallelism or genuine need for independent verification**. A single competent agent is almost always cheaper and clearer than two agents fighting over context.

---

## Topology Taxonomy

| Topology | Shape | Best for | Fails at |
|----------|-------|----------|----------|
| **Single agent** | No coordination | Most tasks. Default. | Tasks with >30 min of independent parallelism or needing a second opinion. |
| **Hierarchical (queen + workers)** | 1 leader decomposes, N workers execute | Large builds with clear decomposition; one mind holds the contract | Leader becomes a bottleneck; workers starve if decomposition is wrong |
| **Mesh (peer-to-peer)** | All agents equal, consensus by voting | Reviews, architectural brainstorming, cases where you want dissent | Slow; no one accountable; tie-breaking requires a meta-layer |
| **Adaptive** | Starts hierarchical, switches to mesh when decomposition stalls | Tasks whose shape you can't predict upfront | Implementation complexity; an adaptive layer that itself has bugs |
| **Hierarchical-mesh hybrid** | Top layer hierarchical (1 queen → N leads), lower layers mesh among each lead's workers | Multi-team builds (>5 workers) where a single queen is too central | Communication overhead; hard to debug when two leads' work conflicts |
| **Pipeline (ring)** | Output of agent N is input of agent N+1 | Sequential transformations (SPARC phases; spec → pseudo → arch → code) | Stalls completely if any stage fails; no parallelism |
| **Star (broadcast)** | Hub sends same task to N agents, picks best | High-variance tasks where "first good answer" beats "consensus" | Cost scales linearly with N; hub must be able to judge quality |
| **Gossip / eventually-consistent** | Agents exchange partial state opportunistically | Very large swarms (>20 agents), offline-tolerant | Weak consistency; inappropriate for anything transactional |

**Anti-pattern**: "We'll use a hierarchical-mesh swarm with Byzantine consensus for our bug fix." No. One agent. Topology is overhead; only pay it when the work demands it.

---

## When to Use More Than One Agent

Trigger list (any one justifies a second agent):

- Independent parallelism: two or more areas of the codebase can be researched/edited **with no overlap** and **no shared context** required mid-task.
- Independent verification: a reviewer that doesn't share the implementer's context gives a genuinely fresh read (catches bugs implementer cannot see).
- Different specializations: frontend vs backend, SQL vs TypeScript, research vs implementation — each agent's briefing is meaningfully different.
- Cost of context pollution: when a single agent's working context would exceed the compaction threshold, splitting off reads/searches to subagents protects the main context.

Do **not** split when:

- The "parallel" tasks actually depend on each other. You'll serialize them anyway, with extra coordination overhead.
- The task is under ~30 minutes. Spawn overhead + briefing overhead + merge overhead outweighs the parallelism.
- You don't have a way to judge which agent's output is correct when they disagree. A swarm without a tie-breaker is a fog machine.

---

## Picking a Topology

A small decision tree:

```
Task description
├─ 1 focused change, under 30 min?               → SINGLE AGENT (stop)
├─ Clear decomposition known upfront?
│  ├─ 2–5 workers → HIERARCHICAL
│  └─ 6+ workers  → HIERARCHICAL-MESH HYBRID
├─ Need a second opinion or architectural dissent? → MESH (2–3 agents max)
├─ Sequential transformations with hard gates?     → PIPELINE (e.g., SPARC)
├─ High-variance problem, "best of N" wins?        → STAR (2–4 candidates)
├─ Swarm >20 agents, offline tolerant?             → GOSSIP
└─ Shape unknown, willing to pay for flexibility?  → ADAPTIVE
```

---

## Swarm Sizing Heuristics

**Max agents per task**: keep under 15. Beyond that, coordination overhead overwhelms parallelism gains; you're paying for agents to manage other agents.

**Minimum useful swarm**: 2 agents is the floor. A "swarm of one" is just an agent.

**Scaling guidance**:

| Swarm size | Topology | Typical structure |
|------------|----------|-------------------|
| 1 | N/A | Default |
| 2 | Pipeline or Mesh | Implementer + reviewer, or brainstorm pair |
| 3–5 | Hierarchical | 1 queen + 2–4 workers |
| 6–10 | Hierarchical-mesh | 1 queen + 2–3 leads, 2–3 workers per lead |
| 11–15 | Hierarchical-mesh or adaptive | Same as above plus 1 meta-coordinator |
| 16+ | Gossip or bounded adaptive | Requires dedicated orchestration infrastructure — be very sure you need this |

**Cost ladder**: each additional agent adds (briefing tokens) + (coordination tokens) + (their own work tokens) + (result-merging tokens). Empirically, coordination cost grows faster than linearly — doubling the swarm size more than doubles the total tokens for the same work.

---

## Coordinator Roles

Six coordinator types cover almost every real need. The template directory `TEMPLATES/sparc-agents/` ships generic agent-markdown skeletons for each; copy into your project's `.claude/agents/` (or equivalent) and customize.

| Coordinator | Mode | Consensus | Use when |
|-------------|------|-----------|----------|
| **hierarchical-coordinator** | Queen + workers | Queen decides | You have a clear decomposition and want predictable execution |
| **mesh-coordinator** | Peer-to-peer | Majority or super-majority vote | You want dissent baked in (architectural reviews, high-stakes decisions) |
| **adaptive-coordinator** | Starts hierarchical, falls back to mesh on deadlock | Mode-dependent | Task shape is uncertain; you want the system to adapt |
| **byzantine-coordinator** | Peer-to-peer | Byzantine fault tolerance (tolerates up to ⌊(n-1)/3⌋ faulty agents) | High-stakes consensus where some agents may be wrong or compromised; rare in coding workflows but essential in security/compliance-critical paths |
| **raft-manager** | Leader-elected replication | Strong consistency via log replication | State synchronization across a swarm (shared working memory, task lists) |
| **sparc-orchestrator** | Phase-based pipeline | Gate criteria between phases | Full-methodology runs: Spec → Pseudocode → Architecture → Refinement → Completion |

Rule: do **not** mix consensus protocols in one swarm. Pick one coordinator type per task. If you need two, you actually need two swarms.

---

## Communication Patterns

Regardless of topology, three communication patterns recur:

### Broadcast
Queen → all workers. Used for task decomposition, context handoff, final integration. Cost: O(n) tokens per broadcast.

### Gather
All workers → queen. Used for result collection, status reporting. Cost: O(n) tokens inbound.

### Peer (mesh only)
Any worker → any worker. Used for disagreement resolution, clarification. Cost: O(n²) worst case — budget accordingly and rate-limit.

### Shared working memory
Instead of broadcasting every update, writers publish to a shared store (sqlite, redis, an MCP-exposed KV) and consumers pull. Bounded cost; eventually-consistent. See `[APP]__MEMORY_AND_LEARNING.md` for backend choices.

---

## Failure Modes and Anti-Patterns

**The ghost-queen**: the queen agent terminates mid-task (context-exhausted, crashed, or timed out) and workers keep executing with stale decomposition. Mitigation: queen heartbeats; workers pause on heartbeat gap >N seconds.

**The silent worker**: a worker returns no output but also no error. The queen blocks forever. Mitigation: every worker reports either `{status: done, output}` or `{status: failed, reason}` — never nothing. Timeouts enforced by the coordinator.

**The echo chamber**: mesh agents converge on a wrong answer because they share the same training and the same prompt. Mitigation: give mesh members *different* briefings, or seed one member with the opposing view.

**The overflow**: the coordinator's own context fills with worker outputs and it can't synthesize. Mitigation: coordinator instructs workers to report in ≤N lines each; workers produce full artifacts in files, coordinator reads summaries.

**The hidden serialization**: "parallel" workers all need the same shared resource (DB, file, upstream API) and serialize on it anyway. Mitigation: decompose by resource, not by task — or accept that you're not actually parallelizing.

**The forever-adaptive**: the adaptive-coordinator keeps switching topologies because it lacks convergence criteria. Mitigation: cap topology switches per task (2 is usually enough).

---

## Session-End Reporting for Swarms

When a swarm completes, the coordinator reports in a standardized shape so reviewers can audit:

```
Swarm Report
- Topology: hierarchical
- Agents: 1 queen + 3 workers
- Task: <one-sentence summary>
- Duration: X minutes
- Tokens (total across agents): Y
- Outcomes:
  - worker-1 (research): done (3 min, ~2k tokens)
  - worker-2 (implementation): done (18 min, ~12k tokens)
  - worker-3 (review): found 2 issues (4 min, ~3k tokens)
- Escalations: none | <list>
- Rule improvement suggestions: <list or none>
```

Aligns with the kernel's Session Reporting format (`AGENTS.md`), extended for multi-agent work.

---

## Checklist: Before Spawning a Swarm

- [ ] Have I verified a single agent can't do this in reasonable time?
- [ ] Can I name the topology I'm choosing (not "default" or "whatever")?
- [ ] Have I written each worker's briefing as if they've never seen this conversation?
- [ ] Do I have a tie-breaker plan if two agents disagree?
- [ ] Have I capped the swarm size? (≤15 unless you have infrastructure to justify more)
- [ ] Do I have a timeout plan per worker?
- [ ] Will the coordinator synthesize, or just concatenate? (Synthesis is the whole point.)
- [ ] Will the Session Report cover *each* agent, not just aggregate?
