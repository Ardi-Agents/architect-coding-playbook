# [PROJECT_NAME]

> **Location:** `<project-root>/CLAUDE.md` (or `.claude/CLAUDE.md`)
> **Scope:** This project, shared with the team
> **Layer:** 2 of 3 (Global → **Project** → Implementation)

---

## Project Identity

- **Purpose:** [ONE SENTENCE — what this project does]
- **Repo:** `[PATH_TO_REPO]`
- **Stack:** [e.g., "Python/FastAPI + React/TypeScript + PostgreSQL + GCP Cloud Run"]
- **Status:** [Active / In development / Maintenance]

## Stack Commands

```bash
# Start local environment
[YOUR_START_COMMAND]   # e.g., ./run_app.sh or docker-compose up

# Run tests
[YOUR_TEST_COMMAND]    # e.g., poetry run pytest or npm test

# Lint
[YOUR_LINT_COMMAND]    # e.g., ruff check . && npm run lint

# Build
[YOUR_BUILD_COMMAND]   # e.g., npm run build
```

## Architecture Context

- [KEY SERVICE OR LAYER 1]
- [KEY SERVICE OR LAYER 2]
- [KEY SERVICE OR LAYER 3]
- [NOTABLE CONSTRAINT — e.g., "All timestamps must be UTC with trailing Z per AGENTS.md contract"]

## How We Work

- **Sprint cadence:** [e.g., "2-week sprints"]
- **Code review:** [e.g., "PR required before merging to main"]
- **Deploys:** [e.g., "User manages all deploys — agent never pushes or deploys"]
- **Key documents:** _(replace with `@docs/your-roadmap.md` or remove this line if you have no project doc)_

---

## Loaded Project Rules

These rule files live in `.claude/rules/` and load when Claude Code opens this project.

```
@.claude/rules/code-style.md      # Coding standards for this stack
@.claude/rules/testing.md         # Testing conventions
@.claude/rules/api-design.md      # API patterns (if applicable)
```

Path-scoped rules (uncomment any whose subdirectory exists in your project):

```
# @.claude/rules/frontend/components.md   # Uncomment if frontend/ exists
# @.claude/rules/backend/services.md      # Uncomment if backend/ exists
```

> SETUP.md only ships `frontend/components.md` if your project has a `frontend/` directory (and similarly for `backend/`). Uncomment the import line whose target was actually installed.

## Loaded Project Skills

Skills available as slash-commands or context triggers. Live in `.claude/skills/`.

```
.claude/skills/
├── deploy/SKILL.md           # /deploy command
├── review-pr/SKILL.md        # /review-pr command
└── prd-writer/
    ├── SKILL.md              # /prd-writer command
    ├── template.md
    └── examples/sample.md
```

## Loaded Project Subagents

Specialized read-only or scoped agents for this project. Live in `.claude/agents/`.

```
.claude/agents/
├── researcher.md             # Read-only codebase exploration
└── reviewer.md               # Code review specialist
```

---

## AGENTS Appendices (Source of Truth for Methodology)

The Architect Coding Playbook AGENTS files govern coding work. Import them as needed:

```
@AGENTS/[APP]__IMPLEMENTATION.md
@AGENTS/[APP]__API_DESIGN.md
@AGENTS/[APP]__STATIC_ANALYSIS.md
@AGENTS/[APP]__CHECKLISTS.md
@AGENTS/[APP]__TOOL_USAGE.md
@AGENTS/[APP]__PROJECT_SPECIFIC.md
```

> Replace `[APP]` with this project's prefix.
> `[APP]__PROJECT_SPECIFIC.md` is a template — replace its contents with project specifics.

## Project-Specific Overrides

Any rules that supersede the global CLAUDE.md or AGENTS.md for this project only:

- [e.g., "Use `npm run typecheck` not `tsc` directly — project config differs from tsc defaults"]
- [e.g., "E2E tests require the local Docker stack running — run `./run_app.sh` first"]

> Delete this section if there are no overrides.
