# Appendix: Project-Specific Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.3 | **Updated**: 2026-01-22
> **Scope**: This project only
>
> **⚠️ TEMPLATE NOTE**: When copying AGENTS framework to a new project, **replace this entire file's contents** with your project's specific rules, conventions, technology stack, and Knip false positives.

---

## Current Project: TorusMind

The sections below are specific to the **TorusMind** project.

---

## Environment Setup

### Dependencies
- Use `pyproject.toml` + `poetry.lock` as the single source of truth for backend packages
- Add or remove Python packages via `poetry add` / `poetry remove`
- **P0 Rule**: Version-locked packages require explicit approval to change (update `poetry.lock`)

### E2E Testing
- All end-to-end tests must execute `run_torusmind.sh`
- Verify stack starts successfully after any backend changes

### Database Migrations
- Supply Alembic migration for schema changes (or rebuild instructions if data discardable)
- Verify `run_torusmind.sh` completes successfully after migration
- Document migration application in PR summary

### Backend Testing Invocation
- Prefer `poetry run pytest` (not bare `pytest`) to ensure the project venv is active
- Example: `poetry run pytest tests/backend/test_health_api.py`

---

## FastAPI Router Declaration Order

**Context**: FastAPI matches routes sequentially. Dynamic parameters consume literal endpoints if declared first.

**Convention** (in `backend/app/api/*.py`):
```python
@router.get("/", ...)           # 1. Collection - List all
@router.post("/", ...)          # 2. Collection - Create
@router.get("/stats", ...)      # 3. Static - MUST be before /{id}
@router.get("/query", ...)      # 4. Static - MUST be before /{id}
@router.post("/export", ...)    # 5. Static - MUST be before /{id}
@router.get("/{directive_id}", ...)        # 6. Dynamic - after all literals
@router.get("/{directive_id}/metadata", ...)
@router.put("/{directive_id}", ...)
@router.delete("/{directive_id}", ...)
```

**Smoke Test After Router Changes**:
```bash
curl http://localhost:8000/api/directives/stats   # Should return 200
curl http://localhost:8000/api/tags/palette    # Should return 200
```

**Detection**: If literal endpoint returns 422 or "invalid parameter", check route order immediately.

---

## Frontend Type Alignment with Backend Schemas

### Locations
- **Backend**: `backend/app/schemas/*.py` (Pydantic models)
- **Frontend**: `frontend/src/types.ts` (TypeScript interfaces)

### Field Mapping Rules

| Pydantic | TypeScript |
|----------|------------|
| `Optional[T]` | `field?: T` |
| `Field(default_factory=...)` | `field?: T` (optional with default) |
| `List[UUID]` | `string[]` (UUIDs serialize as strings) |
| `Literal["a", "b"]` | `type = "a" \| "b"` |

### Cross-Reference Comments
```python
# backend/app/schemas/export.py
class DirectiveExportRequest(BaseModel):
    """See frontend: frontend/src/types.ts → DirectiveExportRequest"""
```

```typescript
// frontend/src/types.ts
// See backend: backend/app/schemas/export.py → DirectiveExportRequest
export interface DirectiveExportRequest { ... }
```

### Pre-Implementation Checklist
```bash
# Compare schemas side-by-side
code backend/app/schemas/export.py frontend/src/types.ts
```

### Regression Check
If frontend API call fails with 422:
```bash
rg "class DirectiveExportRequest" backend/
rg "interface DirectiveExportRequest" frontend/
```
Compare field-by-field for drift.

### React & TypeScript Conventions
- Prefer `ReactNode` (or a concrete React element type) for content containers instead of `JSX.Element`. The global `JSX` namespace is only present when using the legacy JSX runtime; `tsc` builds without `jsxImportSource` can fail with TS2503 "Cannot find namespace 'JSX'" when the type leaks outside component scope. Swapping to `ReactNode` avoids the namespace dependency and keeps server builds green.

---

## User Preferences

### Validation
- Validate keys and value enums at API boundary before database write
- Reject unknown keys to prevent frontend/backend drift
- Include regression tests asserting schema parity with `frontend/src/types.ts`

### Schema Sync
For preference additions, update both:
1. `backend/app/schemas/user.py`
2. `frontend/src/types.ts`

Add PR checklist item: "Preference types updated on both sides."

---

## Environment Awareness & Deployment

### Local vs. Cloud Development

**P0 Rule**: Code must work in both local development and cloud deployment without manual intervention.

**Common Pitfalls**:
1. **Hardcoded localhost URLs**:
   - ❌ `const API_URL = 'http://localhost:8000'`
   - ✅ `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'`
   - ✅ Fail fast in production if env var missing (see `frontend/src/api/client.ts` pattern)

2. **Missing CORS origins for staging/production**:
   - ❌ `allow_origins=['http://localhost:5173']` (hardcoded)
   - ✅ `allow_origins=get_cors_origins()` (env-aware utility)
   - See `backend/app/utils/environment.py` for reference implementation

