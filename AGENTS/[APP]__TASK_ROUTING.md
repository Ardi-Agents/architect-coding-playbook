# Appendix: Task Routing — Prompt → Agent

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Deterministically pick the right agent for an incoming task

---

## Why This Appendix Exists

Ask a generalist agent to write API documentation, review security, and optimize a SQL query in the same session and you'll get mediocre versions of all three. Ask a specialist agent for each and you get three good answers — but only if you can reliably pick the specialist from the user's request. "Task routing" is the cheap piece of infrastructure that makes specialist agents useful in practice.

The goal is not to predict intent perfectly; the goal is to **recommend with a calibrated confidence score and a ranked fallback list** so the user (or the orchestrator) has something to accept, override, or ignore. Routing that blocks on its own uncertainty is worse than no routing; routing that emits "here's who I'd pick, here are two alternatives, here's why" lets a human or a meta-agent correct course with minimal cost.

This appendix defines a keyword-pattern routing baseline (dumb, fast, auditable) and the upgrade path to semantic routing (smarter, opaque, harder to debug). Start with keyword. Upgrade when keyword misclassifies more than ~15% of tasks.

---

## Baseline: Keyword Pattern Routing

The simplest router that works: a list of regex patterns, each mapped to an agent with a base confidence. The first pattern to match wins; ties broken by pattern specificity (longer / more-specific patterns win).

### Example pattern table (conceptual — implementation agnostic)

| Pattern (regex, case-insensitive) | Agent | Base confidence |
|-----------------------------------|-------|-----------------|
| `\b(implement|create|build|write|add)\b.*\b(function|class|module|endpoint|component)\b` | `coder` | 0.80 |
| `\b(test|testing|coverage|unit test|integration test)\b` | `tester` | 0.80 |
| `\b(review|audit|quality check|code smell)\b` | `reviewer` | 0.80 |
| `\b(design|architect|architecture|system design|pattern)\b` | `architect` | 0.80 |
| `\b(bug|broken|failing|error|crash|stack trace)\b` | `debugger` | 0.80 |
| `\b(research|investigate|explore|find out|survey)\b` | `researcher` | 0.75 |
| `\b(deploy|CI|CD|docker|pipeline|infrastructure)\b` | `devops` | 0.75 |
| `\b(API|REST|endpoint|graphql|schema)\b` | `backend-dev` | 0.75 |
| `\b(UI|component|React|frontend|CSS|style)\b` | `frontend-dev` | 0.75 |
| *default — no match* | `general-purpose` | 0.50 |

### Routing output shape

Return a structured result, not a bare agent name:

```
{
  primary: { agent: "coder", confidence: 0.80, reason: "matched: implement|create|build" },
  alternatives: [
    { agent: "researcher", confidence: 0.60, reason: "fallback for investigation tasks" },
    { agent: "tester",     confidence: 0.50, reason: "fallback for tdd workflows" }
  ],
  metadata: { complexity: "low", estimated_duration_min: "10-30", routing_method: "keyword" }
}
```

- **Primary** is the pick.
- **Alternatives** give the human/orchestrator ranked options to override with.
- **Reason** is shown to the user — opaque routing kills trust.
- **Metadata** helps the caller plan (swarm sizing, time budget, escalation).

---

## Confidence Scoring

Base confidence comes from the pattern table. Adjust by:

| Adjustment | Delta | Rationale |
|------------|-------|-----------|
| Multiple patterns matched | +0.05 per additional matched pattern (cap at +0.15) | More evidence |
| Prompt contains explicit agent name | +0.20 | User told you directly |
| Prompt is ambiguous (<5 words) | −0.10 | Lower signal |
| Prior task of same type failed for this agent | −0.10 | Learn from failure |
| Prior task of same type succeeded for this agent | +0.05 | Learn from success |

**Confidence floor**: never claim >0.90 from keyword alone. Keep headroom so a future semantic layer can actually improve things.

**Confidence ceiling for default/fallback**: 0.50. The "I don't know, here's my best guess" band is distinct from the "I know" band.

**Surface low confidence clearly**: anything <0.65 should be flagged to the user as "I'd recommend X but I'm not sure — here are alternatives". Silent low-confidence routing is the worst of both worlds.

