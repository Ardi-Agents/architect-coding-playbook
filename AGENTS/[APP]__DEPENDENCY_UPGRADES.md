# Appendix: Dependency Upgrade Best Practices

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.1 | **Updated**: 2026-01-22
> **Scope**: Guidelines for safe, systematic dependency upgrades

---

## Overview

This document provides a battle-tested methodology for upgrading dependencies across full-stack applications with minimal risk and clear failure attribution.

---

## Core Principles

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

> **Example** (Python/npm):
> ```bash
> pip index versions <package>
> npm view <package> versions --json | tail -20
> ```

---

## Phased Upgrade Checklist

### Phase 0: Baseline & Safety Net
- [ ] All tests pass on current code
- [ ] Lock files committed (e.g., `poetry.lock`, `package-lock.json`, `yarn.lock`, `Cargo.lock`)
- [ ] CI/CD pipeline green
- [ ] Document current coverage percentage

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

### Phase 4: Frontend Infrastructure Validation
**Purpose**: Ensure build tooling stable before major UI framework upgrades

**Rule**: Clean install, run all tests, lint, code analyzers, and production build before proceeding to major upgrades.

### Phase 5: Major Upgrades
**Risk**: HIGH — semantic and lifecycle changes

**Pre-upgrade**:
1. Check all dependencies for compatibility (peer dependencies)
2. Review official migration guide for breaking changes
3. Backup current lock file

**Post-upgrade**:
1. Type checking / compilation
2. Unit tests
3. End-to-end tests
4. Manual smoke test of key flows

---

## Dependency Conflict Resolution

### Common Pattern: Transitive Dependency Conflicts
```
Package A requires X>=1.0,<2.0
Package B requires X>=2.0
```

**Resolution Options** (in order of preference):
1. **Skip the update**: Keep current version, document as tech debt
2. **Find compatible version**: Check if newer/older version resolves conflict
3. **Update both packages**: Sometimes updating the conflicting package resolves it
4. **Pin transitive dependency**: Last resort, may cause other issues

> **Example**: A package requiring `libX >=1.0,<2.0` while another requires `libX >=2.0`. Resolution: skip update, document as tech debt, wait for upstream fix.

### Document Skipped Updates
Add to project's tech debt log using this format:

| Package | Current | Target | Reason | Resolution |
|---------|---------|--------|--------|------------|

---

## Version Verification Commands

Use your package manager's commands to:
1. Check current installed version
2. Check available versions in registry
3. Check direct/transitive dependencies and dependency reasons
4. Update specific packages

> **Examples** by ecosystem:
> - **Python (pip/poetry)**: `pip index versions <pkg>`, `poetry show <pkg>`
> - **Node (npm/yarn/pnpm)**: `npm view <pkg> versions`, `npm ls <pkg>`
> - **Rust (cargo)**: `cargo search <pkg>`, `cargo update -p <pkg>`
> - **Go**: `go list -m -versions <module>`
> - **.NET / NuGet**:
>   - Check installed packages: `dotnet package list`
>   - Check transitive dependencies: `dotnet package list --include-transitive`
>   - Check why a package is present: `dotnet nuget why <pkg>`
>   - Check newer available versions: `dotnet package list --outdated`
>   - Search registry / list package versions: `dotnet package search <pkg> --exact-match --source https://api.nuget.org/v3/index.json`
>   - Update a specific package: `dotnet package update <pkg>`
>   - Pin a specific version: `dotnet package add <pkg> --version <ver>`
---

## Poetry Commands Reference (Python)

### Check Versions
```bash
# Show installed version of a package
poetry show <package>

# Check for outdated packages
poetry show --outdated

# Check dependency tree
poetry show --tree
```

### Update Packages
```bash
# Update specific package
poetry update <package>

# Update all within constraints
poetry update

# Add new package
poetry add <package>

# Add dev dependency
poetry add --group dev <package>
```

### Lock File Management
```bash
# Regenerate lock file
poetry lock

# Install from lock file (CI)
poetry install --no-root

# Export to requirements.txt (for legacy tooling)
poetry export -f requirements.txt --output requirements.txt
```

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

## Rollback Strategy

**Rule**: Always be able to rollback by restoring the previous lock file from git.

```bash
# Generic pattern
git checkout HEAD~1 -- <lockfile>
<package-manager> install
```

Clean install after rollback (remove cached dependencies if needed).

---

## Post-Upgrade Documentation

After successful upgrade, update:
1. `LIBRARY_VERSION_COMPARISON.md` (if exists)
2. Tech debt log (for skipped packages)
3. Migration notes (for major upgrades)

---

## Quick Reference: Safe Update Batches

### Always Safe Together
Packages from the same ecosystem that are designed to work together (e.g., a framework and its official plugins, a library and its type definitions).

### Never Batch (Test Separately)
- Major version upgrades
- Packages with known breaking changes
- Packages affecting authentication/security

---

When upgrading dependencies, verify as applicable:

- [ ] Validation and serialization behavior
- [ ] Web/API framework behavior and generated output
- [ ] ORM/data access behavior and migrations
- [ ] UI framework or component behavior
- [ ] Linter/analyzer/formatter configuration changes
- [ ] Type-system, SDK, and code-generation changes
---

## Dependency Constraints
- When a requested upgrade is blocked by transitive constraints, record the exact parent requirement (e.g., "fastapi <0.51.0 → starlette <0.51.0") in the summary to avoid repeated attempts.

---

## Session Report Template

After completing upgrade work:
```
⏱️ Upgrade Session Report
- Phases Completed: [list or range]
- Dependencies Updated: [count]
- Dependencies Deferred/Skipped: [count] (with reasons)
- Verification Results: [build/tests/checks status]
- Coverage Impact: [before → after, if applicable]
- Known Issues / Follow-up Work: [summary]
```
