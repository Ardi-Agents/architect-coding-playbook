# Appendix: Implementation Guidelines

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 2.0 | **Updated**: 2026-05-08
>
> **Owns**: TDD discipline, scope enforcement, error recovery, technical-debt management, pre-/post-edit lifecycle ritual, per-track test framework + database conventions, conditional auth protection.
>
> **Fires when**: writing new code, fixing bugs, reviewing test coverage, refactoring, "before I edit" / "after I edit", "what's the test pattern here?", "how do migrations work?".

---

## Test-Driven Development (TDD)

### Core Requirements (cross-track)

- **Write or enhance tests as you implement**
- **Proper testing after non-trivial changes** (>50 lines OR >2 files)
- **Comprehensive tests after major changes**
- **Regression tests first**: Before fixing a bug, write the test that reproduces the failure.
- **Acceptance test, not shape test**: Per kernel Rule #11, every unit-of-work plan declares the specific assertion that proves it landed against real data — not just file pairing.
- **Prod-only URL/redirect bugs**: Capture `curl -sI` headers for canonical + non-canonical routes (e.g. `/path` vs `/path/`) before/after, and add a regression test for any redirect/auth behavior you change.

### Deterministic Test Data (P1, cross-track)

Use **hardcoded, static data** for all tests:

- ❌ **Bad**: random UUIDs, random timestamps (hard to debug)
- ✅ **Good**: predictable identifiers (`00000000-0000-0000-0000-000000000001`), fixed timestamps

**Exception**: Integration tests may use factories with predictable seeds.
**Why**: Makes debugging regressions significantly faster.

#### Track: dotnet

> **Depth**: expert.

- **Test framework**: xUnit.v3 (preferred for new projects), xUnit.v2 / NUnit / MSTest acceptable for existing.
- **Test runner**: `dotnet test --solution <name>.slnx` from the workspace root.
  - **Beware Microsoft.Testing.Platform (MTP) flag forwarding** — `--no-build` and `-nologo` get passed through to test executables and break test discovery (xUnit prints help and exits 5). The bare form is the clean form.
- **Deterministic data**: `[InlineData(...)]`, `[MemberData(nameof(...))]`, `[Theory]` for parameterized tests.
- **Fixtures**: `IClassFixture<T>` for expensive per-class setup; `[Collection("Name")]` + `ICollectionFixture<T>` for shared state across test classes.
- **Assertions**: FluentAssertions ≤ 6.12.2 (last MIT release; 7.0+ went commercial under Xceed) OR built-in `Assert.*`.

#### Track: python

> **Depth**: expert.

- **Test framework**: pytest. unittest acceptable for stdlib-only constraints.
- **Test runner**: `pytest tests/ -v` (or `poetry run pytest …` / `uv run pytest …`).
- **Deterministic data**: `@pytest.mark.parametrize(...)` over for-loops; fixed UUIDs / timestamps in fixtures.
- **Fixtures**: `@pytest.fixture(scope="session"|"module"|"function")`; `conftest.py` for shared fixtures.
- **Async**: `pytest-asyncio` with `@pytest.mark.asyncio`, or `anyio` for runtime-agnostic tests.

#### Track: typescript

> **Depth**: expert.

- **Test framework**: vitest (preferred for ESM/Vite stacks); jest (acceptable for legacy).
- **Test runner**: `vitest run` (CI), `vitest` (watch). Per-file: `vitest run path/to/test`.
- **Deterministic data**: fixed object literals; avoid `Math.random()` and `Date.now()` in test inputs.
- **Mocking**: `vi.mock()` (vitest) / `jest.mock()` (jest); prefer dependency injection over module-level mocking when possible.
- **E2E**: Playwright for browser flows, Supertest for HTTP-level API tests.

#### Track: go

> **Depth**: consensus.

- **Test framework**: built-in `testing` package; `testify/assert` or `testify/require` for richer assertions if the team accepts the dependency.
- **Test runner**: `go test ./...` from workspace root; `go test -run TestName ./pkg` for targeted.
- **Deterministic data**: table-driven tests — `tests := []struct{name string; input X; want Y}{...}` then `for _, tt := range tests { t.Run(tt.name, ...) }`.
- **Subtests**: `t.Run(name, func(t *testing.T) {...})` for grouping.
- **Race detection**: include `-race` in CI.