---

## Alternative Agents

Always return at least two alternatives. The user/orchestrator uses them to:

- Override when the primary is wrong (common enough that "override" should be a first-class path)
- Sanity-check the routing (if the alternatives are nonsense, the primary is probably wrong too)
- Parallelize when the task benefits from two agents (primary + alternative in a pipeline)

Rules:
- Alternatives must have **distinct** specializations (no "coder + senior-coder")
- Alternatives must have lower confidence than the primary
- If no meaningful alternatives exist, return `general-purpose` as the only alternative and mark low confidence overall

---

## Upgrade Path: Semantic Routing

Keyword routing breaks on:
- Paraphrase ("fix the login thing" doesn't match "bug" or "error")
- Domain-specific vocabulary ("generate a billing report" — whose billing? which report?)
- Multi-intent prompts ("research X, then write tests for Y") — first-match-wins fails

Upgrade path:

1. **Stage 1 — keyword baseline** (this appendix). Ship, instrument, log misclassifications.
2. **Stage 2 — embedding + cosine similarity**. Pre-compute embeddings for each agent's capability description; cosine-compare the prompt embedding. Fast, ~50 ms, works offline.
3. **Stage 3 — LLM classifier**. A small model prompt: "Given this user request and these N agents, pick the best. Return {agent, confidence, reason}." Slower, costs tokens, but handles paraphrase and multi-intent.
4. **Stage 4 — learned from history**. Train on your own logs (prompt → agent → outcome) to get a routing model that matches your project's vocabulary and success signal.

Skip stages if the previous one works well enough. Don't skip to Stage 4 from Stage 1 — you won't have enough clean training data.

---

## Learning From Outcomes

A router that doesn't learn from failure is a lookup table with opinions. Instrument:

- Every routing decision is logged (prompt → agent → confidence → reason)
- Every task outcome is logged (agent → success/fail/partial → duration → tokens)
- A periodic job joins these and computes per-agent accuracy / cost metrics
- Patterns that misroute >20% of the time are flagged for review; human decides whether to retrain, adjust weights, or accept

Store this in the same memory/pattern backend you use for agent learning (see `[APP]__MEMORY_AND_LEARNING.md`). The router and the agents share a learning substrate.

---

## Integration with Hooks

The router is typically invoked from the `UserPromptSubmit` hook (see `[APP]__AGENT_HOOKS.md`). The hook:

1. Receives the user prompt
2. Calls the router
3. Emits the routing recommendation into the agent's context (or delegates directly if using an orchestrator)
4. Records the decision for later learning

The recommendation appears to the user as a short panel:

```
Routing recommendation: coder (0.80) — matched: implement|create|build
Alternatives: researcher (0.60), tester (0.50)
```

Users can accept, override ("use tester instead"), or ignore. All three outcomes are logged.

---

## Anti-Patterns

- **Silent routing**: the router picks an agent and the user never sees the choice. When things go wrong, no one can debug. Always surface the decision.
- **Over-fitting to recent misses**: one bad routing leads to a rule that breaks ten good routings. Review rule changes like code.
- **Confidence theater**: emitting 0.95 when the real confidence is 0.60. Users lose trust; the number becomes meaningless. Calibrate.
- **First-match-wins with huge rule tables**: performance and auditability both suffer. Prefer specificity-based tiebreakers and keep the table under ~50 rules.
- **Routing that blocks**: "I'm not sure, please clarify" on every ambiguous prompt. The *user* can clarify if the primary is wrong — routing should not stall on uncertainty below 0.90.

---

## Checklist: Before Shipping a Router

- [ ] Every routing decision returns primary + ≥2 alternatives + reason
- [ ] Confidence is calibrated (pick 20 sample prompts, hand-label, check your router's confidence correlates)
- [ ] Decisions are logged to a durable store
- [ ] Outcomes (success/fail) are logged and joined to decisions
- [ ] The user sees the routing recommendation before the agent acts (no silent routing)
- [ ] The rule table is small enough to review at a glance (<50 rules at keyword stage)
- [ ] Low-confidence (<0.65) routes surface explicitly with a "not sure" marker
