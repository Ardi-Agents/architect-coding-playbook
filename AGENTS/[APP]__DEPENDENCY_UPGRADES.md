# Appendix: Dependency Upgrade Best Practices

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 2.0 | **Updated**: 2026-05-08
>
> **Owns**: Phased dependency-upgrade methodology, conflict resolution, license compatibility, central package management per track, version verification commands per track, rollback strategy.
>
> **Fires when**: "upgrade dependencies", "bump <package>", "is this version still safe?", "what's the upgrade plan?", license-compatibility questions, package vulnerability findings.
>
> **Length note**: 383 lines — exceeds the advisory 300-line cap defined in `AGENTS.md` § File-Length Guideline. Justification: per-track-recipe coverage (5 tracks × upgrade / vulnerability-scan / rollback sections) plus a cross-track License Compatibility section. Clarity-wins exception per kernel rule.

---

## Overview

A battle-tested methodology for upgrading dependencies across full-stack applications with minimal risk and clear failure attribution.

---

## Core Principles (cross-track)

### 1. Sequence Matters

```
Tooling → Patches → Minor (Backend) → Minor (Frontend) → Major (Last)
```

**Why this order:**

- **Tooling first** (linters, code analyzers, test runners): Better diagnostics for later phases
- **Patches together**: Minimal behavioral changes, one test run
- **Backend before frontend**: API stability before UI changes
- **Major upgrades last**: Isolates breaking changes for clean attribution

### 2. Test After Every Phase

- **Patch updates**: Can batch 3-5 together, then run full suite
- **Minor updates**: Full test suite immediately after each
- **Major updates**: Full test suite + manual smoke test

### 3. Verify Versions Before Updating

Always check the package registry for actual latest versions before updating. User-provided version targets may be outdated or incorrect.

Per-track verification commands in the **Version Verification Commands** section below.

---

## License Compatibility (cross-track FOSS-license dimension)

> A license-discipline rule that applies regardless of stack — the FOSS-license dimension is orthogonal to the language track.

When a project ships under a permissive license (Apache-2.0, MIT, BSD), every dependency's license must be combinable with that target license without copyleft contamination. The check applies to direct AND transitive dependencies.

### Accepted licenses (combinable with permissive distribution)

- MIT
- Apache-2.0
- BSD-2-Clause, BSD-3-Clause
- ISC
- Zlib
- MS-PL
- Unlicense
- CC0-1.0

### Hard-blocked (incompatible with permissive distribution)

- **GPL** (any version) — strict copyleft
- **LGPL** (any version) — static-link ambiguity is unacceptable for libraries shipped to standards organizations or embedded in binaries
- **AGPL** — strict copyleft including network use
- **Commercial-only** or **"free for non-commercial use"** licenses

### Worked examples

- **FluentAssertions** ≥ 7.0.0 — went commercial under Xceed at the 7.0 release. Pin to **6.12.2** (last MIT release) for permissive-license projects.
- **Redis Stack modules** post-license-change — affected by Redis's SSPL transition.
- **Elasticsearch** post-7.11 — moved to SSPL/Elastic License; OpenSearch is the permissive fork.
- **MongoDB** server — SSPL since 2018; client drivers remain Apache-2.0.

### Verification per track

- **dotnet**: walk every `<PackageVersion Include="…">` in `Directory.Packages.props`; check the package's license on `nuget.org`. Tools: `dotnet-licenses` for automation.
- **python**: `pip-licenses` lists installed package licenses; `pyroma` for project metadata sanity.
- **typescript**: `license-checker --summary` (npm); `pnpm licenses list` (pnpm).
- **go**: `go-licenses report ./...` from `github.com/google/go-licenses`.
- **rust**: `cargo-license` lists licenses; `cargo-deny check licenses` for CI gating.

CI gate via the appropriate tool once per repo.

---

## Phased Upgrade Checklist (cross-track)

### Phase 0: Baseline & Safety Net

- [ ] All tests pass on current code
- [ ] Lock files / manifest pins committed (per-track lockfile location below)
- [ ] CI/CD pipeline green
- [ ] Document current coverage percentage
- [ ] License compatibility check passes (per the section above)

### Phase 1: Tooling & Dev-Only Updates

**Packages**: Linters, code analyzers, formatters, test runners (dev dependencies only)

**Risk**: Very Low — no runtime behavior changes

**Rule**: Update tooling first to get better diagnostics for subsequent phases.

### Phase 2: Pure Patch Updates

**Packages**: Bug-fix only updates (x.y.Z changes)

**Risk**: Low — no API changes expected

**Rule**: Can batch 3-5 patch updates together, then run full test suite.

**Watch for**: Dependency conflicts (see Conflict Resolution section)

### Phase 3: Backend Framework Minors

**Packages**: Web frameworks, ORMs, runtime servers

**Risk**: Medium — potential validation/behavior changes

