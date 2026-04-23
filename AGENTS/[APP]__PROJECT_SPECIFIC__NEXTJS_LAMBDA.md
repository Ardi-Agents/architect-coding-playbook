# Appendix: Project-Specific Rules — Next.js + AWS Lambda + Supabase

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: This project only (TypeScript / Next.js App Router / AWS Lambda / Supabase Postgres)
>
> **⚠️ TEMPLATE NOTE**: This is a **sibling template** to [`[APP]__PROJECT_SPECIFIC.md`](./[APP]__PROJECT_SPECIFIC.md) (Python / FastAPI). When copying the AGENTS framework to a TypeScript project, use *this* file as your starting point instead — replace the sample content with your own stack, commands, and known false positives.

---

## Why a Separate TypeScript/Lambda Template

Agents behave better when their project-specific rules are written in the idioms of the stack they're editing. Telling a Next.js agent "use Alembic" produces either confusion or cargo-culted Python suggestions. This appendix exists so TypeScript + serverless teams can adopt the playbook without first translating FastAPI and Poetry conventions into their world. The content mirrors the Python/FastAPI template section-for-section, so either template is a drop-in replacement for the other based on your stack.

The kernel (`AGENTS.md`) and the other appendices are stack-agnostic; only the project-specific file needs to match your ecosystem.

---

## Current Project: (your project name)

Replace the sections below with your project's specifics — tech stack, scripts, deployment conventions, and linter/security suppressions.

---

## Environment Setup

### Package management
- Use `pnpm` + workspace protocol. Lock file (`pnpm-lock.yaml`) is the single source of truth.
- Add or remove packages via `pnpm add` / `pnpm remove`. Version-locked packages require explicit approval to change (P0).
- Prefer `pnpm dlx` over `npx` — it respects the workspace's registry and avoids a second resolution layer.
- Monorepo: use Turborepo (`turbo.json`) or Nx for task orchestration. Cache-aware build/test pipelines only — no ad-hoc `pnpm -r run` loops in CI.

### Local dev server
- `pnpm dev` from repo root starts all workspaces in parallel (Turbo `dev` task, persistent, cache-off).
- For local Lambda development, prefer **SST Dev** (live-reload via IoT proxy, <10ms hot reload) over `serverless-offline`. Both are acceptable; pick one per project and commit.
- Do not start multiple dev servers on the same port — check `lsof -i :3000` before assuming a failure is from your change.

### E2E testing
- All end-to-end runs must execute the project's canonical bootstrap script (`pnpm e2e` or similar that starts the stack, seeds the DB, and runs the suite).
- Verify the full stack boots after any Lambda handler or Supabase migration change. A green unit test suite does not substitute for a green E2E run when you've touched auth, RLS, or a shared package.

### Database migrations
- Use Drizzle Kit (`drizzle-kit generate`, `drizzle-kit migrate`) or Prisma Migrate. Pick one per project.
- Every schema change ships three artifacts in the same PR: the migration file, the updated ORM schema/types, and updated seed fixtures.
- Verify the migration applies cleanly against a fresh local DB (`pnpm db:reset && pnpm db:migrate`) before marking the task complete.
- Document applied migrations in the PR summary (migration file path + what it does).

### Unit/integration test invocation
- Prefer `pnpm --filter <package> test` (workspace-scoped) over bare `vitest` — it ensures the right TS config and aliases resolve.
- Integration tests that touch Supabase must use a **separate test schema or test DB**, never the dev DB.

---

## Next.js App Router Conventions

### Route handler order
Next.js App Router does not suffer the FastAPI "dynamic route consumes literal" problem because routes are file-system-based. But **middleware matchers** and **catch-all routes** can still swallow siblings. Enforce:

```
app/
├── api/
│   ├── health/route.ts            # literal, specific
│   ├── users/
│   │   ├── route.ts               # collection
│   │   ├── stats/route.ts         # literal static — MUST live beside [id]
│   │   └── [id]/route.ts          # dynamic — narrower than catch-all
│   └── [...slug]/route.ts         # catch-all — last resort, rarely needed
```

**Smoke test after route changes**:
```bash
curl http://localhost:3000/api/users/stats    # expect 200
curl http://localhost:3000/api/users/abc-123  # expect 200
```

