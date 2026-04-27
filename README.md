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

→ [Read the methodology overview](./CONCEPT.md)
→ [Deep dive: AGENTS.md as a Development Operating System](./docs/AGENTS_AS_DEV_OS.md)

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
  - `[APP]__PROJECT_SPECIFIC.md` (template override; replace for your project)

## Install

This playbook installs itself. Point a coding agent at this repo and paste **one** of the prompts below — the agent does the rest, preserving anything you already have.

### One-paste install (recommended)

Open your coding agent in any directory and paste:

```
Install the Architect Coding Playbook from https://github.com/farshadas/architect-coding-playbook

1. Clone or fetch the repo to a local cache if not already present.
2. Read CLAUDE_CODE/SETUP.md and execute it as an interactive setup.
3. Enforce its safety rules — never overwrite existing files without showing
   me a diff and getting my explicit approval. Default to preserving what
   I already have.
4. When done, summarize what was created, what was skipped, and what I
   should verify.
```

### Safety guarantees

The setup flow will:

- **Detect** any existing `~/.claude/`, `.claude/`, `AGENTS.md`, or `AGENTS/` files before writing anything.
- **Preserve by default** — if a file already exists, you get three choices: `keep existing` (default), `merge` selectively, or `replace fully`.
- **Show diffs** for every proposed write. No silent mutations.
- **Warn on foreign files** — if a detected file looks hand-written or authored by another framework, setup pauses and asks before touching it.
- **Abort-safe** at any step. Rollback removes only what this setup created.

Full safety rules live in [`CLAUDE_CODE/SETUP.md`](./CLAUDE_CODE/SETUP.md).

### Agent compatibility

| Agent | How it reads this repo |
|---|---|
| **Claude Code** | Paste the prompt above. Agent reads `CLAUDE_CODE/SETUP.md` and runs it interactively. |
| **Cursor** | Paste the prompt above. Agent reads `AGENTS.md` + `AGENTS/` and sets up `.cursor/rules/`. |
| **Windsurf** | Paste the prompt above. Agent reads `AGENTS.md` + `AGENTS/` and sets up `.windsurfrules`. |
| **Codex CLI** | Agent reads `AGENTS.md` natively — copy `AGENTS.md` + `AGENTS/` into your project. |

### Manual path (for humans who prefer it)

If you want to install without an agent:

```bash
git clone https://github.com/farshadas/architect-coding-playbook.git ~/architect-coding-playbook
cp ~/architect-coding-playbook/AGENTS.md ./AGENTS.md
cp -R ~/architect-coding-playbook/AGENTS ./AGENTS
# Edit AGENTS/[APP]__PROJECT_SPECIFIC.md with your project's specifics.
```

For the full Claude Code setup (skills, subagents, memory, per-project `.claude/`), follow [`CLAUDE_CODE/SETUP.md`](./CLAUDE_CODE/SETUP.md) step by step.

---

## Rollout sequence

1. Start with `AGENTS.md` + `[APP]__PROJECT_SPECIFIC.md`.
2. Add API / implementation / static-analysis appendices next.
3. Add checklist and dependency-upgrade appendices after week 1.
4. Review and tighten rules from real task outcomes.

## Maintenance model

- Treat rules like code: version, review, and iterate.
- Add post-task rule improvement proposals.
- Keep a changelog of significant behavior changes to your agent rules.

---

If this playbook helps, fork it and adapt the project-specific appendix to your stack first.
