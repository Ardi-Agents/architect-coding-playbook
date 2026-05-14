# Merge Review Guide — `feat/multi-track-stack-composition`

> **📜 Archival note**: This document was the merge-review guide for the v0.5.0 multi-track release (PR #4, merged 2026-05-11). The branch is closed; this file is preserved as a historical release-notes artifact for future reference on the rationale and breakage analysis behind the v0.5.0 design. For current usage docs see [`README.md`](./README.md) and [`AGENTS.md`](./AGENTS.md).
>
> **Audience** *(at time of writing)*: collaborators reviewing this branch before merging into `main`.
> **Goal** *(at time of writing)*: explain the change in plain terms, name the benefits, and answer the question "does this break anything?"
> **Companion doc**: [`BRANCH_NOTES.md`](./BRANCH_NOTES.md) — the file-by-file change log.

---

## Read me first (one-minute version)

The original ask was *"weave .NET/C# into this playbook so it has equal footing with Python/Node/Go/Rust."* What landed is a bit broader: instead of bolting a `.NET` track on the side, the playbook now treats **every language as a first-class track** and lets a single repo declare any combination of them. So the same shape that handles a `.NET`-only project also handles a real-world repo with `.NET service + Python ML pipeline + TypeScript frontend` — like the SemanticCompiler family of repos this playbook is being applied to.

**The big idea**: a project's `[APP]__PROJECT_SPECIFIC.md` declares its **Stack Composition** (a table of active language tracks). Each appendix in the playbook carries parallel `#### Track:` subsections (`dotnet | python | typescript | go | rust`) for guidance that genuinely differs by language. Cross-track concepts (build-clean discipline, design-first protocol, scope rules, error-handling philosophy) stay in the kernel and apply universally. The agent applies the right track based on the file extension being edited.

**Backward compatibility**: existing single-track adopters (e.g., a pure-Python project on v0.4.0) keep working with no changes. The new Stack Composition table is additive; if a project doesn't declare one, the agent falls back to whichever track matches the file. Nothing breaks; the agent just becomes more capable for multi-track repos.

---

## How the original design got extended (the "before vs after")

### Before this branch (v0.4.0)

The kernel + 7 appendices were **language-agnostic in policy** (P0–P4 priorities, design-first protocol, scope discipline) but **FOSS-stack-leaning in concrete examples**. Specifically:

- The default tool table in `[APP]__STATIC_ANALYSIS.md` named **Ruff + ESLint + TSC + Mypy + Bandit + Semgrep** — Python and Node/TS only. `.NET` analyzers, `dotnet test`, and Roslyn-based tooling weren't first-class.
- Auth-test exemplars in `[APP]__IMPLEMENTATION.md` were `pytest`, `npm test`, `go test ./auth/...`. No `dotnet test`.
- Coverage commands were `pytest --cov`, `vitest --coverage`, `cargo tarpaulin`. No `dotnet test --collect:"XPlat Code Coverage"`.
- The README install snippets used Bash idioms (`cp -R`, `for f in ...; do mv ...; done`, `ln -s`) without PowerShell parity.
- One concession: `[APP]__DEPENDENCY_UPGRADES.md` had a NuGet block — but it read as a retrofit, not first-class coverage.

In short: the kernel said the right things in the abstract; the appendices spoke Python/Node/TS in their concrete examples. A `.NET` shop adopting the playbook had to translate.

### After this branch (v0.5.0)

Three structural changes:

**(1) Stack Composition declaration.** Every project declares a table at the top of `[APP]__PROJECT_SPECIFIC.md` listing the language tracks it actually uses:

```markdown
## Stack Composition

| Track | Version | Subtree | Notes |
|-------|---------|---------|-------|
| dotnet | .NET 10 / C# 14 | `src-cs/`, `tests/dotnet/` | xUnit.v3 + MTP |
| python | 3.12 | `src/`, `tests/python/` | pytest, ruff, mypy strict |
| typescript | 5.x | `frontend/` | vitest, eslint, tsc strict |
```

Single-track repos have one row. Multi-track repos have N. The table tells the agent which tracks can fire here.

**(2) Per-track subsections inside each appendix.** Where guidance genuinely differs by language, appendices now carry parallel `#### Track:` subsections with depth markers (`expert | consensus | sketch`) so reviewers know how grounded each section is:

```markdown
### Test-Driven Development

#### Track: dotnet
> **Depth**: expert.
- Test framework: xUnit.v3 (preferred for new projects).
- Test runner: `dotnet test --solution <name>.slnx` ...
- Beware MTP flag forwarding — `--no-build` and `-nologo` get passed through ...

#### Track: python
> **Depth**: expert.
- Test framework: pytest.
- Test runner: `pytest tests/ -v` ...

#### Track: typescript
> **Depth**: expert.
- Test framework: vitest (preferred for ESM/Vite stacks); jest acceptable for legacy.
...
```

The agent applies whichever subsection matches the file being edited (`.cs` → `dotnet` track; `.py` → `python` track). The kernel's **Track Discipline rule** prohibits stack-specific terms from leaking into cross-track sections.

**(3) Three new appendix templates** for cross-track patterns the kernel didn't have before:

- `[APP]__DESIGN_POSTURE.md` — locked architectural decisions with explicit backout triggers
- `[APP]__VERSIONING.md` — versioning policy (SemVer / CalVer / ZeroVer) with optional host-runtime pin pattern
- `[APP]__OBSERVABILITY.md` — production diagnostics, structured logging, error-handling, async/concurrency rules

These exist because every track needs them and there was no good place to put them before.

---

## Why this shape (rather than just adding `.NET` content)

A reviewer might fairly ask: *"Why didn't you just add a .NET column to the existing tables?"* Three reasons:

**(1) The repos this is being applied to are already multi-track.** `SemanticCompilerWeb` has Python backend + TypeScript frontend in one repo. Planned `SemanticCompiler` rework will mix `.NET` + Python. A `dotnet | foss` binary couldn't model that — but a list of active tracks can.

**(2) "FOSS" was a sloppy category.** The original playbook used "FOSS" as shorthand for "Python/Node/Go/Rust." But .NET is FOSS too (MIT-licensed runtime, open-source SDK). The cleaner separation is **per-language**: `dotnet`, `python`, `typescript`, `go`, `rust` are first-class peers, and "FOSS" is reclaimed for the licensing dimension where it actually belongs (e.g., the FluentAssertions 6.12.2 license-pin policy in `DEPENDENCY_UPGRADES.md`).

**(3) The agent's working model is per-file, not per-repo.** When an agent edits `Foo.cs`, it should apply `.NET` discipline (xUnit fixtures, ConfigureAwait, Roslyn analyzers). When it edits `bar.py` in the same repo five minutes later, it should apply Python discipline (pytest fixtures, asyncio, ruff). A repo-level enum can't express that fluidity; per-file track resolution can.

---

## What you actually get (the benefits)

### For the .NET community specifically

- **First-class .NET tooling** in every relevant appendix — `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in `STATIC_ANALYSIS.md`, EF Core migrations in `IMPLEMENTATION.md`, ProblemDetails (RFC 7807) in `API_DESIGN.md`, `dotnet-trace`/`dotnet-dump`/`dotnet-counters` in `OBSERVABILITY.md`.
- **xUnit.v3 + Microsoft.Testing.Platform** caveats baked in (e.g., the `--no-build` flag-forwarding gotcha is documented so `dotnet test` doesn't silently fail).
- **`Directory.Packages.props` central package management** treated as the default for new projects.
- **NuGet trusted publishing**, vulnerability scanning (`dotnet list package --vulnerable --include-transitive`), and license compatibility checks all addressed.
- **Roslyn-based structural tools** named in `TOOL_USAGE.md` § Structural Tool Priority (`Microsoft.CodeAnalysis` APIs for programmatic queries).

### For multi-track repos

- A single playbook installs once and serves every language used in the repo. No more "I have a Python backend so I'll use the Python playbook... but the TS frontend is undocumented."
- The Stack Composition table is the durable record of *what the repo actually contains* — useful for onboarding new contributors and for agents resuming work on cold context.

### For everybody (including single-track)

The kernel gained six **agent-native working rules** that improve agent behavior across every project:

- **Evidence-tier discipline** (VERIFIED / READ / INFERRED / GUESSED) — every non-trivial assertion gets graded; below-VERIFIED is promoted via investigation or explicitly flagged. Reduces the "agent confidently states a hallucinated fact" failure mode.
- **No prose without verification** — comments, doc-strings, commit messages are claims that get checked before commit (grep symbol references, measure performance, probe behavior).
- **Deferral hygiene** — "future work" requires explicit user authorization. No silent deferrals.
- **Adversarial-review checkpoint** — claim-heavy outputs (state reports, audits) get attacked before publication.
- **Tool-priority rule** — structural tools first; grep is the fallback.
- **Acceptance-tests-over-touch-points** — every unit-of-work plan declares the assertion that proves it landed against real data.

These rules existed in some collaborators' personal `~/.claude/CLAUDE.md` files; this branch lifts them into the playbook so adopters get them by default.

### Cross-track patterns that didn't have a home before

- **Locked decisions with backout triggers** (`DESIGN_POSTURE.md`) — replaces "we picked SQLite because reasons" prose with a structured record naming what would justify reopening the decision.
- **Versioning policy with scheme selection** (`VERSIONING.md`) — opens with SemVer / CalVer / ZeroVer / Custom and a project declaration.
- **Production diagnostics + structured logging** (`OBSERVABILITY.md`) — every track has its profiler and tracer; this consolidates the cross-stack discipline.

---

## Does it break existing functionality?

### Short answer

**No, with two caveats**: (a) it intentionally changes agent behavior in ways that are improvements, not breakage; (b) existing v0.4.0 installs need a one-time upgrade pass when adopting v0.5.0.

### Compatibility matrix

| Concern | Status | Notes |
|---------|--------|-------|
| Single-track repo (e.g. pure Python) using v0.4.0 | **Unchanged** | Still works. The agent applies the python track to `.py` files, ignores tracks that don't fire. |
| Multi-track repo (the new case) | **New capability** | Previously had to choose one track or use the playbook awkwardly. Now first-class. |
| Cross-tool compatibility (Cursor, Codex, Windsurf, Claude Code) | **Unchanged** | The kernel still loads as `AGENTS.md` (or `@AGENTS.md` for Claude Code). The shape didn't change. |
| `[APP]__` token-substitution at install time | **Unchanged** | Three new appendix files added to the substitution list; mechanism is identical. |
| `/verify-install` drift check | **Works, with new hashes** | The 4 template files modified by the org-rename commit have recomputed SHA256 hashes in `install.manifest.json`. New installs hash-match. |
| Existing v0.4.0 installs upgrading to v0.5.0 | **Manual upgrade required** | Three new appendix files don't exist in old installs; running the setup flow installs them. Existing customizations of templates would be flagged as drift by `/verify-install` (with `userModified: true`) — same posture as before. |
| Agent behavior on existing prompts | **Changed by design** | The new agent-native rules (evidence-tier discipline, no-prose-without-verification, deferral hygiene, adversarial-review checkpoint) make agents more rigorous and verifiable. Some prompts that previously got fast-confident answers will now get fast-confident answers PLUS verification steps. This is the intent. |

### What I cannot guarantee without further testing

These are claims I'd label **READ** or **INFERRED**, not VERIFIED. A reviewer who wants higher confidence should run them:

- **The full setup flow against a clean home directory.** I haven't run `@CLAUDE_CODE/SETUP.md` end-to-end against a virgin `~/.claude/`. I'm INFERRING success from: (a) only file content changed, (b) the install logic in SETUP.md iterates `manifest.agentsCopy.appendicesDir.files` rather than hardcoding the count, (c) hash recomputation was done correctly. A clean install would confirm.
- **`/verify-install` against a fresh install.** Should pass given the recomputed hashes. Not run.
- **Agent behavior under the new rules in practice.** I've INFERRED that the rules will fire correctly because they auto-load via the kernel and follow the same trigger-phrase pattern as existing rules. Not measured.
- **Multi-track behavior in real sessions.** The design says "agent applies dotnet track to `.cs`, python track to `.py`, etc." That's a behavioral claim about the agent following its instructions; I haven't simulated it.

### What I can guarantee (VERIFIED)

- All 10 appendices have `> **Owns**:` and `> **Fires when**:` headers. (grep verified)
- All `#### Track:` headers use the canonical 5 names. (grep verified)
- The kernel's Appendix Index lists all 10 appendices on disk. (cross-checked)
- The install manifest's `agentsCopy.appendicesDir.files` matches filesystem. (cross-checked)
- Cross-referenced sections in the kernel resolve in the target appendices. (grep verified for: Build-Clean Posture, Database Updates, License Compatibility, Structural Tool Priority, Pre-/Post-Edit Lifecycle Ritual, Authentication, Choose Your Scheme, Error-Handling Philosophy, Structured Logging Discipline, Async/Concurrency Discipline, Production Diagnostics)
- No remaining `SCG / BOUML / NiemBouml / .NET C# Work` references anywhere. (grep verified)
- No remaining `farshadas/architect-coding-playbook` references except the legitimate `@farshadas` GitHub-handle attribution in `CONTRIBUTORS.md`. (grep verified)
- The 4 template-file SHA256 hashes in `install.manifest.json` match the actual file contents after the org-rename. (Get-FileHash recomputed)
- `toolVersion` is `0.5.0` in both the install manifest and `claude-code-plugin/.claude-plugin/plugin.json`. (grep verified)

---

## Recommended verification before merge

If reviewers want higher confidence than my INFERRED claims, the cheapest things to run:

1. **Clean-install dry run.** `git clone <branch>` into a sandbox, point Claude Code at it, paste the install prompt from `README.md`. Confirm the setup flow produces the 10 expected appendices in a target project.
2. **`/verify-install` post-install.** Should report all-OK against the v0.5.0 manifest.
3. **Multi-track sanity check.** Open a project with both `.py` and `.cs` files (or scaffold one). Edit one of each, ask Claude Code "what's the build-clean posture for this?", confirm it gives the right per-track answer.
4. **Single-track regression check.** Open an existing pure-Python or pure-TS project that adopted v0.4.0. Confirm v0.5.0's templates can be applied without losing project-specific customizations (the install flow's diff-and-confirm gating handles this).

