# NiemBouml Agent Operating System

> **Owns**: Repository kernel — precedence, safety boundaries, stack baseline, completion gates, solution identity, design principles, the domain map itself. Cascades to the entire repo unless a deeper `AGENTS.md` overrides it.

## 1) Purpose and precedence

This file is the kernel for AI-assisted development in NiemBouml — a
clean-room Apache-2.0 reimplementation of bouml's plug-out host so
niem-tools can be shared with a standards organization without GPL
contamination.
Background, locked decisions, current state, and re-entry checklist
live in `AGENTS/BOUML__PROJECT_SPECIFIC.md`.

Before planning or executing work:

1. Read this file.
2. Read `AGENTS/BOUML__PROJECT_SPECIFIC.md`.
3. Read `AGENTS/BOUML__DESIGN_POSTURE.md`.
4. Read any additional SOP files referenced by the subtree you are editing.

Priority order when guidance conflicts:

- **P0** — Security / data integrity / irreversible impact / clean-room contamination
- **P1** — Correctness / tests / buildability
- **P2** — Scope / architecture / repository boundaries
- **P3** — Code quality / maintainability / clarity
- **P4** — Simplicity / convenience

## 2) Read-Verify-Write rule

- Do not modify a file you have not just read.
- Do not claim a change is correct until you have verified it with the
  appropriate build and test commands.
- If the same command fails twice for the same underlying reason, stop
  repeating it and change approach.

## 3) Stack and architectural baseline

- Language: **C# 14** (`<LangVersion>14</LangVersion>` in `Directory.Build.props`)
- Framework: **.NET 10** (`net10.0`); SDK pinned via `global.json` to 10.0.201
- Test framework: **xUnit.v3** (`xunit.v3.mtp-v2` 3.2.2) + **FluentAssertions** 6.12.2 (last MIT release)
- Test runner: **Microsoft.Testing.Platform** (MTP) — `dotnet test --solution NiemBouml.slnx`; do NOT pass `--no-build` or `-nologo` (forwarded to test exes, breaks discovery)
- Local development environment: **Windows 11**
- Version control and CI/CD: **GitHub**

Wire format and infrastructure choices (JSON-RPC library, TCP server stack,
C++ stub JSON library) are deferred — see `AGENTS/BOUML__PROJECT_SPECIFIC.md` § Deferred work.

## 4) Non-negotiable safety boundaries

- **Clean-room discipline.** Never read bouml source. No
  `gregsmirnov/bouml`, no fork, no source mirror. Permitted reference
  material is enumerated in `AGENTS/BOUML__PROJECT_SPECIFIC.md` § Clean-room discipline. Document
  the source of every spec claim — auditable trail.
- Never hardcode secrets, encryption keys, connection strings, tokens, or
  API keys. Prefer `IConfiguration`, environment variables, or per-user
  secrets.
- Do not delete files, run `git reset --hard`, or run `git push --force`
  without explicit human approval.

## 5) Dependency and package policy

- Central package management via `Directory.Packages.props`.
- Minimize new dependencies; prefer the existing baseline first.
- Prereleases allowed when an upstream library forces it; pin exact
  versions and build + test in the same commit when bumping.
- Every new dependency must be Apache-2.0-compatible — i.e. permissive:
  MIT, Apache-2.0, BSD-2/3-Clause, ISC, Zlib, MS-PL, Unlicense, CC0.
  No GPL (any version), no LGPL, no AGPL, no commercial-only.
  FluentAssertions is pinned to 6.12.2 specifically because 7.0+ went
  commercial under Xceed.

## 6) Completion gates

A task is not complete until all applicable items below are satisfied:

- The touched code builds clean (0 warnings, 0 errors).
- Relevant tests pass.
- New or changed business logic is accompanied by xUnit tests.
- Public contract changes are reflected in tests and docs.
- The final report states exactly what was verified and what was not.

## 7) Coverage policy

- Repository enforces an **80% minimum** coverage bar on changed code.

## 8) Repository conventions