If `/stats` returns a UUID-validation error, you've got a catch-all earlier in the chain eating it. Check `middleware.ts` matchers and any `[...slug]` route.

### Server vs client component split (MANDATORY)
- Server components **by default**. Only add `'use client'` when the file actually needs it.
- `'use client'` is required for anything that touches: React hooks (`useState`, `useEffect`, `useRef`), browser APIs (`window`, `localStorage`, `IntersectionObserver`), form libraries, drag-and-drop, or interactive charts.
- Data fetching: server components use `fetch` with Next.js cache tags + `React.cache()`; client components use TanStack Query.
- Server Actions (`'use server'`) are allowed for mutations but **must** validate input with Zod and check auth with `requireUser()` as the first operation.

### State separation rule
- **Server state** (data from your API/DB) → TanStack Query. Never mirror into Redux.
- **UI/client state** (sidebar open, active tab, modal state, drag-in-progress) → Redux Toolkit or Zustand.
- Mixing the two is the #1 source of stale-data bugs in this stack. If you find server data in Redux, migrate it to TanStack Query with optimistic updates.

---

## API Layer Conventions (Next.js routes + Lambda handlers)

### Error handler HOF (MANDATORY)
Wrap every route handler with `withErrorHandler` so unhandled throws map to typed HTTP responses instead of 500s.

```typescript
export const GET = withErrorHandler(async (request, { params }) => {
  const user = await requireUser()
  const { id } = await params // Next.js 15: params are Promises
  const data = await getResource(id)
  if (!data) throw new NotFoundError('Resource not found')
  return successResponse(data)
})
```

### Typed error hierarchy (MANDATORY)
Use named error classes, not generic `Error`:
- `UnauthorizedError` → 401
- `ForbiddenError` → 403
- `NotFoundError` → 404
- `BadRequestError` → 400
- `ValidationError` → 422
- `ConflictError` → 409
- `RateLimitError` → 429
- `InternalServerError` → 500

Never rely on string matching (`if (err.message.includes('unauthorized'))`) to decide status codes. It silently breaks when error text changes.

### API client singleton
All client-side calls go through a singleton with built-in retry, token management, and structured error parsing:

```typescript
const data = await api.get<ResponseType>('/resources')
await api.post<ResponseType>('/resources', body)
```

Never use raw `fetch()` in client code. Raw fetch loses auth headers, retry, and error typing — every bug in this category costs an hour of debugging.

---

## Frontend Type Alignment with Backend Schemas

### Locations
- **Backend**: shared types package (`packages/types/*.ts`) — Zod schemas as source of truth.
- **Frontend**: imports from the same types package — no duplicated interfaces.

### Generation from Zod
```typescript
// packages/types/src/user.ts
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>
```

The Zod schema is the source of truth. Frontend and backend both import `User`. Drift is impossible when they share one file.

### Regression check
If the frontend gets a 400/422 it didn't expect:
```bash
rg "UserSchema" packages/types/
rg "UserSchema" apps/web/
```
Compare the field list on both sides. Nine times out of ten the schema evolved and a consumer didn't update.

### TypeScript conventions
- Prefer `ReactNode` over `JSX.Element` in component return types. `JSX.Element` depends on the global `JSX` namespace, which is absent under the modern runtime without `jsxImportSource` — leading to `TS2503 Cannot find namespace 'JSX'` errors in server builds. `ReactNode` has no such dependency.
- `params` and `searchParams` are **Promises** in Next.js 15+ App Router. Always `await` them.
- Use `satisfies` over explicit typing for literal objects that should keep their narrow types — `const config = {...} satisfies AppConfig`.

---

## Environment Awareness & Deployment

**P0 rule**: Code must work in both local dev and cloud deployment without manual intervention.

### Common pitfalls
1. **Hardcoded localhost URLs**:
   - ❌ `const API_URL = 'http://localhost:3000'`
   - ✅ `const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'`
   - ✅ In production, **fail fast** if the env var is missing rather than silently falling back.

2. **Missing CORS origins for staging/production**:
   - ❌ `allowOrigin: 'http://localhost:3000'` hardcoded
   - ✅ `allowOrigin: getCorsOrigins()` — utility that returns the right list per `NODE_ENV` / `APP_ENV`.
   - Lambda and API Gateway both need the list. Keep one source of truth.

