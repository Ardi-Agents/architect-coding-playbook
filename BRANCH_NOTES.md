# Branch Notes — `feat/multi-track-stack-composition`

> **TL;DR**: The playbook now supports multi-track repos (e.g. `.NET service + Python pipeline + TypeScript frontend`) without losing its language-agnostic kernel. A `Stack Composition` table declared in `[APP]__PROJECT_SPECIFIC.md` tells the agent which language tracks fire in your repo; each appendix carries parallel `#### Track:` subsections (`dotnet | python | typescript | go | rust`) for divergent guidance. Cross-track patterns stay in the kernel. Three new appendix templates were added; SCG/BOUML/NiemBouml-specific content was distilled out.

---

## Why this exists

Two pressures forced the change:

1. The previous kernel was **FOSS-stack-leaning** (Python/Node/TS-flavored) — `.NET` was second-class, with `dotnet` mentioned only in passing in one appendix.
2. Real repos in this organization are **multi-track** (e.g. SemanticCompilerWeb has Python backend + TS frontend; planned SemanticCompiler will mix `.NET` + Python). A binary `dotnet | polyglot` enum couldn't express that.

The fix: tracks are per-language and first-class; a repo declares which tracks are active; the agent applies whichever track matches the file being edited.

---

## The mental model in one diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│  KERNEL (root AGENTS.md)                                               │
│   • P0–P4 priorities  • Design-first protocol  • Scope discipline      │
│   • Stack Composition + Track Discipline rule                          │
│   • Agent-native rules: evidence tiers, no-prose-without-verification, │
│     deferral hygiene, adversarial-review checkpoint, acceptance tests  │
│   • Cross-track concepts: build-clean, authoritative-workspace,        │
│     pre-/post-edit ritual, error-handling, async, structured logging   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       │                           │                           │
   APPENDICES (cross-track concept + per-track recipes)
       │                           │                           │
   IMPLEMENTATION   STATIC_ANALYSIS  API_DESIGN  TOOL_USAGE  …
       │                           │                           │
       ├─ #### Track: dotnet ──────┤                           │
       ├─ #### Track: python ──────┤   parallel subsections    │
       ├─ #### Track: typescript ──┤   for divergent guidance  │
       ├─ #### Track: go ──────────┤                           │
       └─ #### Track: rust ────────┘                           │
```

The kernel is read every session. Appendices are read when their declared **trigger phrases** match the user prompt. Track subsections fire based on the file extension being edited.

---

## How a project declares its stack

In `[APP]__PROJECT_SPECIFIC.md` (top of file):

```markdown
## Stack Composition

| Track | Version | Subtree | Notes |
|-------|---------|---------|-------|
| dotnet | .NET 10 / C# 14 | `src-cs/`, `tests/dotnet/` | xUnit.v3 + MTP |
| python | 3.12 | `src/`, `tests/python/` | pytest, ruff, mypy strict |
| typescript | 5.x | `frontend/` | vitest, eslint, tsc strict |
```

Single-track repos have one row; multi-track repos have N rows. The agent applies `dotnet` track guidance to `.cs` files, `python` track to `.py` files, etc.

---

## What changed (file by file)

### Kernel (root)

| File | Change |
|------|--------|
| `AGENTS.md` | Added Stack Composition + Track Discipline (with stack-specific-term blocklist), agent-native working rules section, build-clean / authoritative-workspace / acceptance-tests / deferral-hygiene rules, domain ownership map convention, 300-line-cap-with-clarity-wins rule. Pre-Completion Checklist updated. Appendix Index lists 10 appendices (was 7). |

### Appendices — modified (cross-track + parallel `#### Track:` subsections added)

| File | What it now covers |
|------|--------------------|
| `[APP]__PROJECT_SPECIFIC.md` | **Stack Composition** table is now mandatory at top. Added re-entry checklist, deferred-work / open-research-items templates, where-to-land guidance for new directives. |
| `[APP]__IMPLEMENTATION.md` | Per-track TDD (test framework, deterministic data, fixtures), per-track database migrations (EF Core / Alembic / Prisma / sqlx / golang-migrate), pre-/post-edit lifecycle ritual, conditional auth-test exemplars per track. |
| `[APP]__STATIC_ANALYSIS.md` | Per-track build-clean operationalization (`<TreatWarningsAsErrors>`, ruff strict, tsc strict, clippy `-D warnings`, etc.), per-track coverage commands, per-track project-file consistency, per-track entry-point integrity. Tool table now has five tracks side-by-side. |
| `[APP]__API_DESIGN.md` | Per-track error-format guidance (`ProblemDetails`/RFC 7807 for .NET, FastAPI patterns, Express middleware, axum extractors). Optional Authentication section gated on "if your project has auth" with patterns per track. |
| `[APP]__TOOL_USAGE.md` | Structural-tool priority rule with per-track tools (Roslyn analyzers, pyright, ts-language-server, gopls, rust-analyzer). Process hygiene rules (one-purpose-per-shell, narrate-before-long, verify-active-branch-before-commit). |
| `[APP]__DEPENDENCY_UPGRADES.md` | New License Compatibility section (FOSS-license dimension, cross-track). Per-track central package management (`Directory.Packages.props`, `pyproject.toml`, workspace protocols, `go.mod`, `Cargo.toml`). Per-track audit / vuln scan / rollback. |
| `[APP]__CHECKLISTS.md` | New Claim-Heavy Output Checklist tied to evidence-tier discipline + adversarial-review checkpoint. Acceptance-assertion verification added to pre-completion checklist. |