**Rule**: Update backend before frontend to ensure API stability.

**Watch for**:

- Validation strictness changes
- Dependency injection behavior
- Async lifecycle changes
- Type hint/schema changes
- Source generator output changes (.NET)
- Pydantic v1 → v2 migration patterns (Python)
- Decorator metadata changes (TypeScript)

### Phase 4: Frontend Infrastructure Validation

**Purpose**: Ensure build tooling stable before major UI framework upgrades

**Rule**: Clean install, run all tests, lint, code analyzers, and production build before proceeding to major upgrades.

### Phase 5: Major Upgrades

**Risk**: HIGH — semantic and lifecycle changes

**Pre-upgrade**:

1. Check all dependencies for compatibility (peer dependencies / transitive constraints)
2. Review official migration guide for breaking changes
3. Backup current lock file / manifest
4. Re-run license compatibility check (major upgrades sometimes change licensing)

**Post-upgrade**:

1. Type checking / compilation
2. Unit tests
3. End-to-end tests
4. Manual smoke test of key flows

---

## Central Package Management (per track)

> Centralizing dependency versions at the workspace level prevents version drift across projects and simplifies upgrades. Each track has its own mechanism.

#### Track: dotnet

> **Depth**: expert.

- **`Directory.Packages.props`** at the solution root with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>`.
- All `<PackageVersion>` declarations in this file; per-project `.csproj` uses `<PackageReference Include="X" />` (no `Version=` attribute).
- **`global.json`** pins SDK version (`{"sdk": {"version": "10.0.201", "rollForward": "latestPatch"}}`).
- **`Directory.Build.props`** for repo-wide MSBuild properties (`<TargetFramework>`, `<LangVersion>`, `<Nullable>`, etc.).
- Lockfile: enable with `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>` to produce `packages.lock.json`.

#### Track: python

> **Depth**: expert.

- **`pyproject.toml`** with `[project]` dependencies (PEP 621); `[project.optional-dependencies]` for extras.
- **Lockfiles**: `poetry.lock` (Poetry), `requirements.lock` / `requirements-dev.lock` (rye/uv), `Pipfile.lock` (pipenv).
- **`uv` recommended** for new projects (fast, modern, replaces pip+venv+pip-tools).
- **Constraint files** (`constraints.txt`) for pinning transitive deps without changing direct deps.

#### Track: typescript

> **Depth**: expert.

- **Workspace protocols**: pnpm `workspace:*`, npm `workspaces`, Yarn `workspace:^`.
- **Lockfile**: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`. Always commit.
- **Catalog dependencies** (pnpm 9.5+): `pnpm-workspace.yaml` `catalog:` section pins versions used across packages.
- **`engines`** in `package.json` to pin Node version range.

#### Track: go

> **Depth**: consensus.

- **`go.mod`** + **`go.sum`** at the module root. Always commit both.
- **Multi-module workspaces**: `go.work` lists module paths.
- **`replace` directives** for local development overrides; remove before tagging releases.
- **Minimal version selection (MVS)**: Go uses the *minimum* version that satisfies all constraints, not the latest. Use `go get -u` for major/minor; `go get -u=patch` for patches only.

#### Track: rust

> **Depth**: consensus.

- **`Cargo.toml`** workspace with `[workspace.dependencies]` for shared versions; member crates use `dep.workspace = true`.
- **`Cargo.lock`** committed for binary crates; commit-or-not policy decision for library crates (modern guidance: commit it).
- **`[features]`** for optional functionality; mark default-on features explicitly.
- **`cargo update -p <pkg>`** to bump a single dep; **`cargo update`** to bump everything within `Cargo.toml` constraints.

---

## Version Verification Commands (per track)

#### Track: dotnet

- Check installed packages: `dotnet package list`
- Check transitive dependencies: `dotnet package list --include-transitive`
- Check why a package is present: `dotnet nuget why <pkg>`
- Check newer available versions: `dotnet package list --outdated`
- Search registry: `dotnet package search <pkg> --exact-match --source https://api.nuget.org/v3/index.json`
- Update a specific package: `dotnet package update <pkg>`
- Pin a specific version: `dotnet package add <pkg> --version <ver>`
- Vulnerable: `dotnet list package --vulnerable --include-transitive`

#### Track: python

- Check installed: `pip list` / `poetry show` / `uv pip list`
- Check available: `pip index versions <pkg>` / `poetry show <pkg>`
- Outdated: `pip list --outdated` / `poetry show --outdated`
- Vulnerable: `pip-audit` / `safety check`
- Why is X installed: `poetry show --tree <pkg>` / `pipdeptree -r -p <pkg>`

#### Track: typescript

- Check installed: `npm ls <pkg>` / `pnpm why <pkg>`
- Check available: `npm view <pkg> versions` / `pnpm view <pkg> versions`
- Outdated: `npm outdated` / `pnpm outdated`
- Vulnerable: `npm audit` / `pnpm audit`

