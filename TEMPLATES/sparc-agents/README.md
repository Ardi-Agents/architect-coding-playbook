# SPARC Agents + Coordinators

Agent-definition markdowns for the SPARC 5-phase methodology and the six most-useful coordinator roles. Pair with [`AGENTS/SPARC_METHODOLOGY.md`](../../AGENTS/SPARC_METHODOLOGY.md) and [`AGENTS/META_ORCHESTRATION.md`](../../AGENTS/META_ORCHESTRATION.md).

## What you get

**SPARC phase agents** (one per phase):

- `specification.md` — Phase 1
- `pseudocode.md` — Phase 2
- `architecture.md` — Phase 3
- `refinement.md` — Phase 4
- `completion.md` — Phase 5

**Coordinators** (top six by usefulness):

- `hierarchical-coordinator.md` — queen + workers
- `mesh-coordinator.md` — peer-to-peer with voting
- `adaptive-coordinator.md` — dynamic topology switching
- `byzantine-coordinator.md` — Byzantine fault tolerance
- `raft-manager.md` — strong-consistency state replication
- `sparc-orchestrator.md` — runs the full 5-phase pipeline

## Installation

Copy the markdown files into your runtime's agent directory (`.claude/agents/`, `.codex/agents/`, `.cursor/agents/`, or whatever your runtime reads from). Each file has YAML frontmatter the runtime parses to register the agent; the body is the system prompt shown to the model when the agent is invoked.

## Customization

Each file contains comments marked `<!-- CUSTOMIZE -->` where you adapt:

- Tool allowlists (which tools this agent may call)
- Project-specific context (paths to CLAUDE.md, graph location, vault location)
- Output format (plain prose vs structured JSON vs code diffs)
- Escalation criteria (when to involve a human)

## Invocation

Most runtimes let you target an agent by name, e.g. `@specification investigate this`. The sparc-orchestrator runs all five phases in sequence; each phase agent can also be invoked standalone for partial iteration.

## Gate criteria live here

Each phase agent ends with a **gate checklist** — the conditions that must be true before the next phase starts. The sparc-orchestrator enforces these. If you edit a phase agent, keep the checklist up to date with your project's specifics.