3. **HTTP vs. HTTPS scheme detection**:
   - Cloud Run uses ProxyHeadersMiddleware to detect scheme from `X-Forwarded-Proto`
   - Local dev doesn't need this middleware
   - ✅ Apply conditionally: `if is_production(): app.add_middleware(ProxyHeadersMiddleware)`

4. **Database connection strings**:
   - Local: PostgreSQL in Docker via `run_torusmind.sh`
   - Cloud: Cloud SQL with Unix socket
   - ✅ Use `DATABASE_URL` env var for both, configured per environment

### Auth Cookie Policy (Cross-Site)
- When frontend and backend are on different sites (e.g., `storage.googleapis.com`, custom domains), session cookies must use `SameSite=None` and `Secure`.
- Maintain a regression test asserting Google OAuth callback sets cross-site cookie flags for custom domains.

**Verification Checklist**:
```bash
# Before marking code complete, verify:
[] Code runs locally via run_torusmind.sh
[] No hardcoded http://localhost in production code paths
[] Environment variables documented in .env.example (frontend) and 00_env.sh (deployment)
[] CORS origins include both local and cloud domains
[] API URLs use env vars with sensible defaults
```

### Deployment Script Integration

**P0 Rule**: When adding new environment variables or infrastructure changes during local development, **immediately update deployment scripts**.

**Required Updates** (when applicable):

| Change Type | Files to Update |
|-------------|------------------|
| New env var (non-sensitive) | `gcp_deployment/00_env.sh` |
| New secret/API key | `gcp_deployment/02_secrets_setup.sh` |
| Frontend build config | `gcp_deployment/07_deploy_frontend.sh` |
| Backend runtime env | `gcp_deployment/06_deploy_backend.sh` |
| Database schema change | `gcp_deployment/05_run_migration.sh` (verify alembic revision) |

**Example Workflow**:
```bash
# 1. Add new feature locally that requires VITE_FEATURE_FLAG
echo "VITE_FEATURE_FLAG=true" >> frontend/.env

# 2. IMMEDIATELY update deployment script
vim gcp_deployment/00_env.sh
# Add: export VITE_FEATURE_FLAG="true"

# 3. Document in code review
# PR description must include:
# "🚀 Deployment Change: Added VITE_FEATURE_FLAG to gcp_deployment/00_env.sh"
```

**Failure Mode Prevention**:
- If agent adds env var to `.env` or `.env.example`, it MUST flag for human review with explicit deployment script update instructions.
- User manages actual deployment execution; agent prepares scripts only.

**Testing Strategy**:
```bash
# Simulate cloud environment locally
APP_ENV=production VITE_API_URL=https://api.example.com npm run build
# Should succeed without errors about missing env vars
```

---

## ESLint 9 Flat Config

**Context**: Project uses ESLint 9 with flat config format

**Rules**:
1. Use `eslint.config.js`, not `.eslintrc.*`
2. Import plugins as ES modules
3. Use `tseslint.config()` for TypeScript
4. Define ignores in config, not `.eslintignore`

**Reference**: See `frontend/eslint.config.js`

---

## React Portal Pattern

**Pattern**: Render dropdowns in `document.body` to prevent clipping

**Implementation**:
```typescript
import { createPortal } from 'react-dom'

{isOpen && createPortal(
  <div ref={dropdownRef} style={{ position: 'fixed', zIndex: 9999 }}>
    {/* content */}
  </div>,
  document.body
)}
```

**Rules**:
1. Use `ref` for click-outside detection
2. Calculate position with `getBoundingClientRect()`
3. Use `position: fixed` with calculated coords
4. Set high `z-index` (9999+)

**Reference**: See `frontend/src/components/ColumnHeaderFilter.tsx`

---

## React Query Best Practices

**Context**: Project uses `@tanstack/react-query` for server state

**Rules**:
1. Always provide `QueryClientProvider` in tests
2. Use `queryKey` arrays for cache invalidation
3. Prefer `useMutation` for write operations
4. Use `onSuccess`/`onError` for side effects

**Example**:
```typescript
const mutation = useMutation({
  mutationFn: async (data) => api.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
  },
  onError: (error: unknown) => {
    const msg = (error as ApiError)?.response?.data?.detail
    setError(msg)
  }
})
```

---

## Tooltip Direction Attribute

When implementing tooltips near viewport edges:
- Provide standardized attribute: `data-tooltip-position="below"`
- Global CSS must honor this to flip direction
- Document attribute to prevent ad-hoc padding hacks

---

## Drag-and-Drop Accessibility

When adding drag interactions:
- Expose visible handle with `aria-label`
- Ensure focusability
- Provide keyboard fallback (space to pick up, arrows to move)
- Disable drag gestures while mutations pending
- Enable scrolling for horizontal lists on smaller viewports

---

## Knip False Positives

> **Purpose**: Items flagged by Knip (dead code detection) but intentionally kept.
> **Rule**: Do NOT auto-remove items in this list.

**Before adding to this list:**
1. Verify the item is actually used (`grep -r "ItemName" .`)
2. Document WHY it's a false positive
3. Consider if the item should be removed instead

### API Contract Types
*Used by frontend, defined in backend schemas*

