# NiemBouml Consistency Checks Catalog

> **Parent**: [AGENTS.md](../AGENTS.md)
> **Owns**: Repeatable audit checks that verify the rules owned by the other files.
>
> Adapted from the SemanticCodeGraph consistency-checks catalog. Run iteratively — each pass has limited depth, so re-running the same check peels the next layer.

## When to run

**Mandatory before `git commit` at the end of every phase.** The full
suite is part of the phase Definition of Done — not an afterthought.
If a check fails, either fix it before committing or document the
waiver (what, why, tracking issue) in the commit message.

Additionally run:
- After any change that touches `AGENTS/*.md`, `.slnx`, `*.csproj`,
  `Directory.Build.props`, or `Directory.Packages.props`.
- After any change to `cpp-stub/` (clean-room boundary changes).
- Before opening a PR.

---

## 1. Entry point integrity

Every project with `<OutputType>Exe</OutputType>` (currently only
`NiemBouml.Cli`) has a reachable entry point that compiles and resolves
its dependencies. `NiemBouml.slnx` lists only projects that exist on
disk, and every `.csproj` on disk is listed in `.slnx`.

Quick check:
```bash
dotnet build NiemBouml.slnx -v:minimal
```

## 2. Cross-project reference health

Every `<ProjectReference>` resolves. Every `<PackageReference>` resolves
against `Directory.Packages.props`. No stale `InternalsVisibleTo` entries.

**Layering rules** (per `BOUML__PROJECT_SPECIFIC.md` § Current state of the solution):

- `NiemBouml.Core` has **no dependency on `NiemBouml.Protocol`**. Core
  owns the UML metamodel + `.prj` parser; Protocol owns wire DTOs. The
  one-way arrow is enforced.
- `NiemBouml.Host` depends on `Core` + `Protocol`.
- `NiemBouml.Cli` depends on `Host` only.

Quick check:
```bash
scg query callers "type:NiemBouml.Protocol.*" --database .scg/NiemBouml.db
```
Any caller from inside `NiemBouml.Core` is a violation.

## 3. Stale comments and references

Grep for names of deleted types, interfaces, methods, namespaces. Check
for `// TODO`, `// HACK`, and outdated API references. `.csproj`
properties mentioned in comments must match `.csproj` reality.

## 4. Documentation separation of concerns

Root `AGENTS.md §10` is the **single source of truth** for which file
owns which topic.

- Every `AGENTS.md` and `AGENTS/*.md` has an `> **Owns**:` header.
- Every file in §10 exists on disk; every file on disk appears in §10.
- No topic keyword appears in two `Owns:` headers.

Quick check (PowerShell):
```powershell
Get-ChildItem -LiteralPath AGENTS.md, AGENTS -Filter '*.md' -Recurse |
  ForEach-Object {
    if (-not ((Get-Content $_.FullName -TotalCount 5) -match '^> \*\*Owns\*\*:')) {
      "MISSING: $($_.FullName)"
    }
  }
```

## 5. Documentation referential integrity

Every type, interface, namespace, file path, or command mentioned in
docs exists in the code. Broken cross-references (paths, filenames,
casing) count as violations.

## 6. Test coverage gaps

Every public type and non-trivial method in `src/*` has coverage in
the matching `tests/*.Tests` project. Coverage ≥ 80% on changed code
per root `AGENTS.md §7`. Skipped tests (`[Fact(Skip="...")]`) have a
live reason and tracking issue.

NiemBouml-specific product-surface invariants will land here as the
implementation matures (`.prj` parser round-trip, JSON-RPC wire
serialization round-trip, host dispatch coverage). Deferred until
those subsystems exist.

## 7. Dead code detection

Zero-caller types, methods, interfaces, extension methods, and `internal`
helpers. Use compiler warnings (CS0168, IDE0051, IDE0052, CA1822)
rather than manual greps where possible. Cross-reference with
`scg query orphans` for structural confirmation.

## 8. Runbook accuracy

Every `dotnet build`, `dotnet test`, `dotnet run`, and CLI command in
docs resolves to real projects and produces the advertised behavior on
Windows 11. Update docs the same turn you change commands.

## 9. Plan file staleness

No dangling plan files, scratch docs, or roadmap notes outside the
documented hierarchy. Plans live in:

- `AGENTS/BOUML__*.md` SOPs (the project-specific operating manual is
  `BOUML__PROJECT_SPECIFIC.md` — that's where deferred work, open research
  items, and re-entry checklists live)
- Commit messages

Anything else (a stray `Plan.md`, `notes.md`, `roadmap.md`, `TODO.md`
at the root) is a violation unless added to §10 in the same change.

## 10. README accuracy

Once `README.md` exists at the repo root, the layout tree in
`BOUML__PROJECT_SPECIFIC.md §1` and the README's "architecture at a
glance" section match the actual filesystem. Unimplemented features are
explicitly marked. Currently no README exists — this check activates
when one is added.

## 11. Exit code and exception propagation

The `NiemBouml.Cli` entry point surfaces failures through non-zero exit
codes. `Main` returns `int` or `Task<int>` where any failure path
exists. No `catch (Exception) { }` silent swallows. Any `catch` that
does not rethrow must either return a non-zero exit code, log through
`ILogger`, or carry a one-line comment explaining why the exception is
safe to drop. Use `ILogger` for diagnostics; reserve `Console.WriteLine`
for intentional user-facing CLI output.

## 12. Solution and project-file consistency

Verify across `NiemBouml.slnx` and every `.csproj`:

- Every `.csproj` on disk appears in `.slnx`; every `.slnx` entry
  resolves.
- All projects share `<TargetFramework>net10.0</TargetFramework>` and
  `<LangVersion>14</LangVersion>`.
- `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`
  set uniformly.
- Package versions centralized in `Directory.Packages.props`; no
  per-project version overrides without a comment.

## 13. Nullable and analyzer discipline

Every `#nullable disable`, `<NoWarn>`, `<TreatWarningsAsErrors>false</...>`,
and `#pragma warning disable` complies with the policy in root
`AGENTS.md §5–6`. Repository builds green with zero warnings on the
default configuration.

## 14. Markdown file length (advisory)

The 300-line guideline encourages focused per-document scope and
agent-context efficiency. **It does not block — clarity wins when it
conflicts.** When a file would need to lose meaningful content to fit
the cap, leave it long; if surprised, ASK whether the rule should bend
rather than compressing. The audit prints lengths for informational
purposes only.

**In scope for the guideline**: per-feature SOPs, `AGENTS.md` itself,
project-authored prose around the SCG catalog block in `CLAUDE.md`.

**Explicitly exempt** (these grow with the project; trimming damages
function):
- `AGENTS/BOUML__SCG_CATALOG.md` — project-specific guide to using
  SCG; readability matters more than line count.
- The auto-synced SCG catalog block inside `CLAUDE.md` (managed by
  `scg sync-claude-md` — never hand-edit, length is upstream's call).
- Any file whose primary purpose is reference / canonical documentation
  rather than procedural guidance for an in-flight task.

**Exempt entirely** (user-facing prose; audience is humans evaluating
or onboarding): `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and any
other top-level docs.

Quick check (PowerShell, informational):
```powershell
Get-ChildItem -LiteralPath AGENTS.md, AGENTS, CLAUDE.md -Filter '*.md' -Recurse |
  Where-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines -gt 300 } |
  ForEach-Object { "$($_.FullName) — over 300 lines (advisory; verify clarity vs cap)" }
```

## 15. Clean-room contamination scan (P0)

**The project's defining safety boundary.** Per
`BOUML__PROJECT_SPECIFIC.md § Clean-room discipline`: never read
bouml's GPL source, never copy bouml-licensed code, never rebuild
bouml's wire opcodes by reverse-engineering its binaries.

Failure of this check is **P0** — it goes beyond a coding defect; it
threatens the legal premise of shipping NiemBouml as an Apache-2.0
alternative.

Scan for:

- Direct references to `gregsmirnov/bouml`, `github.com/...bouml...`
  (other than the `juleswh/bouml-smartptr` plug-out fixture, which is
  user-data not bouml source) in source, comments, commit messages.
- GPL boilerplate headers (`/* GNU General Public License */`,
  `// Licensed under GPL`, etc.) in any file under `src/` or
  `cpp-stub/`.
- File or symbol names that are direct lifts from bouml's public API
  index where the implementation could only have come from reading
  source — e.g. opcode constants whose values aren't in any public
  doc.