None of these are required for merge — they're confidence builders.

---

## Discussion points for the merge meeting

Five decisions this branch makes that reviewers may want to revisit:

1. **Track names**: lowercase `dotnet | python | typescript | go | rust`. Should `csharp` and `fsharp` be separate tracks (they share a runtime but have different idioms)? Today both go under `dotnet`. Same question for JavaScript-only-not-TypeScript, currently rolled into `typescript`.

2. **VERSIONING.md scheme selection**: currently SemVer is the recommended default with CalVer / ZeroVer / Custom acknowledged as alternatives. Some shops prefer pure-CalVer for applications. Do we want the playbook to be more or less opinionated about this?

3. **Three new appendix templates always installed**. Single-track repos that don't need DESIGN_POSTURE / VERSIONING / OBSERVABILITY get them anyway and may delete what they don't want. Trade-off: simpler install logic vs slightly more "what is this for?" friction.

4. **Authentication is OPTIONAL** in `API_DESIGN.md`. Projects without auth skip the whole section. Reviewers should confirm this gating is correctly worded for non-auth projects.

5. **Plugin / manifest version 0.4.0 → 0.5.0**. Minor bump because the change is additive (no breaking changes for existing single-track adopters). Not a major bump because nothing was removed from the public install surface. Reviewers should confirm this version-bump magnitude is right.

