# AGENTS.md as a Development Operating System

**Author:** Farshad Samimi
**Status:** Companion deep-dive to [`CONCEPT.md`](../CONCEPT.md)
**Adapted from:** the LinkedIn article of the same title (Feb 2026)

---

## How to Build Bounded Autonomy for Coding Agents

A few months ago, I watched a coding agent confidently refactor a FastAPI router, introduce dependencies that don't exist, and "fix" a failing test by removing the assertion. It had already read the file earlier in the session.

That's not a model problem. That's a constraints problem.

If you're building with agents at any meaningful scale, the hidden cost isn't "token usage." It's the downstream burn:

- Compute burn from repeated retries and rework
- Technical debt from vibe-coded patches that "seem right" but don't integrate
- Velocity loss from human review becoming a forensic exercise

In my work on **Architect Coding** — orchestrating AI so one engineer can ship what used to require a full team — the core unlock wasn't a longer prompt. It was treating `AGENTS.md` as a repository-native contract that actually drives development.

This article is about how to structure `AGENTS.md` and its companion files under `AGENTS/` so they don't just "exist" in the repo like a generic checklist, but actually drive software development quality.

A concrete data point from the experiments that led me here:

- **Early 2025:** built a prototype solo that would have taken 2 devs + 1 PM ~6 weeks
- **Mid-2025:** same complexity in ~3 weeks, plus CI/CD
- **Late 2025:** comparable application in ~1 week

The point isn't the exact numbers. It's that once an agent becomes part of your delivery system, you need a way to enforce correctness, scope, and safety **without turning every PR into an archaeology expedition**.

---

## 1. Why AGENTS.md is the Center (and "Long Prompts" Are Just History)

Every team eventually writes something like an `AGENTS.md`. Most of them are well-intentioned. Most of them don't change outcomes.

The difference is treating `AGENTS.md` as:

- A **kernel** (policy and precedence), not a README
- A **contract** that governs tool-use, scope, and correctness
- A **portable framework** that moves between projects with minimal edits

Yes, early "long system prompts" were an on-ramp. But the higher-leverage move is making the rule system **versioned, modular, reviewable, and composable** — the same properties we demand from production code.

---

## 2. How the Agent Actually Uses These Files (Not Magic)

A practical question that matters: *how does the agent know to look at `AGENTS.md` and `AGENTS/`?*

In my workflow, this is not left to chance:

- **The kernel** (`AGENTS.md`) is "pinned" in the agent's working context via the IDE/agent configuration. Different tools call this different things: custom instructions, pinned context, repo rules, project rules. (See [`CLAUDE_CODE/SETUP.md`](../CLAUDE_CODE/SETUP.md) for how this maps to Claude Code specifically.)
- **The appendices under `AGENTS/`** are treated like modular SOPs. The agent pulls them in when the task touches that domain — API design, testing, linting, deployment, etc.
- **Tool discipline is enforced at the kernel level**: read-before-write, verify-before-delete, no looping on failing commands. This prevents the agent from "freewheeling" when context gets messy.

This is the key shift from *prompting* to *architecting the agent's development environment*.

---

## 3. The Architecture: Kernel + SOPs + Local Overrides

`AGENTS.md` stays intentionally short (**under 300 lines**). It's the minimal rule engine that creates bounded autonomy. Everything else is modularized into `AGENTS/`.

### Layer 1 — `AGENTS.md` (the Kernel)

- Universal rules and precedence
- What must **never** happen (security, data integrity)
- What must **always** happen (testing, planning, verification)
- Tool discipline

### Layer 2 — `AGENTS/` (the SOP Library)

| File | Purpose |
|---|---|
| `[APP]__IMPLEMENTATION.md` | How you execute (TDD, regression-first bug fixing) |
| `[APP]__API_DESIGN.md` | API rules and error contracts |
| `[APP]__STATIC_ANALYSIS.md` | Linting, type, safety tooling |
| `[APP]__CHECKLISTS.md` | Decision logs, pre-completion gates, tech debt capture |
| `[APP]__TOOL_USAGE.md` | Safe tool invocation patterns |
| `[APP]__DEPENDENCY_UPGRADES.md` | Phased upgrade methodology |

