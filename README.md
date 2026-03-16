# Farshad's AGENTS.md Prototyping Playbook

This repository is a portable starting point for building a high-discipline AI coding workflow using:

- `AGENTS.md` as the global rule kernel
- `AGENTS/` as modular appendices for implementation, API design, static analysis, tool usage, checklists, dependency upgrades, and project-specific overrides

The goal is to help teams move from generic prompting to repeatable, auditable, and safer agent behavior.

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

## Install and use

### 1) Clone this playbook

```bash
git clone https://github.com/farshadas/agents.md-prototyping-playbook.git
cd agents.md-prototyping-playbook
```

### 2) Copy into your target project

From your target project's root, copy:

- `AGENTS.md`
- the entire `AGENTS/` folder

Example:

```bash
cp /path/to/agents.md-prototyping-playbook/AGENTS.md /path/to/your-project/AGENTS.md
cp -R /path/to/agents.md-prototyping-playbook/AGENTS /path/to/your-project/AGENTS
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
