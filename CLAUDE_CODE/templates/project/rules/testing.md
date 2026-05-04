# Testing — [PROJECT_NAME]

> **Location:** `.claude/rules/testing.md`
> **Scope:** Testing conventions for this project
> **Source of truth:** [`@AGENTS/[APP]__STATIC_ANALYSIS.md`](../../AGENTS/%5BAPP%5D__STATIC_ANALYSIS.md) — Test Coverage Requirements

---

## Test Frameworks

- **Backend:** [pytest / unittest / jest]
- **Frontend:** [vitest / jest / playwright]
- **E2E:** [playwright / cypress]

## Test Commands

```bash
# Unit tests (backend)
[YOUR_BACKEND_TEST_CMD]   # e.g., poetry run pytest tests/

# Unit tests (frontend)
[YOUR_FRONTEND_TEST_CMD]  # e.g., npm test

# E2E tests
[YOUR_E2E_TEST_CMD]       # e.g., npm run test:e2e

# Coverage
[YOUR_COVERAGE_CMD]       # e.g., poetry run pytest --cov=app
```

## Coverage Targets

| Component | Minimum Coverage |
|---|---|
| Models | 100% |
| Schemas | 100% |
| Repositories | 95% |
| Services | 85% |
| API endpoints | 90% |
| Overall | 80% |

> Adjust per project. See `AGENTS/[APP]__STATIC_ANALYSIS.md` for the methodology.

## Test File Pairing

- Every source module has a corresponding test file.
- Naming: `<module>.test.ts` or `test_<module>.py`.
- New modules without tests fail PR review.

## What to Test

- **Unit tests:** Pure logic, transformations, edge cases.
- **Integration tests:** Database queries, external service mocks.
- **E2E tests:** User-facing flows end-to-end (sparingly — they're slow).

## Mocking Conventions

- Mock **external** services (LLM APIs, third-party HTTP, payment providers).
- Do **not** mock your own service layer — use a test database.
- Use [factory_boy / fishery / faker] for test data generation.

## Test Discipline

- **Never delete failing tests** without explicit user direction.
- **Never weaken assertions** to make tests pass — fix the code or fix the test deliberately.
- **Never commit `.skip` or `.only`** without a tracking issue.

> See [`@AGENTS.md`](../../AGENTS.md) — P1 Testing discipline.

---

> Edit to match this project's actual testing approach.