3. **HTTP vs HTTPS scheme detection**:
   - API Gateway and CloudFront inject `X-Forwarded-Proto`. Use this, not `request.url`, for redirect/signed-URL generation.
   - Applied conditionally: trust proxy headers in production, not in local dev.

4. **Database connection strings**:
   - Local: Supabase local stack via Docker (`supabase start`).
   - Cloud: Supabase shared pooler (pgBouncer, port 6543, transaction mode, `prepare: false`). Do not use port 5432 in Lambda — connection exhaustion is guaranteed.
   - `DATABASE_URL` env var reads correctly in both environments.

### Environment validation at boot (MANDATORY)
Every process — web, lambda, worker — validates its env at import time:

```typescript
// packages/env/src/index.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
```

Failing at import beats failing on the first request. Users never see a broken request that should have been a failed deploy.

### Auth cookie policy
- **Cross-site cookies** (frontend and backend on different origins): `SameSite=None; Secure`.
- **Same-site**: `SameSite=Lax`.
- Never `SameSite=Strict` on auth flows — it breaks OAuth callbacks.
- Maintain a regression test asserting the cookie flags your auth provider sets on the OAuth callback.

---

## Deployment Script Integration

**P0 rule**: When adding env vars or infrastructure config during local dev, **update deployment artifacts in the same PR**.

| Change | Files to update |
|--------|-----------------|
| New env var (non-sensitive) | `.env.example`, Vercel env config, Pulumi/CDK/Terraform variable file |
| New secret / API key | AWS Secrets Manager definition, IAM policy granting read access to the Lambda |
| Frontend build config | Vercel project env + `next.config.ts` |
| Lambda runtime env | Pulumi/CDK Lambda function definition |
| DB schema change | Migration file + `drizzle-kit generate` output + CI migration step |

**Example PR checklist entry**: `🚀 Deployment change: added VITE_FEATURE_FLAG to Vercel env + Pulumi variable file`.

If the agent adds an env var to `.env` without touching the deployment artifacts, that is a bug. Flag it explicitly in the PR.

---

## Testing Priority Stack

**TDD-first**. Order of preference:

1. **Vitest** — unit tests for pure functions, Zod schemas, scheduling logic, utility math. Fast; deterministic fixtures only.
2. **React Testing Library** — component integration tests. Test behavior, not implementation. Never `querySelector`.
3. **Supertest** — Lambda handler and API-route integration tests. Hit real HTTP, real (test-schema) DB.
4. **Playwright** — E2E for critical user journeys only. Slow, expensive; reserve for golden paths.

### Deterministic test data (P1)
Hardcoded UUIDs only:
```typescript
// ❌ user_id: crypto.randomUUID()
// ✅ user_id: '00000000-0000-0000-0000-000000000001'
```
When a test fails, you want to paste the UUID into psql and see the row. Random UUIDs rob you of this.

---

## ESLint Flat Config

Project uses ESLint 9 flat config (`eslint.config.ts` or `.js`). Rules:
1. No `.eslintrc.*` files. Legacy configs are ignored and create confusion.
2. Plugins as ES modules: `import tseslint from 'typescript-eslint'`.
3. Use `tseslint.config(...)` for type-aware TS rules.
4. Ignores live inside the config, not in a separate `.eslintignore`.

---

## React Query Best Practices

1. One `QueryClient` per app, wrapped by `QueryClientProvider` at the layout root.
2. Tests providing components that call `useQuery` **must** wrap with `QueryClientProvider` — a forgotten provider is the #1 cause of "hook called outside component" test failures.
3. Query keys are arrays, not strings: `['users', userId]`.
4. Invalidate after mutations:
   ```typescript
   useMutation({
     mutationFn: api.createUser,
     onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
   })
   ```
5. Optimistic updates: use `onMutate` / `onError` to roll back — never trust an unconfirmed success state to persist.

---

## Portal Pattern for Dropdowns / Menus

Render dropdowns and floating UI in `document.body` to escape `overflow: hidden` ancestors:

