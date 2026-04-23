# Appendix: Production Patterns — Top Ten

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Ten patterns that recur in production TypeScript/Node services

---

## Why This Appendix Exists

Every production backend accumulates the same ten or so patterns regardless of domain: a way to wrap route handlers for consistent errors, an API client that retries intelligently, a way to fail fast at startup if config is wrong, a queue for background work that outlives the HTTP request. Skip one and the codebase develops the problem that pattern was designed to prevent — inconsistent error responses, swallowed failures, flaky tests, or user-facing 500s that should have been config errors at deploy time.

This appendix collects ten of them, shapes only, no library lock-in. They're the "you will write these eventually; here's what they should look like" reference. Hybrid tone: each pattern starts with what problem it solves, then drops into dry-directive rules.

Most are shown in TypeScript/Node because that's the majority stack where this playbook gets adopted; the ideas apply cleanly to Python/FastAPI too and the differences are mostly syntactic.

---

## 1. Error-Handler HOF (`withErrorHandler`)

**Problem**: unhandled throws in a route handler result in a 500 with an inconsistent payload; ad-hoc try/catch in every handler drifts.

**Shape**: wrap every route with a higher-order function that catches, maps to typed HTTP errors, and emits a standard response envelope.

```typescript
export const GET = withErrorHandler(async (request, { params }) => {
  const user = await requireUser()
  const { id } = await params
  const resource = await getResource(id)
  if (!resource) throw new NotFoundError('Resource not found')
  return successResponse(resource)
})
```

**Rules**:
- Every route handler goes through the HOF. No exceptions.
- The HOF knows how to map each typed error class (`NotFoundError` → 404 etc.) to the wire protocol.
- The HOF logs with context — route, method, user ID (truncated), error class, error code. No stack traces in production responses.
- Development mode returns full error detail; production returns generic `"An unexpected error occurred"` for unmapped errors.

---

## 2. Typed Error Hierarchy

**Problem**: generic `Error` and string matching (`if (err.message.includes('unauthorized'))`) makes HTTP status mapping fragile.

**Shape**: a class per HTTP failure mode.

```
UnauthorizedError    → 401
ForbiddenError       → 403
NotFoundError        → 404
BadRequestError      → 400
ValidationError      → 422 (carries field errors)
ConflictError        → 409
RateLimitError       → 429
InternalServerError  → 500
```

**Rules**:
- Every `throw` in the API path uses one of these. Never `throw new Error('unauthorized')`.
- `ValidationError` carries structured field errors: `{ fields: [{ path: 'email', message: '...' }] }`.
- Never include stack traces, SQL errors, or internal paths in production responses.
- The error-handler HOF (pattern 1) knows these by class, not by string.

---

## 3. API Client Singleton with Retry

**Problem**: raw `fetch()` in client code loses auth headers, retry on transient failures, error typing, and request deduplication — each forgotten in a different place.

**Shape**: one `api` object; everything goes through it.

```typescript
const data = await api.get<ResourceType>('/resources')
await api.post<ResourceType>('/resources', { title: 'New' })
const stream = await api.stream('/chat', { message: 'Hello' })
```

**Rules**:
- One singleton per app. Export it from `packages/api-client` (or equivalent).
- Default 3 attempts with exponential backoff. Retry 500, 502, 503, 504, 429. Never retry 4xx (other than 429).
- Attaches auth headers automatically from a central session source.
- Parses the standard response envelope (pattern 1's output) into typed results.
- Never use `fetch()` directly in app code. Enforce via lint rule or codereview.

---

## 4. Environment Validation at Boot

**Problem**: an env var is misspelled or missing; the first request fails with a cryptic runtime error; users see a 500 before ops sees a deploy error.

**Shape**: validate the whole env at import time with a schema.

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  NEXT_PUBLIC_API_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export const env = envSchema.parse(process.env)
// Module import throws immediately on bad config.
```

**Rules**:
- One `env` module per app, imported early in the bootstrap path.
- Fail fast on bad config. Do not degrade silently.
- Defaults for *development-only* optionals; required for production secrets.
- Document every var in `.env.example` in the same PR that introduces it.

---

## 5. Worker Queue for Background Work

**Problem**: long-running work in the request path causes timeouts, retries are impossible, scaling tightly couples request throughput to work throughput.

**Shape**: enqueue a job; a separate worker process consumes. Most languages have a mature client (BullMQ, Sidekiq, Celery, SQS+Lambda, pg-boss).

**Rules**:
- Every job has: a unique ID, an idempotency key, a max-attempts count, a backoff strategy, and a dead-letter destination after max attempts.
- Jobs are **idempotent**. Executing twice produces the same end state. Design the job; don't rely on "we probably won't retry it".
- Workers run in a separate process (or Lambda), separate deploy lifecycle. Enables independent scaling and rolling restarts.
- Observe: queue depth, oldest pending job, job success/failure rate per job-type, retry distribution.
- Alert on: queue depth growth, dead-letter arrivals, single job-type dominating latency.

---

## 6. Structured Logging with PII Redaction

**Problem**: string logs turn into regex archaeology; unfiltered logs leak PII; debug-level logs dominate disk in production.

**Shape**: JSON logs with mandatory fields and source-side redaction.

```typescript
logger.info('user.created', {
  user_id: truncate(user.id),           // '00112233...' not full UUID
  email: maskEmail(user.email),         // 'a***@example.com'
  session_id: ctx.sessionId,
  request_id: ctx.requestId,
})
```

**Rules**:
- Every log line is JSON. No `console.log` in production paths.
- Mandatory fields: `timestamp`, `level`, `message`/`event`, `service`, `request_id` (when applicable).
- **Redact at source** — masking tokens, emails (before `@`), long numeric IDs. Downstream consumers can't un-leak.
- Four levels: `debug`, `info`, `warn`, `error`. Don't invent more.
- Dev: human-readable, colored. Prod: JSON to stdout (the log aggregator picks it up).

---

## 7. LLM Structured Output

**Problem**: parsing free-form LLM responses with regex or "best-effort JSON extraction" is a stream of silent failures.

**Shape**: use the provider's structured-output feature (`response_format`, `responseSchema`, JSON mode, tool-use), validate the response with a schema, retry on schema-invalid responses.

```typescript
const schema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()).max(5),
})

