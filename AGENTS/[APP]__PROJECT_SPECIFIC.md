# Appendix: Project-Specific Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Scope**: This project only
>
> **Owns**: Stack Composition declaration, project-specific environment + conventions, deferred-work backlog, re-entry checklist, tool false positives, where-to-land guidance for new directives.
>
> **Fires when**: starting a session, declaring stack/tracks, configuring environment, recording project-specific conventions, documenting tool false positives, picking up after a break.
>
> **⚠️ TEMPLATE NOTE**: When the playbook setup copies this file into your project (renaming `[APP]__` to your project's prefix), **replace this entire file's contents** with your project's specific rules. The structure below is a starting skeleton — fill in real content; delete sections that don't apply.

---

## Current Project: <YOUR_PROJECT_NAME>

Replace this header with your project's name and a one-paragraph description (purpose, current phase, primary users).

---

## Stack Composition

> **Required.** Declare every language track active in this repo. The agent applies whichever track matches the file being edited; the table tells the agent which tracks can legitimately fire.

| Track | Version | Subtree | Notes |
|-------|---------|---------|-------|
| `<dotnet \| python \| typescript \| go \| rust>` | `<e.g., .NET 10 / C# 14>` | `<e.g., src-cs/, tests/dotnet/>` | `<e.g., xUnit.v3 + MTP>` |
| _(add a row per active track)_ | | | |

If only one track is active, the table has one row. Multi-track repos (e.g., .NET service + Python ML pipeline + TypeScript frontend) declare each track on its own row.

**Single-track examples** —
- Pure .NET library: `dotnet | .NET 10 / C# 14 | src/, tests/ | xUnit.v3, central package management`
- Pure Python service: `python | 3.12 | src/, tests/ | pytest, ruff, mypy`

**Multi-track example** —
| Track | Version | Subtree | Notes |
|-------|---------|---------|-------|
| dotnet | .NET 10 / C# 14 | `src-cs/`, `tests/dotnet/` | xUnit.v3 + MTP, central package management |
| python | 3.12 | `src/`, `tests/python/` | pytest, ruff, mypy strict |
| typescript | 5.x | `frontend/` | vitest, eslint, tsc strict |

---

## Environment Setup

### Dependencies

- Source of truth for dependencies: `<your-lockfile/manifest>` (e.g., `package-lock.json`, `poetry.lock`, `Cargo.lock`, `Directory.Packages.props`).
- Add or remove packages via the track's package manager (per `[APP]__DEPENDENCY_UPGRADES.md`).
- **P0 Rule**: Version-locked packages require explicit approval to change.

### Local Run / Stack Bring-Up

- Document the canonical command(s) to start local services.
- List any prerequisites (env vars, secrets, infra dependencies).

### Database Migrations

- Document the migration tool per track (e.g., EF Core for .NET; Alembic for Python; Prisma/Drizzle for TS; sqlx/diesel for Rust; golang-migrate for Go) and the canonical workflow.
- Note rollback procedure and how to verify migrations applied successfully.

### Backend / Frontend / Service Testing

- Note the canonical test commands per track and per layer (unit, integration, e2e).
- Note any conventions about test data, fixtures, or mocked services.

---

## Re-entry Checklist (optional but recommended)

> Lifted from the "what's the first thing to do when resuming work?" pattern. Especially valuable for projects with multi-step environment setup or platform-specific build constraints.

When picking up after a break:

1. Confirm cwd is `<expected-path>`.
2. Run `<canonical-restore-command>` (e.g., `dotnet restore`, `pip install -e .`, `npm ci`, `cargo fetch`).
3. Run `<canonical-build-command>` — expect clean.
4. Run `<canonical-test-command>` — expect a known-good count of tests pass.
5. **Track-specific gotchas** — document any test-runner flag pitfalls, environment-variable requirements, or platform constraints discovered the hard way.

If any step fails, that's the first thing to fix.

---

## Stack-Specific Conventions

Add project-specific conventions here that aren't covered by the global rules or per-track appendices. Examples:

- API route declaration order (if your framework matches sequentially)
- Frontend type alignment with backend schemas (where types live, who owns them)
- ORM / database query conventions specific to this project
- Build configuration patterns (e.g., bundler config, transpiler targets)
- Component / module naming patterns
- Inter-track contracts (e.g., "Python pipeline emits JSON Schema X consumed by .NET service Y")

Delete this section if all conventions are covered by global rules.

---

## Deferred Work (in priority order)

> Captures what's planned-but-not-yet-shipped. Per the kernel's **Deferral Hygiene** rule, "future work" gets explicitly authorized — this list is the durable record of authorized deferrals.

1. **<Item one>** — `<one-paragraph description; what's blocked, what's the expected acceptance>`
2. **<Item two>** — `<…>`

Each item names the acceptance test (per kernel Rule #11): "this is done when assertion X passes against real data."

---

## Open Research Items (still PENDING)

Things that need investigation before we can plan implementation:

- **<Question one>** — `<what's unknown; how we'd settle it>`
- **<Question two>** — `<…>`

Distinct from Deferred Work: these are unknowns, not authorized backlog.

---

## Architectural Facts (verified from sources)

> The "what we know is true about this system" log. Each fact carries the source that established it (commit, doc URL, measurement run). Useful for clean-room or compliance projects, optional otherwise.

- **<Fact one>** — `<source>` — `<verified date>`
- _(empty — populate as facts get established)_

---

## Where-to-Land Guidance for New Directives

When a directive surfaces during a session ("from now on always do X"), enumerate candidate locations and let the user pick before persisting:

| Directive scope | Land in |
|-----------------|---------|
| Cross-track rule | Kernel `AGENTS.md` |
| Stack-specific (one track only) | Track subsection of the relevant appendix |
| Project-specific environment / conventions | This file (`[APP]__PROJECT_SPECIFIC.md`) |
| Tooling enforcement | An in-repo skill, hook, or CI config — not prose |
| Multiple of the above | One-line index + long-form in the durable file |

Asking is cheap; mis-placing a directive means the rule fires in the wrong scope (too narrow → repeats elsewhere; too broad → bleeds into projects it shouldn't apply to).

---

## Environment Awareness & Deployment

### Local vs. Cloud Development

If the project deploys to multiple environments, document patterns to keep both paths working:

- How environment-specific URLs are configured (env vars, config files)
- CORS origin handling
- HTTP/HTTPS scheme detection if behind a load balancer
- Database connection strings per environment

### Deployment Script Integration

If adding new env vars or infrastructure changes during local development requires updating deployment scripts, document the protocol here:

| Change Type | Files to Update |
|-------------|------------------|
| New env var (non-sensitive) | `<your-deploy-config>` |
| New secret / API key | `<your-secrets-config>` |
| Frontend build config | `<your-frontend-deploy>` |
| Backend runtime env | `<your-backend-deploy>` |
| Database schema change | `<your-migration-runner>` |

---

## Tool False Positives

> **Purpose**: Items flagged by static analysis tools but intentionally kept after team review.
> **Rule**: Do NOT auto-remove items in this list. Add new entries with location + justification.

### Dead-Code Detector (Knip / Roslyn / equivalent)

| Item | Location | Reason |
|------|----------|--------|
| _(empty — add entries as your project encounters them)_ | | |

### Linter / Analyzer Rule Suppressions

| Rule | File / Pattern | Reason |
|------|---------------|--------|
| _(empty — document any per-rule suppressions here)_ | | |

---

## Security Tool False Positives & Accepted Risks

> **Purpose**: Document security scan findings that are accepted risks or false positives.
> **Rule**: All suppressions must be documented here before adding to tool-specific ignore files.
> **Review cadence**: Quarterly — set a review date when adding entries.

| Tool | Finding | Severity | Status | Date Added | Review Date | Justification |
|------|---------|----------|--------|------------|-------------|---------------|
| _(empty — add entries with full audit trail when needed)_ | | | | | | |

### When a Real Secret Leaks

If your security tooling flags a leaked secret (`gitleaks` / `trufflehog` / similar), the standard remediation:

1. **Rotate the secret immediately** (the leak is real until proven otherwise).
2. **Rewrite git history** to remove the literal value from old commits (`git filter-repo` or BFG).
3. **Move the secret to a secrets manager** (your platform's vault, GitHub Secrets, etc.).
4. **Add a pre-commit hook** to catch future leaks before they reach the remote.
5. **Document the incident** here with a redacted reference (commit hash + timeline + remediation steps); never paste the actual secret value.

---

## MCP / Agent Integration (if applicable)

If this project exposes MCP endpoints or integrates with agentic tooling, document conventions here:

- Endpoint design rules (idempotency, statelessness, request IDs)
- Agent memory schema (if you persist agent state)
- Testing strategy for LLM-dependent code (deterministic test data, mocked LLM calls)

Delete this section if not applicable.

---

> Replace this whole file with your real project's specifics. The skeleton above is a starting structure — most projects will need to extend it; delete sections that don't apply to yours. The **Stack Composition** section is the only required part.
