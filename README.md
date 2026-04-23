# Architect Coding Playbook

This repository is a portable starting point for building a high-discipline AI coding workflow using:

- `AGENTS.md` as the global rule kernel
- `AGENTS/` as modular appendices for implementation, API design, static analysis, tool usage, checklists, dependency upgrades, and project-specific overrides

The goal is to help teams move from generic prompting to repeatable, auditable, and safer agent behavior.

## Why This Exists

This playbook is the operational artifact of **Architect Coding** — a software 
development methodology where the engineer acts as orchestrator and AI agents 
handle all implementation.

The tooling (AGENTS.md, the AGENTS/ directory, the P0-P4 matrix) is 
intentional. Each piece encodes a specific answer to a specific failure mode 
in agentic development: slop, context rot, scope creep, and unconstrained 
autonomy.

> *You design. AI codes. Together you ship.*

→ [Read the full concept and methodology](./CONCEPT.md)

## What is in this repo

- `AGENTS.md`
  - The core policy layer
  - P0-P4 priority matrix and conflict resolution
  - Design-first protocol
  - Tool/file discipline and context-preservation protocol
- `AGENTS/`
  - `[APP]__IMPLEMENTATION.md`
  - `[APP]__API_DESIGN.md`
  - `[APP]__STATIC_ANALYSIS.md`
  - `[APP]__TOOL_USAGE.md`
  - `[APP]__CHECKLISTS.md`
  - `[APP]__DEPENDENCY_UPGRADES.md`
  - `[APP]__PROJECT_SPECIFIC.md` (Python / FastAPI template override)

## Extended Appendices

The playbook also ships a set of extension appendices covering
multi-agent orchestration, hooks, observability, knowledge-graph tooling,
a TypeScript sibling project-specific template, and runnable
templates you can drop into your project. These are independent of the
core kernel — read whichever match the concerns you're solving.

- `AGENTS/[APP]__PROJECT_SPECIFIC__NEXTJS_LAMBDA.md` — sibling to the
  Python/FastAPI template, for TypeScript / Next.js / AWS Lambda /
  Supabase stacks.
- `AGENTS/META_ORCHESTRATION.md` — topology taxonomy (hierarchical,
  mesh, adaptive, hybrid), coordinator roles, swarm-sizing heuristics,
  failure modes.
- `AGENTS/WORKTREE_AND_DELEGATION.md` — how a lead agent splits work
  across isolated git worktrees (subagents vs agent teams,
  file-ownership strategies, meta-agent merging protocol, hand-off
  package shape).
- `AGENTS/AGENT_HOOKS.md` — the lifecycle events (SessionStart,
  UserPromptSubmit, PreToolUse, PreCompact, SubagentStart/Stop,
  SessionEnd) and what belongs in each handler.
- `AGENTS/SPARC_METHODOLOGY.md` — the five-phase pipeline
  (Specification → Pseudocode → Architecture → Refinement →
  Completion) with gate criteria between phases.
- `AGENTS/TASK_ROUTING.md` — keyword-pattern-to-agent routing with
  calibrated confidence and ranked alternatives; upgrade path to
  semantic routing.
- `AGENTS/KNOWLEDGE_GRAPH.md` — pairing a code knowledge-graph (AST
  extractor + MCP server) with a human-curated vault for
  architectural recall.
- `AGENTS/MEMORY_AND_LEARNING.md` — three-layer memory model,
  backend priority with graceful degradation, trajectory recording,
  verdict judgment.
- `AGENTS/AGENT_OBSERVABILITY.md` — execution-ID correlation across
  processes, three-tier file-change lifecycle, session state machine,
  JSON-RPC-over-stdio IPC.
- `AGENTS/E2E_HARNESS.md` — invariant-driven E2E structure (expect +
  invariants + report) with happy-path and edge-script discipline.
- `AGENTS/PRODUCTION_PATTERNS.md` — ten recurring production patterns
  (error-handler HOF, typed error hierarchy, API client singleton,
  env validation at boot, worker queue, structured logging, LLM
  structured output, soft delete, row-level auth, circuit breaker).
- `AGENTS/PROJECT_DOCUMENTATION.md` — the two-tier CLAUDE.md pattern
  (root kernel + per-module appendices) and the auto-update rule.

Runnable templates under `TEMPLATES/`:

- `TEMPLATES/e2e-harness/` — drop-in Node harness (expect /
  invariants / report primitives + example happy-path and edge
  scripts + orchestrator).
- `TEMPLATES/hook-orchestration/` — minimal settings.json block plus
  three reference handlers (SessionStart, UserPromptSubmit,
  PreCompact).
- `TEMPLATES/knowledge-graph/` — `.mcp.local.json.template`,
  `.graphifyignore.template`, and a CLAUDE.md snippet that directs
  agents to consult the graph before architectural questions.
- `TEMPLATES/sparc-agents/` — eleven agent-definition markdowns
  (five SPARC phase agents + six top coordinators) ready to copy
  into your runtime's agent directory.
- `TEMPLATES/observability/` — shell hook templates with
  deterministic execution-ID hashing, a session-idle detector, and a
  three-tier file-change lifecycle API.

## Install and use

### 1) Clone this playbook

```bash
git clone https://github.com/farshadas/architect-coding-playbook.git
cd architect-coding-playbook
```

### 2) Copy into your target project

From your target project's root, copy:

- `AGENTS.md`
- the entire `AGENTS/` folder

Example:

```bash
cp /path/to/architect-coding-playbook/AGENTS.md /path/to/your-project/AGENTS.md
cp -R /path/to/architect-coding-playbook/AGENTS /path/to/your-project/AGENTS
```

### 3) Customize project-specific rules

Edit:

- `AGENTS/[APP]__PROJECT_SPECIFIC.md`

Replace template content with your own:

- stack-specific commands
- test/build/lint scripts
- migration procedures
- known tooling false positives
- environment and deployment conventions

### 4) Keep kernel and appendices modular

- Keep `AGENTS.md` broadly reusable across projects
- Keep project-specific details in `[APP]__PROJECT_SPECIFIC.md`
- Update appendices when your engineering standards evolve

## Claude Code setup notes

If you use Claude Code, the practical approach is:

1. Use Claude Code to convert/adapt this playbook into your Claude-oriented rules format (for many teams this means curating a `CLAUDE.md` entrypoint).
2. In `CLAUDE.md`, point explicitly to:
   - `AGENTS.md`
   - relevant files in `AGENTS/`
3. Keep references stable so Claude can reliably load:
   - the core kernel every session
   - appendices on-demand by task type (API, testing, static analysis, etc.)

In short: use Claude Code to "massage" this framework into a `CLAUDE.md` that points to these associated files, while preserving the same separation of concerns (kernel vs appendices vs project-specific override).

## Suggested rollout sequence

1. Start with `AGENTS.md` + `[APP]__PROJECT_SPECIFIC.md`
2. Add API/implementation/static-analysis appendices next
3. Add checklist and dependency-upgrade appendices after week 1
4. Review and tighten rules from real task outcomes

## Maintenance model

- Treat rules like code: version, review, and iterate
- Add post-task rule improvement proposals
- Keep a changelog of significant behavior changes to your agent rules

---

If this playbook helps, fork it and adapt the project-specific appendix to your stack first.