const response = await llm.generate({
  prompt,
  responseFormat: { type: 'json_schema', schema: schemaToJsonSchema(schema) },
})
const parsed = schema.safeParse(response.content)
if (!parsed.success) {
  // retry once with the validation errors attached to the prompt
}
```

**Rules**:
- Every LLM call that needs structured output uses provider-native constraint, not "please return JSON".
- Validate with the same schema you gave the model; a valid-looking response can still fail schema edge cases.
- Retry on schema failure at most once, with the validator errors in the retry prompt.
- Log the raw response when validation fails — it's how you discover which schemas the model struggles with.

---

## 8. Soft-Delete Discipline

**Problem**: hard `DELETE` destroys audit trail, breaks foreign-key references, and makes "undo" impossible.

**Shape**: mark with a `deleted_at` timestamp; never `DELETE FROM`.

**Rules**:
- Every mutable entity has a `deleted_at TIMESTAMP NULL` column.
- Default list queries include `WHERE deleted_at IS NULL`. Make it a helper in your ORM layer so nobody forgets.
- Delete operations set `deleted_at = now()` and return the row as if soft-deleted.
- Unique constraints that should ignore deleted rows: partial indexes (`UNIQUE (email) WHERE deleted_at IS NULL`).
- Periodic hard-purge jobs remove very old soft-deleted rows per retention policy — but this is a *separate* job with explicit approval, never an accident of a feature.

---

## 9. Row-Level Authorization (RLS-style)

**Problem**: "trust the application layer" auth means one bug leaks every user's data. Especially painful on multi-tenant systems.

**Shape**: enforce access at the DB or data-access layer; the application layer is a second check, not the only check.

**Rules**:
- In Postgres: enable RLS on every user-scoped table. Separate `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies.
- Frontend uses an anonymous/limited key; RLS enforces `user_id = current_user_id()`.
- Backend services that bypass RLS (using a service-role key) do so *deliberately*, log the reason, and scope the action tightly.
- Tests verify cross-user isolation: user A cannot read, modify, or delete anything belonging to user B — at the DB level, not just the API level.

For non-Postgres stacks: similar discipline via an access-control layer in the repository/data-access pattern. The principle is the same: the application layer is not the only thing between a malicious request and another user's data.

---

## 10. Circuit Breaker for External Dependencies

**Problem**: an upstream goes down; every request piles up on its slow failures; your service's latency and error rate explode; cascades take down the rest of your system.

**Shape**: wrap every external dependency (LLM, payment, email, partner API) in a circuit breaker. After N failures in a window, open the circuit — fast-fail subsequent calls for a cooldown period, then half-open to probe recovery.

**Rules**:
- Sensible defaults: 5 failures in 30s opens the circuit; 60s cooldown; half-open probes with the next single request.
- Open circuit returns a typed error (your `ServiceUnavailableError` or similar) that the error-handler HOF (pattern 1) maps to 503.
- Metric: circuit state per dependency. Alert when something is open for >5 minutes.
- Never silently swallow open-circuit errors. The user should see a graceful "try again in a moment", and logs should record every open/close transition.
- Pair with an integration test that exercises the degraded-dependency path directly so you know the breaker works before an incident hits.

---

## Integration with Other Appendices

- `[APP]__PROJECT_SPECIFIC__*.md` — stack-specific implementations (which library, which imports).
- `[APP]__API_DESIGN.md` — the error-handler HOF and typed errors are the wire-level contract.
- `[APP]__STATIC_ANALYSIS.md` — lint rules enforce "no raw fetch", "no console.log", "no bare throw" where applicable.
- `AGENT_OBSERVABILITY.md` — structured logs + metrics flow into the same substrate agents observe.

---

## Anti-Patterns

- **Mixing patterns**: a raw `fetch()` call next to `api.get()` in the same file. Pick one; enforce in review.
- **Partial typed errors**: new `UnauthorizedError` in some routes, bare `throw new Error('unauthorized')` in others. Inconsistent errors turn into inconsistent clients.
- **Env validation only for required vars**: optional vars with no defaults also fail at runtime — validate with sensible defaults.
- **Queue without idempotency**: retries duplicate work; duplicate work corrupts state.
- **Circuit breaker without observability**: a silent breaker is worse than no breaker. Always expose the state.
- **Structured logs that aren't actually structured**: `logger.info('user_id=' + id)` defeats the point. Log the key, not a pre-formatted string.

---

## Checklist: Pattern Adoption

- [ ] Every API route is wrapped in the error-handler HOF
- [ ] A typed error hierarchy exists and is the *only* way to throw to the wire
- [ ] All client HTTP calls go through the API client singleton with retry
- [ ] Env schema validates at boot; missing vars fail fast
- [ ] Long-running work runs in a worker queue with idempotent jobs
- [ ] Logs are JSON and PII is redacted at source
- [ ] LLM calls use structured output + schema validation + single retry
- [ ] Every mutable table has `deleted_at`; no `DELETE FROM` in app code
- [ ] Row-level authorization is enforced at the DB / data-access layer
- [ ] External dependencies are behind circuit breakers with observable state