#### Track: go

- Check installed: `go list -m all`
- Check available: `go list -m -versions <module>`
- Outdated: `go list -u -m all`
- Vulnerable: `govulncheck ./...`

#### Track: rust

- Check installed: `cargo tree`
- Check available: `cargo search <pkg>` / `cargo info <pkg>` (cargo 1.79+)
- Outdated: `cargo outdated` (requires `cargo-outdated`)
- Vulnerable: `cargo audit`

---

## Dependency Conflict Resolution

### Common Pattern: Transitive Dependency Conflicts

```
Package A requires X >= 1.0, < 2.0
Package B requires X >= 2.0
```

**Resolution Options** (in order of preference):

1. **Skip the update**: Keep current version, document as tech debt
2. **Find compatible version**: Check if newer/older version resolves conflict
3. **Update both packages**: Sometimes updating the conflicting package resolves it
4. **Pin transitive dependency**: Last resort, may cause other issues

> **Example**: A package requiring `libX >=1.0, <2.0` while another requires `libX >=2.0`. Resolution: skip update, document as tech debt, wait for upstream fix.

### Document Skipped Updates

Add to project's tech debt log using this format:

| Package | Current | Target | Reason | Resolution |
|---------|---------|--------|--------|------------|

### Recording the exact constraint chain

When a requested upgrade is blocked by transitive constraints, record the exact parent requirement (e.g., `"fastapi <0.51.0 → starlette <0.51.0"`, `"Microsoft.AspNetCore.App 10.x requires System.Text.Json 10.x"`) in the deferral record to avoid repeated attempts.

---

## Test Coverage Strategy

### Before Each Phase

1. Identify components affected by the upgrade
2. Verify test coverage for those components
3. Add tests if coverage is insufficient

### Coverage Targets by Risk Level

| Risk Level | Minimum Coverage |
|------------|------------------|
| Tooling | N/A (doesn't affect runtime) |
| Patch | Existing coverage sufficient |
| Minor | 80% for affected modules |
| Major | 90% + E2E for critical paths |

---

## Rollback Strategy (cross-track)

**Rule**: Always be able to rollback by restoring the previous lock file from git.

```bash
# Generic pattern (track-appropriate lockfile)
git checkout HEAD~1 -- <lockfile>
<package-manager> install / restore / sync
```

Per-track:

- **dotnet**: `git checkout HEAD~1 -- Directory.Packages.props packages.lock.json` then `dotnet restore`
- **python (poetry)**: `git checkout HEAD~1 -- poetry.lock` then `poetry install --sync`
- **python (uv)**: `git checkout HEAD~1 -- requirements.lock` then `uv pip sync requirements.lock`
- **typescript (pnpm)**: `git checkout HEAD~1 -- pnpm-lock.yaml` then `pnpm install --frozen-lockfile`
- **go**: `git checkout HEAD~1 -- go.mod go.sum` then `go mod download`
- **rust**: `git checkout HEAD~1 -- Cargo.lock` then `cargo build`

Clean install after rollback (remove cached dependencies if needed).

---

## Post-Upgrade Documentation

After successful upgrade, update:

1. `LIBRARY_VERSION_COMPARISON.md` (if exists)
2. Tech debt log (for skipped packages)
3. Migration notes (for major upgrades)
4. License-compatibility audit log (if any new dep added)

---

## Quick Reference: Safe Update Batches

### Always Safe Together

Packages from the same ecosystem that are designed to work together (e.g., a framework and its official plugins, a library and its type definitions, all `Microsoft.AspNetCore.*` packages on the same minor).

### Never Batch (Test Separately)

- Major version upgrades
- Packages with known breaking changes
- Packages affecting authentication/security
- Packages with license changes

---

## Verification Areas

When upgrading dependencies, verify as applicable:

- [ ] Validation and serialization behavior (Pydantic / DataAnnotations / class-validator / serde / encoding/json)
- [ ] Web/API framework behavior and generated output (OpenAPI shape, route matching)
- [ ] ORM / data access behavior and migrations (EF Core / SQLAlchemy / Prisma / sqlx / GORM)
- [ ] UI framework or component behavior (React / Vue / Svelte / Blazor)
- [ ] Linter / analyzer / formatter configuration changes
- [ ] Type-system, SDK, and code-generation changes (compiler version, target framework)
- [ ] License compatibility (per the section above)

---

## Session Report Template

After completing upgrade work:

```
⏱️ Upgrade Session Report
- Phases Completed: [list or range]
- Dependencies Updated: [count]
- Dependencies Deferred/Skipped: [count] (with reasons)
- License Compatibility: [pass/fail; new licenses added]
- Verification Results: [build/tests/checks status]
- Coverage Impact: [before → after, if applicable]
- Known Issues / Follow-up Work: [summary]
```