### Appendices — new templates

| File | Purpose |
|------|---------|
| `[APP]__DESIGN_POSTURE.md` | **Locked architectural decisions with explicit backout triggers**. Replaces ad-hoc "we decided this" prose with a structured record that names what would justify reopening the decision. |
| `[APP]__VERSIONING.md` | Versioning policy. Opens with **scheme selection** (SemVer recommended; CalVer / ZeroVer / Custom acknowledged with tradeoffs) and a project-declaration placeholder. Per-track package-version source of truth, per-track release tagging, per-track backout. Optional host-runtime pin pattern (`1.0.0-roslyn5.3.0` etc.). |
| `[APP]__OBSERVABILITY.md` | Cross-track error-handling philosophy, structured-logging discipline, async/concurrency rules. Per-track production diagnostics tools (`dotnet-trace`, `py-spy`, `clinic.js`, `pprof`, `cargo flamegraph`). OpenTelemetry as cross-track standard. |

### Infrastructure

| File | Change |
|------|--------|
| `CLAUDE_CODE/SETUP.md` | Q2(c) prompts for multi-track stacks. Stack-defaults table now has a `dotnet` column. `toolVersion` 0.5.0. |
| `CLAUDE_CODE/install.manifest.json` | Three new appendices added to `agentsCopy.appendicesDir.files`. `toolVersion` 0.5.0. |
| `claude-code-plugin/.claude-plugin/plugin.json` | `version` 0.5.0 (was drifted at 0.4.0; caught in consistency check). |
| `README.md` | Appendix list updated; Stack Composition mentioned. |

### Removed

- `.NET C# Work/` tree (6 files) — distilled into the structure above. The baseline import is preserved at commit `5167b6c` for archaeology.

---

## Agent-native rules baked into the kernel

These exist so the playbook works *for an agent*, not just for humans reading it. They auto-load every session via the kernel.

- **Evidence-tier discipline** (`VERIFIED / READ / INFERRED / GUESSED`) — every non-trivial assertion gets graded; below VERIFIED is promoted via investigation or explicitly flagged.
- **No prose without verification** — comments, doc-strings, commit messages are claims that get checked before commit (grep symbol references, measure performance, probe behavior).
- **Deferral hygiene** — "future work" labels require explicit user authorization; default is fix-it-now.
- **Adversarial-review checkpoint** — claim-heavy outputs (state reports, audits, design docs) get attacked before publication, not after.
- **Tool-priority rule** — structural tools first; grep is the fallback.
- **Acceptance-tests-over-touch-points** — every unit-of-work plan declares the specific assertion that proves it landed against real data, not just a file list.

---

## What got distilled OUT

- **`SemanticCodeGraph` (SCG)** tool-specific guidance — SCG is a Roslyn-based query tool not shipped with the playbook. References to `scg query`, `scg investigate`, `.scg/` snapshots, the SCG catalog block in `CLAUDE.md`, and `scg sync-claude-md` are all gone. Replaced with generic per-track structural-tool pointers ("Roslyn-based language servers", "`Microsoft.CodeAnalysis` APIs for programmatic queries", etc.).
- **NiemBouml-specific narrative** — clean-room discipline against bouml's GPL source, niem-tools as the acceptance gate, project layout, deferred-work narrative. None of this is generalizable.
- **PowerShell-specific consistency-check commands** — Windows-flavored audit scripts.
- **`Lifted-and-generalized from BOUML` attribution comments** — replaced with neutral framing.

---

## Open questions / discussion points

These are the calls this branch makes that reviewers may want to revisit:

1. **Track names**: `dotnet | python | typescript | go | rust`. Lowercase, language-as-track. Should `csharp` and `fsharp` be separate tracks? Today they're both under `dotnet`. JS-only-not-TS → today goes under `typescript`.

2. **VERSIONING template structure** — opens with "Choose Your Scheme" (SemVer / CalVer / ZeroVer / Custom). Defaults to SemVer because all five major registries (NuGet, npm, PyPI, crates.io, Go modules) assume it. CalVer projects translate the patterns analogously.

3. **Authentication is OPTIONAL** — `[APP]__API_DESIGN.md § Authentication (if present)` is gated. Projects without auth skip it entirely.

4. **Plugin / manifest version** — bumped 0.4.0 → 0.5.0. Major-feature change in playbook surface, so deserved a minor bump. Not a major bump (no breaking changes for existing single-track adopters — they ignore the new appendices and the Stack Composition table is additive).

5. **Three new appendices may be excessive** for a single-track repo that doesn't need them. The setup flow installs them anyway; users delete what they don't want. Trade-off: simpler install logic vs slightly more "what is this for?" friction. Open to feedback.

---

## Commits in this branch

```
656ef14  fix(plugin): bump plugin.json version 0.4.0 -> 0.5.0 to match install manifest
1fe542c  feat(playbook): multi-track Stack Composition + agent-native rules
5167b6c  baseline: import .NET/C# overlay for distillation
```

Diff vs `main`: 21 files changed, ~2165 insertions, ~1761 deletions (net +404 lines, but most of the deletion is the SCG/BOUML noise that came in via the baseline commit).

---

*This branch was produced collaboratively with Claude Code (Opus 4.7, 1M context). The full conversation log is available on request.*