### Layer 3 — `AGENTS/[APP]__PROJECT_SPECIFIC.md` (the Only File You Rewrite Per Repo)

- Exact commands, scripts, environment assumptions
- Your "this project only" rules (router order, schema parity, deployment pitfalls)
- Known tool false positives (Knip, Mypy edge cases, Bandit suppressions)

This is the **portable piece**: copy the framework, rewrite only the local override.

> **Subtle but important design choice:** the kernel is written to be **project-agnostic**, while the local override is allowed to be as opinionated and "messy reality" as needed (exact scripts, exact commands, known pitfalls, known false positives). That separation is what keeps the framework transferable.

---

## 4. Predictable Bounded Autonomy: the P0–P4 Priority Matrix

LLMs are stochastic. We're not making them literally deterministic. The goal is **predictable bounded autonomy**.

The most important part of `AGENTS.md` isn't any single rule — it's the **rule conflict resolver**:

| Level | Focus | Example |
|---|---|---|
| **P0** | Security & Data Integrity | Never modify auth without explicit approval. Never commit secrets. |
| **P1** | Correctness, Testing, Planning | Regression test before fix. Run full suite after significant changes. |
| **P2** | Scope & Stability | No "while I'm here" refactors. Touch only necessary components. |
| **P3** | Quality | Capture tech debt. Suggest rule improvements after each task. |
| **P4** | Simplicity | Prefer simple solutions. Improve incrementally. |

### A Real Conflict Example

A user says: *"Ship a quick fix."* (P4 — speed/simplicity)

The agent notices: the fix touches a migration + a service layer and breaks an integration test.

Under this framework:

- **P1** requires a regression test or fixing the test correctly
- **P0** prevents risky actions like touching auth, committing secrets, or "just bypassing" data integrity

The agent isn't being difficult. It's being **bounded**.

---

## 5. Context Engineering Without Overclaiming

When people hear "agent failures," they jump straight to model capability. Sometimes that's true.

But even with modern long-context models, you still see failures caused by:

- Drifting goals over long sessions
- Partial reads (agent acted on the first 100 lines of a 600-line file)
- Tool output flooding the context window
- The agent optimizing for *completing the task* rather than *preserving system integrity*

The academic framing often used here is **"Lost in the Middle"** — models can underweight instructions buried deep inside long contexts.

To be precise: newer models mitigate this significantly. The reason modular `AGENTS.md` still matters isn't only attention mechanics — it's **maintainability, portability, and auditability**. You can diff it, review it, version it, and teach it.

---

## 6. Tool Discipline: Treat the Context Window Like RAM

Two rules from `AGENTS.md` do an outsized amount of work:

### Read-Verify-Write (P0)

Never modify a file you haven't read in the current or immediately preceding step. I classify this as **P0** because blind writes to auth, migrations, or data-handling code are security and integrity risks — and it's simpler to enforce universally than to maintain a list of "sensitive" files.

### Error Loop Prevention (P2)

If a command fails twice with the same or closely related error: **stop**, read docs/source, change approach. This single rule prevents the most common token-burn pattern: the agent retrying a failing migration / lint / build with progressively more desperate variations.

### Active State Management

In long, multi-step sessions, "agent amnesia" — drift away from the original plan — is the silent killer. The mitigation is **active state management**: a small persistent plan file (`agent_sessions_tmp/ACTIVE_PLAN.md` in this repo) the agent re-reads when it gets lost. Think of it as memory swap.

When the agent gets confused, it re-loads the plan, re-loads constraints, and resumes with intent.

---

## 7. P1 Enforcement in Practice: Tests + QA Gates

Most `AGENTS.md` files say "write tests." That's insufficient. The agent needs to know **what kind** of test to write, **when** to write it, and what "passing" means.

### 7a. Automated Testing as a P1 Constraint

In one of my projects (a FastAPI + React stack), the testing contract looks like this:

- **Backend:** `pytest` invoked via Poetry; tests live under `tests/backend/` (in-memory DB for fast runs, plus Dockerized Postgres for realistic integration)
- **Frontend:** component tests plus Playwright E2E under `tests/e2e/`
- **The rule:** "fixing a bug" is incomplete until you've written a regression test. The agent knows this because it's a P1 constraint, not a suggestion.

The specifics aren't the point. The transferable pattern is that `AGENTS.md` **names the runner, names the test location, and defines what "done" means** so the agent isn't guessing.

### 7b. Static Analysis: Tiered QA Gates

Testing proves behavior. Static analysis proves standards, safety, and hygiene. Both are P1 enforcement, but they catch different failure classes.

I use **tiered QA gates**:

| Tier | Trigger | Tools (example) |
|---|---|---|
| **Tier 1** | Every change | Linting, formatting, dead code (Ruff, ESLint, Knip) |
| **Tier 2** | Scope grows beyond a single file | Type checking, lightweight security scanning (Mypy, Bandit) |
| **Tier 3** | Pre-deployment | Deeper SAST, secrets detection, dependency CVEs (Semgrep, GitLeaks, Trivy) |

This creates a **shared language** between you and the agent:

- *"This change is Tier 1"* → a scoped commitment
- *"This change needs Tier 2"* → correctness/safety requires more proof
- *"This needs Tier 3"* → you're touching security boundaries, deployment paths, or deep integrations

See [`AGENTS/[APP]__STATIC_ANALYSIS.md`](../AGENTS/%5BAPP%5D__STATIC_ANALYSIS.md) for the concrete tooling rules.

---

## 8. Continuous Improvement: Self-Optimizing, with a Human in the Loop

The "self-optimizing" part is real, but it's **not autonomous self-modification**.

The framework requires the agent to propose improvements after each task:

- What rule failed?
- What ambiguity caused wasted cycles?
- What new guardrail would have prevented it?

Then a human reviews and merges those rule diffs.

This is exactly how you turn *prompting* into an *engineering discipline*. Your `AGENTS.md` evolves with the work, but every change is reviewed — same as production code.

---

## 9. Policy Layer vs Capability Layer

One reason I'm bullish on modular `AGENTS.md` is that it aligns with where the ecosystem is going: **standardizing how agents execute work, not just how they chat.**

For example, [agentskills.io](https://agentskills.io) and Claude Code's Skills feature are complementary directions: a catalog/spec-like approach for reusable "skills" (tools + contracts) that agents can invoke.

My view:

- **`AGENTS.md` defines the policy layer** — what the agent must / must not do
- **Skills define the capability layer** — what the agent *can* do, packaged as reusable units

You want both. This repo's [`CLAUDE_CODE/templates/global/skills/`](../CLAUDE_CODE/templates/global/skills/) and [`CLAUDE_CODE/templates/project/skills/`](../CLAUDE_CODE/templates/project/skills/) directories are where the capability layer lives in practice — global skills (general-purpose) and project skills (codebase-specific).

---

## Closing: A Practical Provocation

If you're serious about agentic development, don't ask: *"What's the best model?"*

Ask:

- What are the **non-negotiables** my agent must never violate?
- What are the **gates** that prevent vibe-coded regressions?
- What's the **minimal kernel** of rules that stays portable across projects?

That's what `AGENTS.md` is for.

A final nuance: I use "Infrastructure as Code" as an analogy for **rigor** — versioning, modularity, reviewability. It's not Terraform-level idempotency. It's closer to a **development operating system**: a policy kernel that shapes how work gets done.

---

## What Breaks First in Your Agent Workflows?

- Context drift?
- Schema mismatch?
- Test avoidance?
- Unsafe edits (auth, data)?
- Something else?

Whatever it is, the answer isn't a longer prompt. It's a smaller kernel, a clearer precedence, and a tighter loop between rule and outcome.

---

## Related Reading in This Repo

- [`CONCEPT.md`](../CONCEPT.md) — the methodology overview (start here)
- [`AGENTS.md`](../AGENTS.md) — the kernel itself
- [`AGENTS/`](../AGENTS/) — the SOP library
- [`CLAUDE_CODE/`](../CLAUDE_CODE/) — Claude Code integration layer
- [`README.md`](../README.md) — install and usage
