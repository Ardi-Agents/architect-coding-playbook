# E2E Harness Template

Runnable reference implementation of the invariant-driven E2E pattern described in [`AGENTS/E2E_HARNESS.md`](../../AGENTS/E2E_HARNESS.md).

## What you get

- `lib/expect.mjs` — matcher library that returns structured results instead of throwing
- `lib/invariants.mjs` — scaffold + two example invariants
- `lib/report.mjs` — JSON writer + terminal pretty-printer
- `lib/api.mjs` — minimal HTTP client (auth + retry)
- `happy/01-bootstrap.mjs` — example happy-path script (log in, smoke-test)
- `edges/auth.mjs` — example edge-script (401 / 403 handling)
- `run-all.mjs` — orchestrates happy-then-edges, writes `output/run-<ts>.json`

## Adapt to your project

1. Copy this entire directory to your repo under `playbook/` (or any name you prefer).
2. Edit `lib/api.mjs` — set the base URL, adapt the auth step to your login endpoint.
3. Edit `lib/invariants.mjs` — add invariants specific to your domain (every invariant is a function returning an array of expect results).
4. Add happy scripts numbered `01-`, `02-`, ... in `happy/`. Each is a module exporting `default async ({ api, expect, invariants }) => { ... }`.
5. Add edge scripts in `edges/` — same export shape.
6. Wire to your package scripts:
   ```json
   {
     "scripts": {
       "e2e": "node playbook/run-all.mjs",
       "e2e:happy": "node playbook/run-all.mjs --only happy",
       "e2e:edges": "node playbook/run-all.mjs --only edges",
       "e2e:report": "node playbook/lib/report.mjs --pretty output/run-*.json"
     }
   }
   ```

## Invocation

```bash
node run-all.mjs              # runs all happy (in order) + all edges (parallel)
node run-all.mjs --only happy # happy only
node run-all.mjs --only edges # edges only
node run-all.mjs --help       # usage
```

Exit codes: `0` all pass; `1` any assertion failed; `2` any invariant failed (higher severity).

## Report output

After each run, a JSON file lands at `output/run-<timestamp>.json`:

```json
{
  "run_id": "...",
  "started_at": "2026-04-23T12:00:00Z",
  "ended_at":   "2026-04-23T12:00:42Z",
  "scripts": [
    {
      "name": "01-bootstrap",
      "kind": "happy",
      "assertions": [...],
      "invariants":  [...],
      "duration_ms": 2100,
      "status": "passed"
    }
  ],
  "summary": { "total": 5, "passed": 5, "failed": 0, "invariant_failures": 0 }
}
```

The pretty-printer (`lib/report.mjs --pretty <file>`) renders a colored terminal summary — CI can post the raw JSON as a PR comment.

## Integration with CI

Minimum: run `e2e` in a post-build job; fail the job on non-zero exit.

Richer: parse the JSON report and post a summary comment. Invariant failures should be called out explicitly in the comment — they mean your database is inconsistent, which is almost always a bug-today.