#### Track: rust

> **Depth**: consensus.

- **Test framework**: built-in `#[test]` attribute; `cargo test`.
- **Test runner**: `cargo test` from workspace root; `cargo test --package <name>` for targeted.
- **Deterministic data**: `const`-defined fixtures; avoid `rand` in test inputs without a seeded RNG.
- **Doc tests**: `cargo test --doc` runs examples in `///` doc comments — treat as first-class tests.
- **Property tests**: `proptest` or `quickcheck` (declare seed for reproducibility).
- **Async**: `#[tokio::test]` (or framework-equivalent) for async tests.

### Iterative Protocol (cross-track)

When something fails:

1. **Write/Enhance Test**: Capture the issue
2. **Understand Root Cause**: Debug deeply
3. **Use Reference**: Find last working version, compare with `git diff`
4. **Fix the Issue**: Implement fix
5. **Test & Iterate**: Run tests until passing

### Root Cause Over Symptoms (P1, cross-track)

- **Diagnose root causes**, not symptoms or side-effects
- Avoid blanket or "quick fix" solutions that might hide errors
- Never silently discard, mask, or change user data

**Example**:

- ❌ **Wrong**: API returns 500 → add try/except to catch and return 200
- ✅ **Correct**: API returns 500 → trace error, fix underlying bug, add test

### Smoke Test Updates

- Every new endpoint with self-test path → add to smoke test script

---

## Pre-/Post-Edit Lifecycle Ritual

> **Cross-track concept; per-track structural tool.**

The agent works better with rituals bracketing edits than with free-form rules. Apply this ritual whenever editing a non-trivial file (>20 lines of net change OR core business logic).

### Before the first Edit on a non-trivial file

Orient against the track's structural tool to understand:

- **Callers** — what depends on this code?
- **Implementers** (for interfaces / abstract types) — what concrete types satisfy this contract?
- **Covering tests** — what tests exercise this code path?
- **Blast radius** — if I change this, what else gets recompiled / re-tested?

The ritual prevents the failure mode of editing in isolation and discovering 5+ broken consumers post-build.

### After the editing session

Run, in order:

1. **Build clean** — zero warnings, zero errors (per kernel Rule #10).
2. **Tests pass** — at minimum the covering tests; full suite for non-trivial change.
3. **Structural delta** — re-extract the structural model and check that blast-radius and covering-tests didn't regress against the pre-edit baseline.
4. **Write happy-path AND adversarial tests** for the changed surface — adversarial tests are on the default path, not a bonus round.

### Per-track structural tools

Pointers (full details in `[APP]__TOOL_USAGE.md` § Structural Tooling):

- **dotnet** — Roslyn-based language servers (Visual Studio / Rider / OmniSharp), `Microsoft.CodeAnalysis` APIs for programmatic queries, `dotnet-symbol` for symbol metadata.
- **python** — `pyright` LSP, `jedi`, AST tools (`ast` stdlib, `astroid`).
- **typescript** — `ts-language-server` (TypeScript Language Service), `tree-sitter`.
- **go** — `gopls`, `go/ast` package.
- **rust** — `rust-analyzer`, `syn` crate for proc-macro authors.

If no structural tool is available for the active track, fall back to grep — but document the limitation as a known blind spot.

---

## Scope Boundary Enforcement (cross-track)

### Before Modifying Existing Functionality

1. Document why change is necessary for current milestone
2. If unrelated to current work → **DO NOT MODIFY**
3. Create checkpoint test to verify unrelated systems still work

### Examples

❌ **WRONG**: Adding file upload → refactoring user auth "to be cleaner"
✅ **CORRECT**: Adding file upload → only touch upload-related components

❌ **WRONG**: Fixing status pipeline bug → reformatting entire codebase
✅ **CORRECT**: Fixing status pipeline bug → minimal changes to pipeline code

### Change Impact Testing

After each significant modification:

1. Run targeted tests for modified component
2. Run integration tests for unchanged components
3. Stop immediately if unrelated functionality breaks

---

## Working Component Reference Protocol

**Principle**: When fixing existing code, find last working version first.

### Required Steps

1. Identify last known working commit
2. Use `git show` / `git diff` to compare current vs working
3. Only modify what is broken, preserve what works

### Example Workflow

```bash
# Find when it last worked
git log --all --grep="feature X working"

# Compare current vs working
git diff HEAD abc123def -- path/to/file.<ext>

# Identify minimal change needed
```

❌ **WRONG**: Auth broken → rewrite from scratch
✅ **CORRECT**: Auth broken → `git show` last working → compare → fix only what changed

---

## Step-by-Step Implementation

### Working Principles

- Implement in small, verifiable steps
- Prefer accuracy and correctness over speed
- Rewrite or simplify when patching the current approach would be less clear or less reliable

### Pre-Implementation Checklist

- [ ] Derive detailed requirements from the specification
- [ ] Cross-reference all applicable rules, constraints, and project guidance
- [ ] Assess the current structure against the required outcome
- [ ] Define the validation and verification checklist (with **acceptance assertion**, per kernel Rule #11)
- [ ] Plan cleanup, refactoring, and related updates with the implementation

### State Modeling Guidance

When application logic includes more than two significant UI or workflow states:

- Model state explicitly (typed states, reducers, state handlers, or equivalent patterns)
- Document allowed states, transitions, invariants, and side effects
- Verify that tests cover each state and transition

---

## Database Updates

### Cross-track: Data Model Update Validation

Before relying on a new field, relationship, or structure in application code:

1. Verify the change exists in the target data store or update procedure
2. If missing, create the required migration, transformation, or backfill
3. Record the verification method or command used
4. Document the change in the PR description

### Cross-track: Affected Surface

Validate the change across:

- Application models, entity definitions, or mappings
- Schema/model update scripts or migration procedures
- Repositories, queries, services, and traversal logic
- Test fixtures, mocks, seed data, and example payloads
- API contracts, request/response schemas, and external interfaces

### Per-track migration workflows

#### Track: dotnet

> **Depth**: expert.

- **EF Core**: `dotnet ef migrations add <Name>` → `dotnet ef database update` → for production, `dotnet ef migrations script <prev> <next>` to emit reviewable SQL.
- **Idempotent migrations**: pass `--idempotent` to `migrations script` for re-runnable scripts.
- **Data-only migrations** separate from schema migrations — easier rollback.

#### Track: python

> **Depth**: expert.

- **Alembic** (SQLAlchemy): `alembic revision --autogenerate -m "msg"` → review the generated file (autogenerate is hint, not authoritative) → `alembic upgrade head`.
- **PostgreSQL enum changes**: enums require text conversion in transit (can't modify in-place); document in the migration.
- **Django**: `manage.py makemigrations` → review → `manage.py migrate`.

#### Track: typescript

> **Depth**: consensus.

- **Prisma**: `prisma migrate dev --name <msg>` (dev) → `prisma migrate deploy` (prod). Schema is `prisma/schema.prisma`.
- **Drizzle**: `drizzle-kit generate` → review SQL in `drizzle/` → `drizzle-kit migrate`.
- **TypeORM**: `typeorm migration:generate -n <Name>` → review → `typeorm migration:run`.

#### Track: go

> **Depth**: consensus.

- **golang-migrate**: `migrate create -ext sql -dir db/migrations -seq <name>` → write up.sql + down.sql → `migrate -path db/migrations -database <url> up`.
- **goose**: similar pattern with Go-defined migration functions for complex transforms.

#### Track: rust

> **Depth**: consensus.

- **sqlx**: `sqlx migrate add <name>` → write SQL → `sqlx migrate run`. Uses `migrations/` directory.
- **diesel**: `diesel migration generate <name>` → write up.sql + down.sql → `diesel migration run`.

### Change Verification Checklist

```markdown
Before deploying data model changes:
- [ ] Updated application models, mappings, or entity definitions
- [ ] Created the required migration, transformation, or backfill procedure
- [ ] Updated all affected queries, repositories, services, and traversals
- [ ] Updated test fixtures, mocks, seed data, and example payloads
- [ ] Updated API and data-contract documentation
- [ ] Applied the change in the target environment as required
- [ ] Verified all tests and required checks pass
```

---

## Static Analysis and Code Quality Checks

> Full rules: [AGENTS/[APP]__STATIC_ANALYSIS.md]([APP]__STATIC_ANALYSIS.md)

**Quick Reference**:

- Small edits: run the standard fast checks for the affected code (per track)
- New modules or larger changes: run the full required analysis and type/safety checks
- Pre-commit: run all required checks
- Build clean (per kernel Rule #10): zero warnings, zero errors on the default configuration
- Known tool false positives, suppressions, and exceptions: see `AGENTS/[APP]__PROJECT_SPECIFIC.md`

---

## Error Recovery & Time-Boxing

### Time Limits

| Duration | Action |
|----------|--------|
| <15 min | Active debugging |
| 15-30 min | Document attempts, search for working examples |
| >30 min | Create blocker report, propose alternative |

### Blocker Report Format

```markdown
#### 🚧 Blocker Encountered

**Problem**: [Concise description]

**Attempts Made**:
1. [What tried and result]
2. [What tried and result]

**Current Understanding**: [What you know]

**Proposed Alternatives**:
A. [Approach 1 - pros/cons]
B. [Approach 2 - pros/cons]

**Recommendation**: [Which and why]
```

### Escalation

> See [AGENTS.md → Decision Documentation](../AGENTS.md#decision-documentation) for authoritative escalation triggers.

---

## Technical Debt Management

### Requirements

- Document clearly when building new capability with tech debt
- Record in productization roadmap document

### Entry Format

```markdown
##### [Component Name] - [Brief Issue]
**Priority**: P0/P1/P2
**Current State**: What's implemented now
**Problem**: Why not production-ready
**Needed Improvement**: What needs to change
**Estimated Effort**: S/M/L/XL
**Blocks**: What this blocks
```

### Examples of Tech Debt

- Hard-coded config (should be env vars)
- Missing error handling in edge cases
- In-memory state (should be persisted)
- Synchronous operations (should be async)
- Missing monitoring/logging for critical paths

---

## Workflow Status Integrity

**Principle**: Stuck workflows are bugs. Never apply manual status fixes.

### Required Response to Stuck Workflows

1. **Do NOT manually update status** (hides root cause)
2. **Reproduce in E2E test** first
3. **Implement systematic fix** to underlying pipeline
4. **Verify with full test suite**

### Example

❌ **WRONG**: Transaction stuck → manually update to `COMPLETED`
✅ **CORRECT**:
1. Write E2E test reproducing stuck state
2. Identify why transition failed
3. Fix transition logic
4. Run test suite to verify automatic completion

---

## Authentication System Protection (if present)

> Applies only when the project has authentication. Per the kernel's optional-auth posture, projects without auth skip this section.

### P0 - CRITICAL

- **Never modify auth code unless explicitly requested**
- **Always test auth after ANY backend changes**
- Document auth changes with justification

### Testing per track

> Per-track auth-flow command examples (full guidance in `[APP]__API_DESIGN.md` § Authentication):

- **dotnet**: `dotnet test --filter "Category=Auth"` (xUnit `[Trait]`); smoke-test login endpoint with `curl` against `/api/auth/login` or your equivalent.
- **python**: `pytest tests/test_auth_flow.py -v`; smoke-test with `httpx` or `curl`.
- **typescript**: `vitest run tests/auth/` or `npm test -- auth`; e2e via Playwright with auth fixture.
- **go**: `go test ./auth/...`; smoke-test with `curl` or `httptest`.
- **rust**: `cargo test --package auth` (or filter pattern); smoke-test with `reqwest` integration test.

If your project has no authentication, this entire section is inapplicable — delete it from your instance of this appendix or mark it "N/A".
