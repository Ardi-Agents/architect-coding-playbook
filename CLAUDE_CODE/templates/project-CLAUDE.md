# [PROJECT_NAME]

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

- [KEY SERVICE OR LAYER 1 — e.g., "FastAPI backend on Cloud Run, connects to Cloud SQL PostgreSQL"]
- [KEY SERVICE OR LAYER 2 — e.g., "React + TypeScript frontend served from Cloud Storage"]
- [KEY SERVICE OR LAYER 3 — e.g., "Auth via Google OAuth, session cookies, SameSite=None in production"]
- [NOTABLE CONSTRAINT — e.g., "All timestamps must be UTC with trailing Z per AGENTS.md contract"]

## How We Work

- Sprint cadence: [e.g., "2-week sprints"]
- Code review: [e.g., "PR required before merging to main"]
- Deploys: [e.g., "User manages all deploys — agent never pushes or deploys"]
- Key documents: `@docs/[ROADMAP_OR_STRATEGY_FILE].md`

## AGENTS Appendices

The following AGENTS/ files govern work on this project. Import them as needed:

```
@AGENTS/[APP]__IMPLEMENTATION.md
@AGENTS/[APP]__API_DESIGN.md
@AGENTS/[APP]__STATIC_ANALYSIS.md
@AGENTS/[APP]__CHECKLISTS.md
@AGENTS/[APP]__TOOL_USAGE.md
@AGENTS/[APP]__PROJECT_SPECIFIC.md
```

> Replace `[APP]` with your project's prefix, or point to the copied AGENTS/ folder in this repo.
> `[APP]__PROJECT_SPECIFIC.md` is a template — replace its contents with your project's specifics.

## Project-Specific Overrides

Any rules that supersede the global CLAUDE.md or AGENTS.md for this project only:

- [e.g., "Use `npm run typecheck` not `tsc` directly — the project config differs from tsc defaults"]
- [e.g., "E2E tests require the local Docker stack running — run `./run_app.sh` first"]

> Delete this section if there are no overrides.