---

## Commits in this branch (vs `main`)

```
b3e686a  chore(org): update repo refs farshadas -> Ardi-Agents after transfer
2e3b9fe  Distill branch notes by removing tool-specific content
8a928f6  docs: add BRANCH_NOTES.md summarizing the multi-track distillation
656ef14  fix(plugin): bump plugin.json version 0.4.0 -> 0.5.0 to match install manifest
1fe542c  feat(playbook): multi-track Stack Composition + agent-native rules
5167b6c  baseline: import .NET/C# overlay for distillation (deleted at end of distillation)
```

**Net diff vs main**: 16 files changed, +2315 / −397 lines.

---

## Quick links

- [`BRANCH_NOTES.md`](./BRANCH_NOTES.md) — file-by-file change log
- [`AGENTS.md`](./AGENTS.md) — the kernel after this branch lands
- [`AGENTS/[APP]__PROJECT_SPECIFIC.md`](./AGENTS/%5BAPP%5D__PROJECT_SPECIFIC.md) — see Stack Composition declaration
- GitHub compare: https://github.com/Ardi-Agents/architect-coding-playbook/compare/main...feat/multi-track-stack-composition

---

*Reviewer-friendly summary produced 2026-05-09. The full session log is available on request — happy to walk anyone through specific decisions in person.*