- Keep changes tightly scoped.
- Prefer conventional commits: `type(scope): description`.
- Folder layout:
  - `/src` — library and application code (four projects: `Core`, `Protocol`, `Host`, `Cli`)
  - `/tests` — automated tests (four projects, including `IntegrationTests`)
  - `/cpp-stub` — placeholder for the C++ Apache-2.0 stub library (deferred)
  - `/.github` — GitHub workflows and automation
- **300-line cap is advisory; clarity wins.** Aim for every contributor-facing
  Markdown file under 300 lines (encourages focused per-document scope and
  agent-context efficiency), but never compress at the cost of clarity —
  line-count rules serve clarity, not the reverse. When a file would need to
  lose meaningful content to fit the cap, leave it long; if surprised, ASK
  whether the rule should bend.
  - **Explicitly exempt** (these grow as the project grows; trimming damages
    function): `AGENTS/BOUML__SCG_CATALOG.md` (project-specific notes on how
    to use SCG effectively in this repo; readability matters more than
    length), and any file whose primary purpose is reference / canonical
    documentation rather than procedural guidance for an in-flight task.
  - **In scope for the guideline**: per-feature SOPs, `AGENTS.md` itself,
    root `CLAUDE.md` (the SCG catalog block in `CLAUDE.md` is auto-synced
    by `scg sync-claude-md` and is exempt; project-authored prose around
    the block is in scope).
  - **User-facing docs** (`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, any
    top-level file whose audience is humans evaluating or onboarding) are
    exempt entirely — value quality over brevity.
- For user-facing docs (the exempt set above): **value quality over brevity,
  but keep prose concise and well-organized**. Brevity is a means, not the
  goal — never compress out content that helps a first-time reader at the
  cost of hand-waving. When a user-facing doc reaches **≥250 lines or ≥6
  top-level (`##`) sections**, add a table of contents at the top linking
  to each section below. Re-check the TOC whenever a section is added,
  removed, or renamed.

## 9) Solution and command discovery

- Authoritative solution: **`NiemBouml.slnx`**.
- Build and test always from the solution file, never a single project.
- Repository-specific commands and layout live in
  `AGENTS/BOUML__PROJECT_SPECIFIC.md`.

## 10) Domain ownership map

This table is the **single source of truth** for which file owns which
topic. Each SOP declares its scope in an `> **Owns**:` header matching the
entry here. A concept appears in exactly one row.

| File | Owns |
|------|------|
| `AGENTS.md` (this file) | Repository kernel — precedence, safety boundaries, stack baseline, completion gates, solution identity, design principles, the domain map itself. |
| `AGENTS/BOUML__PROJECT_SPECIFIC.md` | Project objective + background, clean-room discipline, locked decisions, current state of the solution (layout, stack, build/run/test), re-entry checklist, deferred-work backlog, open research items, public source list, established architectural facts. |
| `AGENTS/BOUML__DESIGN_POSTURE.md` | Locked architectural decisions with backout triggers. |
| `AGENTS/BOUML__CONSISTENCY_CHECKS.md` | Repeatable audit checks that verify the rules owned by the other files. |
| `AGENTS/BOUML__SCG_CATALOG.md` | Project-specific guide to using SCG in NiemBouml — which queries to reach for, useful starting points for the NiemBouml graph, blind spots that matter here. |
| `AGENTS/BOUML__VERSIONING.md` | Versioning policy for NiemBouml. |
| `tests/AGENTS.md` | Test-strategy contract — coverage expectations, fixture solutions, integration-test discipline. |
| `.github/AGENTS.md` | GitHub automation — workflow scope, OIDC policy, CI gates. |

When a new top-level SOP arrives, add a row here in the same change, and
give the new file a matching `> **Owns**:` header.

## 11) Design principles

> **TBD.** Items expected to land here as the implementation matures —
> clean-room construction discipline, alignment with public bouml.fr
> documentation as the canonical spec source, Apache-2.0 surface,
> wire format ours-to-design (no bouml wire compatibility required),
> niem-tools as the acceptance gate. Authored once Scope-1 implementation
> is far enough along to honestly describe the principles in operation.