| Item | Location | Reason |
|------|----------|--------|
| `ChatSessionResponse` | `backend/app/schemas/` | Frontend API response type |
| `ChatMessageResponse` | `backend/app/schemas/` | Frontend API response type |

### Form Validation Utilities
*Used in form components*

| Item | Location | Reason |
|------|----------|--------|
| `validateName` | `frontend/src/utils/validation.ts` | Form validation |
| `validateDescription` | `frontend/src/utils/validation.ts` | Form validation |
| `validateBody` | `frontend/src/utils/validation.ts` | Form validation |

### Hooks for Planned Features
*In roadmap, not yet wired*

| Item | Location | Reason |
|------|----------|--------|
| `useTableView` | `frontend/src/hooks/` | Table customization feature (roadmap) |
| `useCreateTableView` | `frontend/src/hooks/` | Table customization feature (roadmap) |

### Theme/Internal Utilities

| Item | Location | Reason |
|------|----------|--------|
| `THEME_COOKIE_NAME` | `frontend/src/` | Theme persistence constant |
| `parseTheme` | `frontend/src/` | Theme parsing utility |

---

## Security Tool False Positives

> **Purpose**: Document security scan findings that are accepted risks or false positives.
> **Rule**: All suppressions must be documented here before adding to tool-specific ignore files.
> **Review**: Quarterly (next: 2026-04-23)

### Checkov - Docker HEALTHCHECK (CKV_DOCKER_2)

**Finding**: Missing HEALTHCHECK instructions in Dockerfiles
**Severity**: MEDIUM
**Status**: ACCEPTED RISK
**Date Added**: 2026-01-23
**Review Date**: 2026-04-23

**Affected Files**:
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-stack-local/backend/Dockerfile`
- `Dockerfile` (root)

**Rationale**:
- Cloud Run provides native health checking via startup/liveness probes configured in deployment manifests
- Local development containers monitored via Docker Compose health checks where needed
- Application exposes `/health` endpoint for external monitoring
- Adding Docker HEALTHCHECK would be redundant with Cloud Run configuration

**Compensating Controls**:
1. Cloud Run startup probes configured in `gcp_deployment/06_deploy_backend.sh`
2. Application-level health endpoints at `/health` (backend) and root (frontend)
3. Monitoring alerts configured for container crashes and restart loops
4. Local development uses `docker-compose` health checks in `docker-stack-local/docker-compose.yml`

**Suppression Method**: Documented here only (no inline suppression to keep Dockerfiles clean)

---

### GitLeaks - Historical Secrets

**Finding**: GCP API key detected in git history
**Severity**: HIGH (historical only)
**Status**: REMEDIATED
**Date Added**: 2026-01-23
**Resolution Date**: 2026-01-23

**Details**:
- **Secret**: `REDACTED_GCP_KEY` (redacted in git history)
- **Commit**: a0f5166733e9261694960798ba120b12da0fdef0 (2025-11-23)
- **Files**: `activate_torusmind_gcp.sh`, `FINAL_STATUS.md`

**Resolution**:
1. ✅ Git history rewritten using `git filter-repo` to remove naked key
2. ✅ Key rotated by user (handled externally)
3. ✅ All secrets moved to GitHub Secrets + GCP Secret Manager
4. ✅ `activate_torusmind_gcp.sh` updated to load from `~/.torusmind_secrets` (not tracked)

**Prevention**:
- Pre-commit hooks with GitLeaks installed (`.pre-commit-config.yaml`)
- CI security scans on every PR (`.github/workflows/security-scan.yml`)
- `.gitleaksignore` configured for test fixtures and documentation

---

### GitLeaks - Documentation References

**Finding**: Security reports reference redacted secrets for documentation purposes
**Severity**: INFO
**Status**: ACCEPTED (intentional)
**Date Added**: 2026-01-23

**Affected Files**:
- `Documentation/QA & Testing Methodology/security_findings_log.md`
- `Documentation/QA & Testing Methodology/STATIC_ANALYSIS_REPORT_*.md`

**Rationale**:
- These files document security findings and reference redacted secrets for audit trail
- Secrets are already removed from actual codebase
- Documentation is essential for compliance and team awareness

**Suppression Method**: Added to `.gitleaksignore` with pattern matching

---

## MCP & Agentic Layer (Future)

> **Status**: Planning phase. Rules below apply when implementing MCP endpoints.

### MCP Endpoint Design
1. **API-first**: Define OpenAPI spec before implementation
2. **Stateless design**: No session state in memory; persist to database
3. **Idempotency**: All write operations must be idempotent with request IDs
4. **Rate limiting**: Include rate limit headers in all responses
5. **Structured errors**: Use consistent error schema across all endpoints

### Agent Memory Integration
- Memory blocks must have unique identifiers
- Support soft-delete for audit trail
- Include embedding field (nullable) for future vector search
- All timestamps in UTC with trailing `Z`

### MCP Testing
- Mock LLM calls in unit tests
- Use deterministic test data (no random UUIDs in tests)
- Test timeout and retry behavior explicitly