```typescript
import { createPortal } from 'react-dom'

{isOpen && createPortal(
  <div ref={dropdownRef} style={{ position: 'fixed', zIndex: 9999 }}>
    {/* content */}
  </div>,
  document.body,
)}
```

Rules:
- Use `ref` + `useEffect` for click-outside detection.
- Position via `getBoundingClientRect()` on the trigger.
- `position: fixed` with calculated coords, not `absolute`.
- `z-index: 9999+`. Document the ceiling in a shared constant.

---

## Knip False Positives

> Maintained list of items Knip flags as dead code but that we intentionally keep.

**Before adding an entry**: verify with `rg "<ItemName>" .` that the item is actually used. If it's truly dead, remove it rather than suppressing.

### API contract types (used by frontend consumers)
| Item | Location | Reason |
|------|----------|--------|
| _Replace with your exports_ | `packages/types/src/*` | Consumed by HTTP client types |

### Form validation utilities
| Item | Location | Reason |
|------|----------|--------|
| _Replace with your exports_ | `apps/web/src/utils/validation.ts` | Used in form components |

### Hooks for planned features
| Item | Location | Reason |
|------|----------|--------|
| _Replace with your exports_ | `apps/web/src/hooks/` | Roadmap, not yet wired |

### Theme / internal utilities
| Item | Location | Reason |
|------|----------|--------|
| _Replace with your exports_ | `apps/web/src/` | Theme persistence constants |

Review this list quarterly. Items that stay "planned" for >2 quarters should either be wired up or deleted.

---

## Security Tool False Positives

> Accepted risks or confirmed false positives from security scanners (Trivy, Checkov, GitLeaks, Semgrep).

Each entry must document: finding, severity, status, date added, review date, rationale, and compensating controls. Do not add inline suppressions (`// trivy:ignore`) — document here instead so the list is auditable in one place.

### Checkov — Missing Dockerfile HEALTHCHECK (CKV_DOCKER_2)
**Severity**: MEDIUM | **Status**: ACCEPTED | **Review**: quarterly

**Rationale**: Lambda and serverless Next.js deployments do not use container health checks — the platform's own probes provide equivalent coverage. If your project ships containers (ECS, Fargate, App Runner), remove this suppression and add real `HEALTHCHECK` instructions.

### GitLeaks — Documentation references to redacted secrets
**Severity**: INFO | **Status**: ACCEPTED

**Rationale**: Security reports and incident postmortems reference historical secret patterns for audit trail. Real secrets are already rotated and removed from git history. Suppress via `.gitleaksignore` pattern matching on the documentation paths.

Review this list quarterly. Accepted risks that stay accepted for >4 quarters should be re-evaluated.

---

## MCP & Agentic Layer

> **Status**: Describe MCP servers this project hosts or consumes.

### MCP endpoint design
1. **API-first**: define the OpenAPI spec (or MCP schema) before implementation.
2. **Stateless**: no session state in process memory. Persist to DB or an external store.
3. **Idempotent writes**: every write accepts a `requestId` and deduplicates.
4. **Rate limits**: include `X-RateLimit-*` headers on all responses.
5. **Structured errors**: consistent JSON error schema across all endpoints.

### Agent memory integration
- Memory blocks have unique stable IDs.
- Soft delete only (audit trail preservation).
- Embedding field is nullable — populate lazily for future semantic search.
- **All timestamps in UTC with trailing `Z`**. Tests assert the exact format.

### MCP testing
- Mock LLM calls in unit tests. Record a few realistic fixtures per model family.
- Deterministic test data (no `crypto.randomUUID()`).
- Explicitly test timeout and retry behavior — these fail silently in production until they don't.

---

## Glossary (stack-specific)

| Term | Definition |
|------|------------|
| **Server component** | Next.js component rendered on the server, no `'use client'`, no browser APIs. |
| **Client component** | Next.js component with `'use client'`, runs in the browser bundle. |
| **Server state** | Data owned by the backend (DB, API). Managed by TanStack Query on the client. |
| **UI state** | Ephemeral browser-only state (modals, sidebars, drags). Managed by Redux / Zustand. |
| **RLS** | Row-Level Security — Postgres policies enforced at the query layer. Mandatory in this stack. |
| **Service role key** | Supabase key that bypasses RLS — **server-side only, never exposed to the browser bundle**. |