- Qt headers or Qt source under `cpp-stub/` (the stub may *use* Qt
  types as an interface concession to niem-tools, but Qt source must
  not be vendored).

Quick check (PowerShell):
```powershell
$root = 'C:\dev\NiemBouml'
$hits = Select-String -Path "$root\src\*","$root\cpp-stub\*" -Pattern 'gregsmirnov/bouml','GNU General Public License','GPL-2','GPL-3' -Recurse -ErrorAction SilentlyContinue
if ($hits) { $hits | ForEach-Object { "CONTAMINATION: $($_.Path):$($_.LineNumber) — $($_.Line.Trim())" } }
```

Any hit triggers an immediate stop; document the source of every spec
claim that produced the flagged code (auditable trail per
`BOUML__PROJECT_SPECIFIC.md`).

## 16. Permissive-license compatibility

NiemBouml ships under **Apache-2.0** (per `BOUML__PROJECT_SPECIFIC.md § Objective`).
Every `<PackageVersion>` in `Directory.Packages.props` uses a license
compatible with that goal — i.e. a permissive license that can be
combined with Apache-2.0 without copyleft contamination.

**Accepted licenses:** MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause,
ISC, Zlib, MS-PL, Unlicense, CC0-1.0.

**Hard-blocked:**
- GPL (any version) — the whole point of this project is to escape it.
- LGPL (any version) — static-link ambiguity is unacceptable for a
  library shipped to standards organizations.
- AGPL — strict copyleft.
- Commercial-only or "free for non-commercial use" licenses.
- Specifically: **FluentAssertions ≥ 7.0.0** (Xceed commercial since
  the 7.0 release; 6.12.2 is the last MIT version and is the pinned
  baseline).

Quick check — manually walk every `<PackageVersion Include="…">` and
look up the package's license on nuget.org. CI gate via a license-scan
action lands once one is added.

## 17. MTP runner-mode flag hygiene

The project's `dotnet test` invocations use Microsoft.Testing.Platform
runner mode (set in `global.json`). Per `BOUML__PROJECT_SPECIFIC.md
§ Re-entry checklist`, two flags break test discovery in MTP mode by
getting forwarded to the test executables:

- `--no-build` — xUnit treats it as an unknown arg, prints help, exits 5.
- `-nologo` — same failure mode.

Bare `dotnet test --solution NiemBouml.slnx` is the clean form.

Quick check (PowerShell):
```powershell
$root = 'C:\dev\NiemBouml'
Select-String -Path "$root\.github\**\*.yml","$root\scripts\**\*.ps1","$root\scripts\**\*.sh","$root\AGENTS.md","$root\AGENTS\*.md","$root\README.md" -Pattern 'dotnet test.*(--no-build|-nologo)' -ErrorAction SilentlyContinue |
  ForEach-Object { "MTP-FORBIDDEN-FLAG: $($_.Path):$($_.LineNumber)" }
```

(Existence of any `dotnet test` invocation that doesn't pass these
flags is fine — the check only flags the forbidden combination.)

## 18. `cpp-stub/` clean-room boundary

`cpp-stub/` exists as a placeholder directory and is currently empty.
When code lands there:

- Every header / source file carries an Apache-2.0 license header
  (the project's chosen license; SPDX-License-Identifier: Apache-2.0).
- Every file's provenance is documented (clean-room authored from
  public bouml.fr docs, or original work). No "found this on Stack
  Overflow" without a license check.
- No vendored Qt source (interface use is fine; copying Qt's source
  is not).
- No copy of bouml's `UmlCom.h` or any header from bouml's GPL tree.

Quick check (PowerShell):
```powershell
$stub = 'C:\dev\NiemBouml\cpp-stub'
Get-ChildItem -LiteralPath $stub -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in '.h','.hpp','.cpp','.cc','.c' } |
  ForEach-Object {
    $first10 = Get-Content $_.FullName -TotalCount 10 -ErrorAction SilentlyContinue
    if (-not ($first10 -match 'SPDX-License-Identifier:\s*Apache-2\.0')) {
      "MISSING-LICENSE-HEADER: $($_.FullName)"
    }
  }
```

Activates when `cpp-stub/` becomes non-empty; until then, the check
trivially passes.
