# Appendix: Static Analysis Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 2.0 | **Updated**: 2026-05-08
>
> **Owns**: Linting, formatting, type-checking, dead-code detection, coverage targets, build-clean operationalization per track, security scanning, doc & artifact integrity, project-file consistency.
>
> **Fires when**: pre-commit, "is this clean?", "what should I run before I push?", auditing for dead code, checking coverage gaps, reviewing documentation drift.

---

## Tool Selection by Change Size

| Change Type | What to Run |
|-------------|-------------|
| Small edits (<20 lines) | Track linter + formatter on edited file |
| New functions/modules | + type checker + targeted security scan (per track) |
| Pre-commit / major changes | Full track suite + secrets scan (`gitleaks`) |
| Full test suite / major refactor | All track tools + Security Review (see below) |

Specific per-track commands live in `### Track:` subsections below and in `[APP]__TOOL_USAGE.md`.

### Automated Security Review Trigger

**When to Run** (cross-track):

- Full test suite executed
- Major static analysis run
- Pre-deployment validation
- Weekly scheduled CI runs

**Process** (cross-track):

1. Run full security scan suite (Trivy, `gitleaks`, semgrep, plus track-specific dependency-vuln scanner)
2. Execute analysis (manual or automated): classify findings by risk
3. Generate actionable report with risk assessment
4. Notify security owner
5. Update `Documentation/QA & Testing Methodology/security_findings_log.md` (or your project's equivalent)

**Severity Tiers** (cross-track):

- **CRITICAL**: Immediate action (< 24 hours)
- **HIGH**: Review and fix within 7 days
- **MEDIUM**: Address in next sprint
- **LOW**: Track for quarterly review
- **MINIMAL**: No action needed, continue monitoring

**Reporting** (cross-track):

- Notification sent to configured address
- Report archived in CI artifacts
- Findings logged in security_findings_log.md
- SARIF upload where supported (GitHub Security tab, GitLab Security Dashboard, etc.)
- **Secret Redaction Rule**: Never store literal secrets (API keys, tokens, passwords) in documentation, logs, AI summaries, or reports. Always replace with placeholders such as `REDACTED_<TYPE>`. If a tool captures a secret string, redact it before committing or sharing.

---

## Build-Clean Posture (per kernel Rule #10)

> Cross-track: zero warnings, zero errors on the default configuration.
> Track-specific operationalization below.

#### Track: dotnet

> **Depth**: expert.

- `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in `Directory.Build.props` — repo-wide warnings-as-errors.
- `<Nullable>enable</Nullable>` repo-wide; treat CS86xx (nullable warnings) as errors.
- `<AnalysisMode>latest</AnalysisMode>` (or `recommended`) to surface latest Roslyn analyzer rules.
- `<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>` to make `.editorconfig` IDE0xxx rules build-failing.
- `dotnet format --verify-no-changes` in CI to enforce formatting.
- Per-project `<NoWarn>` and `#pragma warning disable` get a documented justification per `[APP]__PROJECT_SPECIFIC.md` § Linter / Analyzer Rule Suppressions.

#### Track: python

> **Depth**: expert.

- `ruff check --no-fix` (CI: fail on any finding); `ruff format --check`.
- `mypy --strict` (or as strict as the project tolerates; the strict ladder is documented in `[APP]__PROJECT_SPECIFIC.md`).
- `bandit -ll` for security warnings; `safety check` (or `pip-audit`) for known CVEs.
- Per-rule `# noqa: <code>` and `# type: ignore[<code>]` suppressions get a comment justification.

#### Track: typescript

> **Depth**: expert.

- `tsc --noEmit --strict` (CI: zero errors). Strict ladder includes `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- `eslint --max-warnings 0` in CI (zero warnings policy).
- `prettier --check` for formatting.
- `npm audit --production --audit-level=high` for known CVEs.
- `// eslint-disable-next-line <rule>` and `// @ts-expect-error` suppressions get a comment justification.

#### Track: go

> **Depth**: consensus.

- `go vet ./...` (built-in static analysis; zero findings).
- `staticcheck ./...` or `golangci-lint run` (richer rule set; zero findings).
- `gofmt -l .` returns empty (CI: fail if non-empty).
- `govulncheck ./...` for known CVEs.
- `errcheck ./...` enforces error-return-value handling.
- `// nolint:<rule>` suppressions with comment justification.

#### Track: rust

> **Depth**: consensus.

- `cargo clippy --all-targets --all-features -- -D warnings` (CI: clippy warnings as errors).
- `cargo fmt --all -- --check` for formatting.
- `cargo audit` for known CVEs.
- `unsafe` blocks require a `// SAFETY:` comment documenting the invariants the caller must maintain.
- `#[allow(clippy::<rule>)]` with a comment justification.

---

## Tool Reference Table

Run your project's configured linter, formatter, type-checker, and security scanner per track:

| Tool category | dotnet | python | typescript | go | rust |
|---|---|---|---|---|---|
| Linter | Roslyn analyzers + `dotnet format analyzers` | `ruff check`, `flake8` | `eslint` | `go vet`, `staticcheck` | `cargo clippy` |
| Formatter | `dotnet format whitespace` | `ruff format`, `black` | `prettier` | `gofmt` | `cargo fmt` |
| Type checker | (built-in via `<Nullable>` + Roslyn) | `mypy`, `pyright` | `tsc --noEmit` | (built-in) | (built-in) |
| Security / vuln scanner | `dotnet list package --vulnerable --include-transitive` | `bandit`, `pip-audit` | `npm audit`, `socket` | `govulncheck` | `cargo audit` |
| Secrets | `gitleaks detect` | `gitleaks detect` | `gitleaks detect` | `gitleaks detect` | `gitleaks detect` |

Substitute the actual commands for your project (see `[APP]__PROJECT_SPECIFIC.md` for project-specific overrides).

### Trivy / Container Scan Fix vs Ignore Matrix

| Scenario | Action |
|----------|--------|
| **New dependency introduces HIGH/CRITICAL CVE** | Do **not** merge. Select a different version/library or remove the dependency so the finding disappears. |
| **CVE pre-existed in lockfile / base image** | Document the CVE ID, affected package, and mitigation plan in `[APP]__PROJECT_SPECIFIC.md` under Security Exceptions, then notify security/infra owner. |

---

## Lint Feedback Protocol (cross-track)

Fix lint errors in files you're modifying within the same change. **Passing lint = part of the definition of done.**

### When to Fix vs Ignore

| Situation | Action |
|-----------|--------|
| Error in file you're editing | Fix immediately |
| Error in unrelated file | Do NOT fix (scope discipline) |
| Warning in file you're editing | Fix if trivial, else document |
| Pre-existing errors | Only fix if blocking your work |

---

## Project-File Consistency (per track)

Every track has its own workspace / manifest files that must stay internally consistent. Drift between manifests and on-disk reality is a frequent source of "works on my machine" failures.

#### Track: dotnet

> **Depth**: expert.

- Every `.csproj` on disk appears in `<solution>.slnx` / `.sln`; every solution entry resolves.
- All projects share `<TargetFramework>` and `<LangVersion>` (set centrally in `Directory.Build.props`).
- `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>` set uniformly.
- Package versions centralized in `Directory.Packages.props`; per-project overrides require a comment.
- Cross-project layering rules (e.g., `Core` doesn't depend on `Protocol`) enforced via project references and tested via structural-tool query.

#### Track: python

> **Depth**: expert.

- `pyproject.toml` is the single source of truth for project metadata, dependencies, tool config (PEP 621).
- All `src/` modules have an `__init__.py` (or use namespace packages consistently).
- Single `conftest.py` per test suite root; no orphan test files outside the discovery glob.
- `pyproject.toml` `[tool.mypy]` and `[tool.ruff]` blocks are the authoritative config — no competing `mypy.ini` / `.ruff.toml` shadowing.

#### Track: typescript

> **Depth**: consensus.

- `package.json` workspaces resolve; `pnpm-workspace.yaml` (if used) lists all packages.
- `tsconfig.json` extends a shared base (e.g., `tsconfig.base.json`) — no per-package strict-flag drift.
- ESM vs CommonJS posture is consistent — `"type": "module"` set uniformly or per-package with explicit reason.
- Type-only imports use `import type { … }` for tree-shaking.

#### Track: go

> **Depth**: consensus.

- `go.mod` and `go.sum` consistent (`go mod tidy` is no-op).
- All packages compile from workspace root (`go build ./...` is no-op).
- Build tags (`//go:build linux`) used consistently across platform-specific files.
- `go.work` (if multi-module) lists all module paths; modules referenced by `replace` directives exist.

#### Track: rust

> **Depth**: consensus.

- `Cargo.toml` workspace member list resolves; every member has its own `Cargo.toml`.
- `[workspace.dependencies]` centralizes versions; member crates use `dep.workspace = true`.
- `Cargo.lock` committed for binary crates; library crates per project policy.
- `[features]` flags additive (no mutually-exclusive features without documented constraint).

---

## Dead Code Detection (cross-track)

Apply dead-code principles broadly: zero-caller modules, functions, entry points, CLI commands, and build artifacts. If nothing imports, invokes, or references it, delete it — dead code wastes context and misleads agents.

### General Checks

- **Zero-caller modules**: Source files with no inbound imports or entry-point registration
- **Unused exports**: Functions, classes, or constants exported but never consumed
- **Orphaned artifacts**: Build outputs, generated files, or config entries referencing removed code
- **Stale entry points**: CLI commands, API routes, or scheduled tasks pointing to deleted handlers

### Per-track tooling

#### Track: dotnet

- Roslyn analyzers (CS0168 "unused variable", IDE0051 "unused private member", IDE0052 "unread private member", CA1822 "member doesn't access instance data") — surface dead code automatically.
- Cross-reference with structural-tool query for orphan types/methods.

#### Track: python

- `vulture` for dead-code detection (advisory; many false positives in dynamic code).
- `ruff F401` (unused imports), `F841` (unused local variable).

#### Track: typescript

- `knip` (replaces `ts-prune`) for unused exports.
- `eslint` `no-unused-vars` rule.
- **Knip is advisory, not authoritative** — many false positives for dynamically-referenced code (route registries, plugins). Document false positives in `[APP]__PROJECT_SPECIFIC.md`.

#### Track: go

- `unused` (part of `staticcheck` suite) for unused identifiers.
- `deadcode` for unreachable functions.

#### Track: rust

- Compiler warnings: `dead_code` lint surfaces unused functions/types automatically (default warn).
- `cargo +nightly udeps` for unused crate dependencies.

### Before Removing Any Flagged Item

1. **Check API contracts** → wherever your project defines them (e.g., schema files, OpenAPI specs, public NuGet/npm/PyPI/crates.io surface)
2. **Check test usage** → grep tests directory for the symbol
3. **Check design specs** → your project's design / planning docs
4. **Verify build passes** → run the track's full build

### False Positives List

Maintained in: `AGENTS/[APP]__PROJECT_SPECIFIC.md` → **Dead-Code Detector** section.

**Rules** (cross-track):

- Do NOT auto-remove items in that list
- Add new false positives with location and justification
- Periodically review list for stale entries

---

## Test Coverage Requirements

### Measurement (per track)

#### Track: dotnet

- `dotnet test --collect:"XPlat Code Coverage"` (built-in via Coverlet integration).
- ReportGenerator (`dotnet tool install -g dotnet-reportgenerator-globaltool`) for HTML reports.
- `coverlet.runsettings` for include/exclude filters and threshold gates.

#### Track: python

- `pytest --cov=<package> --cov-report=term-missing --cov-report=html`.
- `coverage.py` underneath; `[tool.coverage.run]` config in `pyproject.toml`.

#### Track: typescript

- `vitest run --coverage` (uses v8 coverage by default; `c8` underneath) or `jest --coverage` (uses Istanbul).
- HTML report in `coverage/` directory.

#### Track: go

- `go test -cover ./...` for percentage; `go test -coverprofile=cover.out ./... && go tool cover -html=cover.out` for line-by-line.

#### Track: rust

- `cargo tarpaulin --out Html` (Linux/macOS) or `cargo llvm-cov --html` (cross-platform; based on LLVM source-based coverage).

### Targets (cross-track defaults; tighten in `[APP]__PROJECT_SPECIFIC.md` per project)

| Component | Minimum Coverage |
|-----------|------------------|
| Models / data classes | 100% |
| Schemas / validators | 100% |
| Repositories / data access | 95% |
| Services / business logic | 85% |
| API endpoints | 90% |
| Overall | 80% |

### Structural Coverage Checks (cross-track)

Beyond percentage targets, verify structural test health:

- **File pairing**: Every source module has a corresponding test file. New modules get tests before merge.
- **No stale imports**: Test files don't import deleted or renamed functions. A test that imports a phantom is worse than no test.
- **New code = new tests**: PRs adding modules without test files are incomplete.
- **Skipped tests have a live reason** — `[Fact(Skip="…")]`, `@pytest.mark.skip(reason="…")`, `it.skip(…)`, `t.Skip("…")`, `#[ignore = "…"]`. No bare skips without tracking issue.

### Improving Coverage (cross-track)

1. **Identify gaps**: Review the per-track missing-lines report.
2. **Prioritize**: Focus on critical paths (auth, data mutations, error handling).
3. **Add tests**: Target uncovered branches, not just lines.
4. **Mock external services**: LLM calls, file I/O, external APIs.

---

## Entry-Point Integrity (per track)

Every executable / library / package has a reachable entry point that compiles and resolves its dependencies. Failures here are silent until first run — make them explicit at build time.

#### Track: dotnet

- Every `<OutputType>Exe</OutputType>` project has a `Program.cs` (or `Main` method) that compiles.
- The CLI entry point surfaces failures through non-zero exit codes (`Main` returns `int` or `Task<int>` where any failure path exists).
- No `catch (Exception) { }` silent swallows.

#### Track: python

- Every package has an `__init__.py` (or is a documented namespace package).
- CLI entry points declared in `[project.scripts]` of `pyproject.toml` resolve to importable callables.
- `if __name__ == "__main__":` blocks return a non-zero exit code via `sys.exit(...)` on failure.

#### Track: typescript

- Every package's `package.json` `main` / `exports` / `bin` paths resolve to existing files.
- CLI scripts in `bin/` are executable and have shebangs (Unix) or `.cmd` shims (Windows).
- Unhandled promise rejections terminate with non-zero exit code (set up via `process.on('unhandledRejection', ...)`).

#### Track: go

- Every package with `package main` has a `main` function.
- `os.Exit(<non-zero>)` on any failure path.
- No bare `panic()` outside genuinely unrecoverable conditions.

#### Track: rust

- Every binary crate has a `main.rs` with `fn main() -> Result<(), Error>` or returns `()` and uses `std::process::exit`.
- Errors propagate via `?`; `unwrap` / `expect` only at the top level with a proof-comment.

---

## Import & Reference Health (cross-track)

Verify that all references — imports, names, and identifiers — resolve correctly across the codebase. Stale references break silently and erode trust.

### Cross-Repo / Cross-Package Import Health

All files that import from sibling packages, monorepo workspaces, or related repos must resolve to existing modules and named exports.

**Checks**:

- All imports resolve to existing modules (no `ModuleNotFoundError` / `error TS2307` / `cannot find package` on cold start)
- Imported symbols exist with expected signatures
- No imports pointing at deleted, renamed, or relocated symbols
- Type-only imports resolve in type-check mode
- Circular imports flagged and resolved

### Stale Comments and References

Comments, docstrings, and string literals frequently reference deleted or renamed code. Grep for these systematically after refactors.

**Checks**:

- No comments referencing deleted modules, functions, or CLIs by name
- No outdated terminology (e.g., old phase numbering, renamed concepts)
- No references to deprecated APIs in inline documentation
- TODO/FIXME comments tied to completed or abandoned work are removed
- Docstring examples use current API signatures, not legacy ones

---

## Documentation & Artifact Integrity (cross-track)

Static analysis applies to prose and project artifacts, not just source code. Run these checks when documentation or project structure changes.

### Documentation Separation of Concerns

Each concept, rule, or schema definition lives in exactly one file. No content duplicated across files — reference the authoritative source instead.

**Checks**:

- No two files define the same rule, schema, or procedure
- When content appears similar in multiple files, one file owns it and others link to it
- Merge or deduplicate any violations found during review
- Each `[APP]__*.md` appendix has an `> **Owns**:` header declaring its scope (single source of truth via the kernel's Domain Ownership Map)

### Documentation Referential Integrity

Every file, function, CLI command, or configuration key mentioned in docs exists in the code. Every module in the code appears in the correct documentation domain.

**Checks**:

- File paths referenced in docs resolve to actual files
- Function and class names cited in docs exist in the codebase
- CLI commands documented actually run without error
- New modules are mentioned in the appropriate documentation section
- Removed code is scrubbed from all docs (not just the source file)

### Runbook & Pipeline Accuracy

Walk through any runbook, setup guide, or pipeline documentation. Do the commands, file paths, and sequencing match what the code actually does?

**Checks**:

- Shell commands in docs execute successfully in a clean environment
- File paths in step-by-step instructions point to real locations
- Step ordering matches actual dependency order (e.g., migrate before seed)
- Environment variable names match what the code reads
- Tool versions and flags match current project configuration

### Plan File Staleness

Plan files (`ACTIVE_PLAN.md`, roadmap documents, implementation plans) go stale quickly. Completed or obsolete plans waste context and mislead agents.

**Checks**:

- No plan files with all tasks marked complete — archive or delete them
- No plan files referencing features already shipped or abandoned
- Active session plans live in your harness's per-project memory (auto-loaded), not in per-project session dirs at the repo root
- Roadmap items that shipped are moved to a changelog or removed

### README Accuracy

The README is often the first file an agent or developer reads. Inaccurate READMEs erode trust and cause wrong assumptions.

**Checks**:

- Repo structure trees match actual files and directories
- Feature descriptions match implemented (not aspirational) behavior
- Unimplemented features are explicitly marked as planned or removed
- Setup instructions produce a working environment
- Badge URLs and links resolve correctly

---

## CI Integration (cross-track)

Ensure these checks pass before marking work complete:

- [ ] Linter passes (per-track tooling)
- [ ] Type checker passes (where applicable)
- [ ] Test suite passes
- [ ] Build clean — zero warnings, zero errors
- [ ] No new security warnings from secrets-scanning + dependency-vuln tooling
- [ ] Coverage thresholds met (per-track)
- [ ] Project-file consistency check passes (per-track)
