# SCG Versioning Strategy

> **Owns**: How SCG's NuGet package version is composed, how it relates to
> the pinned Roslyn version, and how to bump either independently. Single
> source of truth for the SCG-vs-Roslyn version-coupling story.

## Scheme — SemVer 2.0 prerelease tag

SCG NuGet package versions follow **SemVer 2.0 with a Roslyn-pinning
prerelease tag**:

```
<SCG-MAJOR>.<SCG-MINOR>.<SCG-PATCH>-roslyn<ROSLYN-MAJOR>.<ROSLYN-MINOR>.<ROSLYN-PATCH>
```

Examples:

- `1.0.0-roslyn5.3.0` — first stable SCG release, built against Roslyn 5.3.0.
- `1.1.0-roslyn5.3.0` — SCG feature release; Roslyn pin unchanged.
- `1.1.1-roslyn5.3.0` — SCG patch (walker bug fix, query envelope fix); Roslyn pin unchanged.
- `2.0.0-roslyn5.4.0` — SCG breaking change AND Roslyn bump in the same release.
- `1.1.0-roslyn5.4.0` — SCG feature release that also bumped Roslyn (for new C# syntax support).

Read out loud: "SCG 1.0.0 built against Roslyn 5.3.0."

## Why this scheme

Independent SCG semver + machine-readable Roslyn pin. Three properties
matter:

1. **SCG owns its own cadence.** A walker bug fix or new query that doesn't
   touch Roslyn ships as a normal SCG patch / minor. SCG isn't held hostage
   to Microsoft's six-week SDK-minor cadence.
2. **The Roslyn pin is visible without reading code.** A user looking at
   `scg --version` (or the package metadata on a feed) immediately sees
   which Roslyn drop the analysis is grounded in. Important for "does this
   SCG version know about C# 14 features?"
3. **NuGet-native.** SemVer 2.0 prerelease tags are first-class in NuGet;
   no custom metadata file or sidecar manifest needed.

## Source of truth

The Roslyn pin in the prerelease tag MUST match
`Directory.Packages.props`:

```xml
<PackageVersion Include="Microsoft.CodeAnalysis.CSharp" Version="5.3.0" />
<PackageVersion Include="Microsoft.CodeAnalysis.CSharp.Workspaces" Version="5.3.0" />
<PackageVersion Include="Microsoft.CodeAnalysis.Workspaces.MSBuild" Version="5.3.0" />
```

All three Microsoft.CodeAnalysis.\* packages MUST stay at the same version
(MSBuildWorkspace's BuildHost wire protocol is internal and not stable
across drops; mixing versions fails ungracefully).

The version string is composed from `Directory.Build.props` (or per-csproj
`<Version>`) plus a `<VersionSuffix>` that encodes the Roslyn pin. CI
should fail-the-build when the suffix and `Directory.Packages.props`
disagree.

## When to bump SCG semver

- **MAJOR** — breaking change to the public CLI surface (command
  removed / renamed, JSON envelope shape change consumers depend on,
  default-flag flip).
- **MINOR** — new command, new query, new flag with a default that
  preserves prior behavior.
- **PATCH** — walker bug fix, query envelope fix, internal refactor,
  doc-only change.

A Roslyn bump alone does NOT force an SCG major. It MAY force one if the
Roslyn API surface change cascades into a walker contract change SCG
consumers depend on (rare).

## When to bump the Roslyn pin

Bump only when there's a needed feature:

- New C# syntax to parse (e.g. `field` keyword landed in Roslyn 5.x).
- New `SemanticModel` API that simplifies a walker.
- Walker bug fix in upstream Roslyn that SCG was working around.

Otherwise the pin sticks. Roslyn's six-week minor cadence is
faster than SCG's release cadence by design.

## Tracking new Roslyn releases

Two automated layers monitor upstream so a bump is never a surprise:

- **Dependabot** (`.github/dependabot.yml`) groups all
  `Microsoft.CodeAnalysis.*` packages onto one PR whenever NuGet
  publishes a new minor or patch. Runs **daily** so the PR shows
  up within 24h of NuGet publication. Major bumps come as separate
  PRs (deliberately — major requires walker-shape review). Test
  tooling (xunit, Microsoft.Testing.\*, FluentAssertions, coverlet)
  is grouped on its own track so a tooling bump doesn't get blocked
  behind a tricky Roslyn one.
- **Roslyn canary** (`.github/workflows/roslyn-canary.yml`) runs
  **daily** (and on manual dispatch). Detection-only: polls
  NuGet's flat-container API for the latest published
  `Microsoft.CodeAnalysis.*` (including prereleases) and, when it
  differs from the pin AND no tracking issue is already open for
  it, opens a labeled GitHub Issue assigned to the maintainer.
  **Does not build or test.** The signal arrives via the issue
  list (also surfaced at Claude session-start per root
  `AGENTS.md` §1a) and via the assignee/@-mention email paths.

**Why detection-only, not build-and-test.** SCG's test suite has
Windows-specific assumptions (hardcoded `C:\dev\` paths, the
`C:\Program Files\dotnet` lookup in `SystemDotnetHost`, the
`LargeSolutionBenchmark` Roslyn.slnx target) so a Linux GitHub
runner cannot faithfully validate "does this Roslyn version
actually work?" — both green and red verdicts would be noisy. The
authoritative validation environment is the local Windows machine;
that's where the bump cycle's playbook (§ Roslyn-bump checklist
below) runs. CI's job here is just "tell me a new version exists,
with the email." Cost: a few seconds per daily run, ~30 Actions
minutes/year.

**Why daily, not weekly.** The goal is "SCG is ready when users see
the new Roslyn." Roslyn's NuGet publication is a real-time event;
.NET SDK releases follow within hours-to-days. Weekly cron would
leave a worst-case 6-day window. Daily caps detection at ≤24h.

Manual checking is no longer the primary path. When the canary or
Dependabot fires, the validation playbook below kicks in.

## Decision: act now vs wait

Not every detected version warrants immediate bump work. Early
prereleases are moving targets — Microsoft fixes regressions
through the preview cycle, and the version that lands as `preview1`
on NuGet today often differs in tested behavior from what ships as
GA 4-8 weeks later. Bumping against `preview1` and shipping a SCG
release for it can mean re-doing the work when `preview2` /
`preview3` / `RC1` / GA each correct things.

**Default: wait for the most stable target you can.**

Decision matrix (apply when synthesizing the next-version timing
report at session-start, per root `AGENTS.md` §1a Step 2):

| Detected version | Next stable target ETA | Recommend |
|---|---|---|
| `preview1` / `preview2` | < 2 weeks | **Wait** for the closer target |
| `preview1` / `preview2` | 2-6 weeks | **Wait** unless a specific reason to act now |
| `preview3` / later preview / `RC1` | < 2 weeks | **Probably wait** for RC / GA |
| `RC*` | < 2 weeks | **Judgment call** — RCs are usually GA-stable |
| GA / stable | n/a | **Act now** — this is the stable target |

**Specific reasons that override "wait":**

- A consumer of SCG (Cardamom or otherwise) explicitly needs SCG to
  support analyzing code that uses a feature only in this prerelease.
- A walker bug fix in the upstream Roslyn drop that SCG was working
  around — bumping unblocks deletion of the workaround.
- Coordinated release: SCG's own release timing is constrained by
  another wave of work landing in the same window.

The rule's purpose: avoid burning effort on a version we'll
re-validate in 3 weeks anyway. The canary tracking issue is the
*invitation* to consider a bump; the timing report is the *input*
to the decision; this rule is the *default*.

## Local-machine preflight before starting a bump

Bump development happens on the local Windows machine (not in CI).
Both the SCG repo and the Roslyn repo at `C:\dev\roslyn` need to be
in a known state before opening a bump branch. Run:

```pwsh
pwsh ./scripts/preflight-roslyn-bump.ps1
```

The script verifies (does NOT auto-fix):

**SCG repo:**
- On `main`, working tree clean, in sync with `origin/main` —
  prevents experimental changes leaking into bump commits.
- Dogfood DB at `.scg/SemanticCodeGraph.db` is present and < 7
  days old. This is the **node/relationship baseline** the bump
  validation diffs against (`query diff --from <baseline> --to
  <new>`) to catch walker silent-degradation. Stale baselines
  give false-positive diff signal.

**Roslyn repo (`C:\dev\roslyn`):**
- Bootstrapped SDK present at `.dotnet\dotnet.exe` (Restore.cmd
  output). Required because `LargeSolutionBenchmark` sets
  `DOTNET_HOST_PATH` to this exe so MSBuildWorkspace's BuildHost
  uses Roslyn's pinned SDK to load `Roslyn.slnx`.
- `Roslyn.slnx` restored — at least one `project.assets.json`
  exists under the Roslyn tree. Without restore, MSBuildWorkspace
  loads but every Compile reference fails to resolve and
  extraction silently degrades (graph emits but with artificially
  low relationship density — looks fine, isn't).

Each failed check carries a remediation command in the script's
output. Fix the failures, re-run the preflight, then proceed with
the Roslyn-bump checklist below.

## Roslyn-bump checklist

When bumping the Roslyn pin in `Directory.Packages.props`:

1. Update all three Microsoft.CodeAnalysis.\* package versions in lock-step.
2. Update `<VersionSuffix>` in `Directory.Build.props` (or whatever orchestrates the prerelease tag).
3. Re-run the dogfood extract on `SemanticCodeGraph.slnx` and confirm node / relationship counts match prior baseline (catches walker breakage).
4. Re-run `LargeSolutionBenchmark.Extract_completes_within_budget_against_pre_built_solution` against `Roslyn.slnx` to verify MSBuildWorkspace + BuildHost still work.
5. Update this doc's example tags to match the new pin (worked example consistency).
6. Commit message names the new Roslyn version explicitly: `chore(deps): bump Roslyn 5.3.0 → 5.4.0`.

## Relationship to the user's `.NET SDK` install

Independent. SCG's pinned Roslyn 5.3.0 ships **inside SCG's own DLLs**
(NuGet-restored at build time). The user's installed .NET SDK
(10.0.106, 10.0.201, 11.x...) is irrelevant for the analysis SCG
performs. Where the user's SDK matters: when `MSBuildWorkspace` opens
the user's `.slnx`, it dispatches to MSBuild via a BuildHost — that
BuildHost needs the user's installed dotnet host to be one its protocol
can talk to.

## Out of scope

- **Multi-version SCG matrix.** SCG ships ONE Roslyn pin per release.
  No parallel maintenance of "SCG-for-Roslyn-4.x" alongside
  "SCG-for-Roslyn-5.x." Forks are user-driven, not project-supported.
- **Pre-release SCG tags beyond the Roslyn pin** (e.g. `-alpha`, `-beta`).
  When introducing those, prefix with the Roslyn pin first:
  `1.2.0-roslyn5.3.0.alpha1` reads correctly under SemVer 2.0 prerelease
  ordering. Don't reverse the order.
