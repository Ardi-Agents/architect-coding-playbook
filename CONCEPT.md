# Architect Coding — Concept & Methodology

**Author:** Farshad Samimi  
**Status:** Active methodology — validated through ~1 year of hands-on 
enterprise application building

---

## What It Is

Architect Coding is a software development methodology that positions the 
engineer as an **orchestrator** — not a coder. AI agents handle all 
implementation. The human focuses on architecture, constraints, strategic 
intervention, and quality governance.

**The one-line definition:**
> *You design. AI codes. Together you ship.*

This is not vibe coding. It is not AI-assisted coding where the developer 
is still the typist. It is a structural role shift — the same kind of 
abstraction leap that separated developers from compiled code decades ago.

---

## Where It Sits in the Landscape

| Approach | Description | Limitation |
|---|---|---|
| **Vibe Coding** | Natural language prompting, ad hoc | Not software engineering; not production-grade |
| **AI-Assisted Coding** | Developer uses AI tools to code faster | Developer is still the typist; transitional |
| **Architect Coding** | Developer orchestrates; AI team implements | The target methodology |

---

## The Four Building Blocks

These four components interlock and reinforce each other:

1. **Requirements, Architecture & Specs** — Collaborative spec development 
   with GenAI before any implementation begins. The orchestrator's primary 
   artifact.

2. **Agent Rules & Guardrails** — AGENTS.md and the AGENTS/ directory. 
   Structured constraints that give agents bounded autonomy rather than 
   open-ended authority.

3. **Developer-in-the-Loop Practices** — Strategic human intervention at 
   defined checkpoints. Not continuous involvement; not hands-off either. 
   Calibrated presence.

4. **Hedged Testing & QA** — Multiple independent automated quality layers. 
   No single point of quality dependency. QA moves upstream into workflow 
   design, not downstream into line-by-line review.

---

## The Core Failure Modes This Addresses

**Slop** — Vibe-coded patches that seem right but don't integrate. The agent 
did something; it just wasn't the right something. Addressed by: spec 
discipline and AGENTS.md scope constraints (P2).

**Context rot** — Agent drift from the codebase's actual state over a session. 
The agent "knows" something that is no longer true. Addressed by: 
context-preservation protocol in AGENTS.md and structured session discipline.

**Unconstrained autonomy** — Agents that refactor things you didn't ask them 
to touch, remove failing tests instead of fixing them, or introduce phantom 
dependencies. Addressed by: the P0-P4 priority matrix and bounded autonomy 
as the design goal.

---

## What AGENTS.md Actually Is

AGENTS.md is not a README. It is not a checklist. It is a **policy kernel** — 
a development operating system that shapes how work gets done.

Closer analogy: Infrastructure as Code (for the rigor — versioning, 
modularity, reviewability) than to documentation. An agent that reads 
AGENTS.md is not reading instructions; it is loading constraints.

The three-layer architecture:
Layer 1: AGENTS.md (Kernel — portable across projects)
Layer 2: AGENTS/ directory (Modular SOPs — pulled in by domain)
Layer 3: Project-specific overrides (Stack and codebase-specific)

---

## The Productivity Trajectory

Validated through documented enterprise builds:

| Period | Baseline Estimate | Architect Coding Result |
|---|---|---|
| Early 2025 | 2 devs + 1 PM, ~6 weeks | Solo, dramatically compressed |
| July 2025 | Multi-week with a team | ~3 weeks solo, Azure deployment |
| Dec 2025 | Multi-day deployment | GCP provisioning in 37 min / ~25K tokens |

The improvement across builds is not attributable to better models alone. 
It is the full stack improving in concert: better agents, better LLMs, and 
a more experienced orchestrator with a refined rulebook. A compounding flywheel.

---

## Key Principles

- **Never edit code directly.** When the agent makes a wrong turn, the 
  response is to refine prompts, provide architectural direction, or redirect 
  scope — not to make direct edits. Direct edits break the agent's context 
  model.

- **Intentionally slow the implementation agent; run thinking agents at full 
  speed.** This reduces cognitive fatigue and prevents premature implementation.

- **Context quality matters more than context quantity.** More context dilutes 
  signal density. Precision beats volume.

- **Quality assurance moves upstream.** When agents write thousands of lines 
  per second, traditional line-by-line review is the bottleneck, not the 
  safeguard. The accountability is real — the mechanism changes.

---

## Going Deeper

For the operational details — how the agent actually loads `AGENTS.md`, the 
P0-P4 conflict resolver in practice, tiered QA gates (Tier 1/2/3), and the 
policy-vs-capability layer split — see:

→ [AGENTS.md as a Development Operating System](./docs/AGENTS_AS_DEV_OS.md)
