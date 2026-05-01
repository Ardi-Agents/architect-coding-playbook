# Appendix: Project-Specific Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Scope**: This project only
>
> **⚠️ TEMPLATE NOTE**: When the playbook setup copies this file into your project (renaming `[APP]__` to your project's prefix), **replace this entire file's contents** with your project's specific rules, conventions, technology stack, and tool false positives. The structure below is a starting skeleton — fill in real content; delete sections that don't apply.

---

## Current Project: <YOUR_PROJECT_NAME>

Replace this header with your project's name and a one-paragraph description (purpose, current phase, primary users).

---

## Environment Setup

### Dependencies

- Source of truth for dependencies: `<your-lockfile>` (e.g., `package-lock.json`, `poetry.lock`, `Cargo.lock`).
- Add or remove packages via your project's package manager (`npm install`, `poetry add`, `cargo add`, etc.).
- **P0 Rule**: Version-locked packages require explicit approval to change.

### Local Run / Stack Bring-Up

- Document the canonical command(s) to start local services (e.g., `<your-startup-script>` or `docker-compose up`).
- List any prerequisites (env vars, secrets, infra dependencies).

### Database Migrations

- Document migration tool (`<your-migration-tool>`) and the canonical workflow.
- Note rollback procedure and how to verify migrations applied successfully.

### Backend / Frontend / Service Testing

- Note the canonical test commands per layer (unit, integration, e2e).
- Note any conventions about test data, fixtures, or mocked services.

---

## Stack-Specific Conventions

Add project-specific code conventions here that aren't covered by the global rules. Examples of topics to consider:

- API route declaration order (if your framework matches routes sequentially)
- Frontend type alignment with backend schemas (where types live, who owns them)
- ORM / database query conventions
- Build configuration patterns (e.g., bundler config, transpiler targets)
- Component / module naming patterns

Delete this section if all conventions are covered by global rules.

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

> **Purpose**: Items flagged by static analysis tools (linter, dead-code detector, security scanner) but intentionally kept. The team has reviewed these and decided not to fix.
> **Rule**: Do NOT auto-remove items in this list. Add new entries with location + justification.

### Dead-Code Detector (Knip / equivalent)

| Item | Location | Reason |
|------|----------|--------|
| _(empty — add entries as your project encounters them)_ | | |

### Linter Rule Suppressions

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

If your security tooling flags a leaked secret (`gitleaks` / `trufflehog` / similar), the standard remediation is:

1. **Rotate the secret immediately** (the leak is real until proven otherwise).
2. **Rewrite git history** to remove the literal value from old commits (`git filter-repo` or BFG).
3. **Move the secret to a secrets manager** (your platform's vault, GitHub Secrets, etc.).
4. **Add a pre-commit hook** to catch future leaks before they reach the remote.
5. **Document the incident** in this section with a redacted reference (commit hash + timeline + remediation steps); never paste the actual secret value here.

---

## MCP / Agent Integration (if applicable)

If this project exposes MCP endpoints or integrates with agentic tooling, document conventions here:

- Endpoint design rules (idempotency, statelessness, request IDs)
- Agent memory schema (if you persist agent state)
- Testing strategy for LLM-dependent code (deterministic test data, mocked LLM calls)

Delete this section if not applicable.

---

> Replace this whole file with your real project's specifics. The skeleton above is a starting structure — most projects will need to extend it; delete sections that don't apply to yours.
