# Appendix: End-to-End Harness — Invariant-Driven

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Structuring an E2E test suite that agents (and humans) can trust

---

## Why This Appendix Exists

Most project E2E suites decay the same way: they start as a few happy-path scripts, grow as people discover bugs, accumulate flaky specs, and after a year get grudgingly skipped in CI because "the suite has issues." The fix is almost never "add more tests" — it's **structure**. An E2E harness that names its guarantees, separates happy paths from edges, and asserts business **invariants** rather than UI chrome stays useful for years, even as the product under it changes weekly.

This appendix describes a shape: `expect` + `invariants` + `report`, organized into happy-path scripts and edge-script catalogs, runnable in a single command with machine-readable output an agent can read. It's implementation-agnostic — Node, Python, shell, whatever — but the template directory ships a Node reference.

Use it when: your project has multiple user journeys touching multiple modules, and you need confidence that a change in module A didn't silently break behavior in module B. Skip it when: you have one module and happy-path Playwright plus unit tests cover 95% of the risk.

---

## Three Primitives

### 1. `expect` — assertion library
A small vocabulary of matchers. Not a replacement for your test framework — a thin layer that produces structured failure records instead of thrown exceptions, so the harness can collect and report rather than stop at first failure.

Suggested matchers:

| Matcher | Meaning |
|---------|---------|
| `eq(actual, expected)` | Deep equality |
| `neq(actual, expected)` | Inequality |
| `gt / gte / lt / lte` | Numeric comparisons |
| `range(actual, min, max)` | Bounded numeric |
| `hasLength(collection, n)` | Collection size |
| `includes(collection, item)` | Membership |
| `isUuid(value)` | UUID format |
| `matchesRegex(value, re)` | Regex match |
| `isIsoUtc(value)` | ISO-8601 with trailing `Z` (kernel's UTC contract) |

Each matcher returns `{ passed: bool, hint: string, actual, expected }`, not a throw. The harness accumulates these.

### 2. `invariants` — business-rule checks
The *point* of the harness. An invariant is a statement about the database, cache, external system, or API response that must remain true regardless of the path taken to get there. Examples:

- "No user's total orders equals the sum of their shipped + pending + cancelled orders."
- "Every active subscription has exactly one billing plan."
- "Soft-deleted rows never appear in list endpoints."
- "A reschedule of block B maintains the 48h separation from its neighbors."

Invariants are written once, called from many test scripts. They're your business logic's immune system — they fire when a refactor subtly breaks a rule nobody explicitly asserted.

Each invariant is a function returning a list of `expect` results. The harness treats invariant failures with elevated severity in reports.

### 3. `report` — structured output
The suite emits a machine-readable artifact (JSON is fine) at `playbook-output/run-<timestamp>.json`:

```
{
  run_id: <uuid>,
  started_at: <iso>,
  ended_at: <iso>,
  scripts: [
    {
      name: "01-happy-onboarding",
      assertions: [...],
      invariants: [...],
      duration_ms: N,
      status: "passed" | "failed"
    },
    ...
  ],
  summary: { total: N, passed: N, failed: N, invariant_failures: N },
  snapshot_diff: <path to DB snapshot diff or null>
}
```

Agents read this to answer "what's still broken?" without rerunning the whole suite. Humans read it with a small pretty-printer that colorizes the terminal.

---

## Directory Shape

```
playbook/
├── run-all.mjs                (or run-all.py / run-all.sh)
├── README.md
├── lib/
│   ├── expect.mjs             (matchers)
│   ├── invariants.mjs         (business-rule checks)
│   ├── report.mjs             (JSON + terminal pretty-print)
│   ├── api.mjs                (thin HTTP client — auth, retry)
│   └── db.mjs                 (read-only DB queries for invariants)
├── happy/
│   ├── 01-bootstrap.mjs       (stack up + seed + login)
│   ├── 02-<journey>.mjs
│   └── ...                    (numbered — order matters)
├── edges/
│   ├── auth.mjs               (expired token, missing token, wrong role)
│   ├── boundaries.mjs         (minimum/maximum values, empty collections)
│   ├── soft-delete.mjs        (soft-deleted rows invisible in reads)
│   ├── idempotency.mjs        (repeat the same write → same state)
│   ├── degraded-dependency.mjs (upstream LLM/API missing → graceful)
│   └── data-size.mjs          (pagination, very large inputs)
└── snapshots/
    ├── baseline/              (known-good DB state)
    └── diff.mjs               (compare current snapshot to baseline)
```

`run-all.mjs` executes happy scripts in order, then every edge script in parallel, writes the JSON report, and exits with code 0 if all pass or 1 if anything failed (with invariant failures weighted higher in the exit-message text).

---

## Happy-Path Discipline

Happy scripts are **numbered and sequential**. Each one depends on the state the previous one left behind:

```
01-bootstrap.mjs        — stack up, seed baseline, log in, verify /healthz
02-onboarding.mjs       — complete onboarding; assert user row exists with seeded prefs
03-primary-feature.mjs  — exercise the product's core journey
04-secondary-feature.mjs
...
09-teardown.mjs         — cleanup; assert DB is in a known-final shape
```

Rules:

1. **One journey per script.** If a script covers two journeys, split it.
2. **Each script can re-read state but shouldn't re-bootstrap.** If 03 assumes you're logged in, 02 must have left you logged in.
3. **Every script ends with invariants.** Even if the happy path "passed", invariants catch silent drift.
4. **No skipped steps.** If 02 fails, subsequent scripts are *skipped* (reported as such), not forcibly passed. The report shows a truthful picture.
5. **Deterministic data.** Hardcoded UUIDs, seeded timestamps (`2026-01-01T00:00:00Z`), fixed random seeds. See `kernel → [Implementation Guidelines: Deterministic Test Data]` and `[APP]__PROJECT_SPECIFIC__*.md`.

---

## Edge Script Catalog

Edge scripts run **in parallel** (no ordering dependency) and each targets a single failure-mode family:

| Script | What it proves |
|--------|---------------|
| `auth.mjs` | Missing token → 401; expired token → 401; wrong role → 403; token for deleted user → 401. One test per status/reason. |
| `boundaries.mjs` | Minimum field values, maximum field values, zero-length collections, off-by-one on pagination. |
| `soft-delete.mjs` | A soft-deleted row does not appear in list endpoints, does not match unique-constraint, cannot be "un-deleted" by updating. |
| `idempotency.mjs` | The same write with the same `requestId` executed twice produces one row, not two. Works across retries. |
| `degraded-dependency.mjs` | The upstream LLM / payment / email provider is unavailable: the app degrades, returns a structured error, does not corrupt state, does not leak stack traces. |
| `data-size.mjs` | Long strings, deeply nested JSON, very large arrays — the system either handles or refuses cleanly. |

These six catch the bugs traditional E2E misses because they're not on a golden user path. Run them every build. They're also a great seed for SPARC Phase 4 tests — each edge script is a regression suite in embryo.

---

## Invariants: Writing Them Well

Good invariants share a shape: **a statement about observable state that should be true regardless of the sequence of operations that produced it**.

### Examples

```
countOverlappingTimeBlocks(userId): number  → must be 0
orphanedSubscriptionBillingPlans(): list    → must be []
softDeletedRowsVisibleInList(model): list   → must be []
userTotalOrdersMinusComponents(userId): number → must be 0
auditLogGapsInSequence(streamId): list      → must be []
```

### Anti-patterns

- **Tautological invariants**: `userExists() → true` doesn't prove anything useful. Invariants must be *non-trivially true*.
- **Flaky invariants**: depend on timing, external clocks, or racing processes. Either fix the race or don't assert it.
- **Too-specific invariants**: assert exact field values that change legitimately. The invariant should survive normal product evolution.

### Severity
Invariant failures should be reported at **higher severity** than assertion failures. An assertion says "this specific request returned the wrong thing"; an invariant says "your database is inconsistent." Treat the second as a bug-today even if no test explicitly hit the code path.

---

## Snapshot Diffs

A complementary tool: snapshot the DB (or external state) at known checkpoints, and `diff` against a baseline between runs. Catches silent drift that no single assertion would notice.

Keep the snapshot narrow:
- Dump only **mutable** state (exclude seed fixtures, auto-generated IDs).
- Normalize timestamps to relative ("N seconds after bootstrap") or redact them entirely.
- Diff structure and values, not formatting. A schema change is a real signal; a whitespace change is noise.

Store the baseline in version control (small, text-friendly). CI refuses to proceed when the diff is non-empty and not explicitly approved (commit-anchored approval avoids drift).

---

## Running the Harness

```
pnpm e2e               # canonical: bootstrap + run-all + report
pnpm e2e:happy         # happy scripts only (smoke)
pnpm e2e:edges         # edges only (after a contained change)
pnpm e2e:invariants    # invariants only (fastest sanity check)
pnpm e2e:report        # pretty-print the last run
pnpm e2e:diff          # snapshot diff vs baseline
```

A CI check reads the JSON report and posts a summary comment to the PR with counts and any invariant failures highlighted.

---

## Integration with Agents

When an agent ships a change, it should:

1. Run the harness (ideally the narrow subset targeting the change).
2. Read the JSON report, not the terminal output.
3. Report invariant failures with elevated attention — these are almost always real bugs.
4. Before completing the task, confirm `summary.failed === 0` OR explicitly document which failures are pre-existing and unrelated.

Agents that gloss over a red report are lying to the user. Hook a pre-completion check into the workflow (see `[APP]__CHECKLISTS.md`).

---

## Anti-Patterns

- **Giant single E2E file**: the suite becomes a 2,000-line script no one reads. Split into happy/edges, numbered, one journey each.
- **Playwright-only suites** mistaking UI interactions for business coverage. Playwright drives the UI; the harness asserts the system state behind it.
- **No invariants**: the suite tests what was built, not what should be true. Bugs slip through refactors.
- **Flaky-ignore**: "01-bootstrap is flaky, skip it." No. Either fix the race or remove the test. Skipped tests are lies.
- **Fixtures shared across scripts without isolation**: script 02 mutates fixture X; script 07 assumes fixture X is untouched. Each script starts from a known state.
- **No report consumer**: tests emit JSON nobody reads. Either a human reads it regularly or an agent does — both is ideal.

---

## Integration with Other Appendices

- `SPARC_METHODOLOGY.md` — Phase 4 (Refinement) should include adding/adapting harness scripts for the new feature.
- `AGENT_OBSERVABILITY.md` — file-change lifecycle recordings can be cross-checked against harness expectations ("did this agent touch any file not covered by the harness?").
- `MEMORY_AND_LEARNING.md` — repeated edge-script failures across sessions become learned patterns ("this module has a history of auth edge-case regressions; test accordingly").
- `[APP]__PROJECT_SPECIFIC__*.md` — seed data, stack bootstrap, and harness invocation commands live here.

---

## Checklist: Harness Readiness

- [ ] `expect`, `invariants`, and `report` primitives exist and are framework-agnostic
- [ ] Happy scripts are numbered, sequential, single-journey
- [ ] Edge scripts exist for auth, boundaries, soft-delete, idempotency, degraded-dependency, data-size
- [ ] Invariants are non-trivial and state-focused (not tautological)
- [ ] Report is emitted as JSON and has a human pretty-printer
- [ ] Snapshot diff exists and has a baseline committed
- [ ] `pnpm e2e` (or equivalent) runs the full suite in one command
- [ ] CI posts a PR comment summarizing report + highlighting invariant failures
- [ ] Deterministic data everywhere (hardcoded UUIDs, fixed timestamps, seeded randomness)
- [ ] Flaky tests are fixed or removed — never silenced
