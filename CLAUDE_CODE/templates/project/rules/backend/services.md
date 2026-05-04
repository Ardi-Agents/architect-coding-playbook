# Backend Services — [PROJECT_NAME]

> **Location:** `.claude/rules/backend/services.md`
> **Loaded:** When working on files under `backend/`
> **Source of truth:** [`@AGENTS/[APP]__IMPLEMENTATION.md`](../../../AGENTS/%5BAPP%5D__IMPLEMENTATION.md)

---

## Service Layer Boundaries

- Services hold business logic. They do not handle HTTP, queue messages, or DB connections directly.
- Services accept and return domain objects, not request/response shapes.
- API/handler layer translates HTTP ↔ service calls; repository layer translates services ↔ persistence.

## Repository Pattern

- One repository per aggregate. The repository owns the SQL/ORM calls for its aggregate.
- Repository methods are noun-based and return domain objects: `userRepo.findById(id) -> User | null`.
- Never leak ORM types out of the repository. Higher layers see only domain types.

## Transactions

- Transactions are scoped to a single business operation. Open at the service-method boundary, never inside a loop.
- Pass the transaction (or unit-of-work) handle through; don't grab a fresh connection mid-transaction.
- Read-only methods don't need a transaction — don't open one.

## Error Handling

- Throw typed domain errors (`UserNotFoundError`, `InsufficientFundsError`), not bare `Error` or HTTP exceptions.
- Translate to HTTP at the API layer only. Same error → same status code, every time.
- Never swallow errors silently. If you catch, either re-throw, log with full context, or convert to a domain error.

## Logging

- Log at boundaries: request entry, downstream call, transaction commit, error.
- Every log line carries `request_id`, `user_id` (if known), and the operation name.
- Don't log secrets, tokens, or PII unless redacted.

## External Calls

- Wrap every external HTTP/DB/queue call in a timeout + retry-with-backoff helper.
- Idempotent operations only retry; non-idempotent require an idempotency key.
- Circuit-break dependencies you can't trust — fail fast on cascading outages.

## Concurrency

- A service method is either pure (no side effects) or has explicit ordering guarantees.
- Use database-level locks (`SELECT ... FOR UPDATE`) or optimistic concurrency tokens for state mutations.
- Never sleep-and-poll; use blocking primitives.

---

> Edit to match this project's actual backend conventions. Delete sections that don't apply.
