# Appendix: Versioning Policy

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-05-08
>
> **Owns**: SemVer policy, optional host-runtime pin pattern, package-version source-of-truth per track, bump rules per track, release tagging.
>
> **Fires when**: "what version should this be?", "how do we bump?", "is this a breaking change?", releasing a package, tagging a commit, deciding when to bump major/minor/patch.

> **⚠️ TEMPLATE NOTE**: When the playbook setup copies this file into your project, replace the example values with your project's actual versioning scheme. The structure is the deliverable; the specific numbers are illustrative.

---

## Choose Your Scheme

> **Required**: declare your project's versioning scheme below. The rest of this file provides depth on the most common choice (SemVer); CalVer / ZeroVer / custom projects translate the patterns analogously.

| Scheme | When it fits | Tradeoffs |
|--------|--------------|-----------|
| **SemVer 2.0** (recommended default for libraries) | Library code with a public API; package registries (NuGet, npm, PyPI, crates.io, Go modules) all assume it; consumers can express compatibility ranges | Requires discipline about what counts as breaking; pre-1.0 contracts are fuzzy |
| **CalVer** (e.g., `2026.05.08` or `26.5`) | Applications and tools where time-since-release matters more than API contract; rolling-release products (Ubuntu, pip, Black, JetBrains) | No native compatibility signal — every release is a new "year/month"; consumers can't pin "compatible up to 2.x" |
| **ZeroVer** (`0.x.y` indefinitely) | Pre-stable libraries explicitly signaling "expect breaks"; research code; products that never make a stability claim | Some package registries and tools special-case 0.x; downstream pinning is awkward |
| **Custom / Internal build numbers** | Closed systems where versions are opaque to external consumers (e.g., monorepo-internal libraries) | Doesn't communicate compatibility to outside users; ties versioning to CI infrastructure |

### Project Declaration

> Replace this block with your project's chosen scheme.

```markdown
**Chosen scheme**: SemVer 2.0
**Rationale**: <one-sentence why — e.g., "permissively-licensed library shipped on NuGet">
**Pre-1.0 stance**: <e.g., "0.x.y allows breaking changes; will tag 1.0.0 once the schema stabilizes">
**Host-runtime pin** (if applicable): <e.g., "yes — pinned to Roslyn version" or "n/a">
```

If you choose a scheme other than SemVer, replace the cross-track sections below with your scheme's analogues; the per-track package-version source-of-truth and per-track release tagging sections still apply (only the version *string* changes).

---

## Cross-track baseline: SemVer 2.0 (the default)

[Semantic Versioning 2.0](https://semver.org/) — the deep guidance below assumes this scheme.

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — incompatible API changes
- **MINOR** — backward-compatible functionality added
- **PATCH** — backward-compatible bug fixes

**Pre-1.0 caveat**: anything in `0.x.y` is allowed to break — that's the SemVer spec. Once a project hits `1.0.0`, the contract starts.

### What counts as a breaking change (cross-track)

- Removing a public function / method / class / type
- Renaming a public function / method / class / type
- Changing a public function's signature (parameter types, return type, parameter count, parameter names if named-arg APIs are common)
- Changing the meaning of a public function (same signature, different behavior — silent breakage is the worst kind)
- Changing the wire format of an emitted artifact (JSON shape, binary layout, file format)
- Increasing the minimum runtime / SDK / language version

### What does NOT count as breaking (cross-track)

- Adding a new public function (additive — minor)
- Adding a new optional parameter at the end of an existing function (in languages where it's additive)
- Internal refactoring that doesn't change the public surface
- Performance improvements
- Bug fixes that bring behavior into line with the documented contract

---

## Optional pattern: Host-runtime pin

> Use this pattern when your library wraps or depends on a specific version of a host runtime / compiler / framework whose version users care about.

If your library is built against a specific host-runtime version that downstream users need to know about (e.g., a Roslyn-based analyzer pinned to a specific Roslyn release; an LLVM-binding crate pinned to a specific LLVM version; a Spark library pinned to a Spark release; a Java library pinned to a Hadoop version), use **SemVer 2.0 with a host-runtime prerelease tag**:

```
<LIB-MAJOR>.<LIB-MINOR>.<LIB-PATCH>-<host>-<HOST-MAJOR>.<HOST-MINOR>.<HOST-PATCH>
```

### Examples

- `1.0.0-roslyn5.3.0` — first stable release, built against Roslyn 5.3.0.
- `1.1.0-roslyn5.3.0` — feature release; host pin unchanged.
- `1.1.1-roslyn5.3.0` — patch (bug fix); host pin unchanged.
- `2.0.0-roslyn5.4.0` — library breaking change AND host bump in the same release.
- `1.1.0-roslyn5.4.0` — feature release that also bumped the host (e.g., to support new compiler features).

Read out loud: "Library 1.0.0 built against Roslyn 5.3.0."

### Why this pattern

Three properties matter:

1. **The library owns its own cadence.** A bug fix that doesn't touch the host ships as a normal library patch. The library isn't held hostage to the host's release cadence.
2. **The host pin is visible without reading code.** A user looking at `--version` (or the package metadata) immediately sees which host drop the library is grounded in. Important for "does this version know about feature X?".
3. **Compatible with package-registry conventions.** SemVer 2.0 prerelease tags are first-class in NuGet, npm, PyPI, crates.io — no custom metadata file needed.

### When to bump the host pin

Bump the host pin to a new prerelease tag when:

- A new host release adds capabilities your library wants to expose.
- Critical bugs in the pinned host version are blocking users.
- Security advisories affect the pinned host.

A host bump is at minimum a library minor bump (new capability surface possible) and is often a major bump (host behavior change semantics).

---

## Package-Version Source of Truth (per track)

> Every track centralizes versions somewhere. Keep that location authoritative; don't pin elsewhere.

#### Track: dotnet

> **Depth**: expert.

- **`Directory.Packages.props`** at the solution root with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>`.
- All `<PackageVersion>` declarations live here; `.csproj` uses `<PackageReference Include="X" />` (no `Version=` attribute).
- **Library versions emitted by your build** come from `<Version>1.2.3-roslyn5.3.0</Version>` in `Directory.Build.props` or per-project; CI may override via `dotnet pack -p:Version=...`.
- **Match the host pin to source of truth**: if you're using the host-runtime pin pattern, the prerelease tag in `<Version>` MUST match the actual host package version in `Directory.Packages.props`.

#### Track: python

> **Depth**: expert.

- **`pyproject.toml`** `[project] version = "1.2.3"` is the source of truth.
- `__version__` in the package's `__init__.py` should read from package metadata via `importlib.metadata.version("<pkg>")` — don't duplicate the version literal in source.
- For host-runtime pin: include in version string (`1.2.3+spark3.5.1` is *build metadata* per SemVer 2.0, not prerelease — alternatively use `1.2.3-spark3.5.1` as prerelease for ordering purposes).

#### Track: typescript

> **Depth**: expert.

- **`package.json`** `version` field is the source of truth.
- For host-runtime pin: the prerelease pattern `1.2.3-react18.2.0` is npm-native.
- **Workspace coordination**: pnpm `workspace:*` and Yarn `workspace:^` allow workspace-internal pins to track the local version.

#### Track: go

> **Depth**: consensus.

- **Git tags** `v1.2.3` are the source of truth (Go modules use semver tags, not a manifest file).
- For host-runtime pin: prerelease pattern `v1.2.3-llvm17.0.0` works but is uncommon in Go culture; consider whether the pin needs to be visible at all.
- **`go.mod`** records dependencies; `replace` directives are local-only and shouldn't ship in tagged releases.

#### Track: rust

> **Depth**: consensus.

- **`Cargo.toml`** `[package] version = "1.2.3"` is the source of truth.
- **`[workspace.dependencies]`** centralizes versions for member crates; member crates use `version.workspace = true`.
- For host-runtime pin: `1.2.3-llvm17.0.0` works as a prerelease tag in Cargo.

---

## Bump Rules

### When to bump

| Change | Bump |
|--------|------|
| Bug fix, no API change | Patch |
| Backward-compatible new feature | Minor |
| Backward-incompatible change | Major |
| Host-runtime pin update (with no library change) | Patch (host changes are themselves a feature signal but the library API didn't change) |
| Host-runtime pin update + library breaking change | Major |
| Pre-1.0 breaking change | Minor (per SemVer 0.x.y) |

### Pre-release tags (per track conventions)

- **dotnet / NuGet**: `1.0.0-preview.1`, `1.0.0-rc.1`, `1.0.0-beta`, `1.0.0-alpha.1`. Sort order matters per [NuGet versioning](https://learn.microsoft.com/en-us/nuget/concepts/package-versioning).
- **python / PyPI**: `1.0.0a1`, `1.0.0b1`, `1.0.0rc1`, `1.0.0.dev1` (PEP 440).
- **typescript / npm**: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.0`. Pre-releases install only when explicitly requested.
- **go**: `v1.0.0-alpha.1`, `v1.0.0-beta.2` — leading `v` mandatory for go modules.
- **rust / crates.io**: `1.0.0-alpha.1`, `1.0.0-beta.2`. Pre-1.0 versions are the norm; treat them as unstable.

---

## Release Tagging

### Cross-track conventions

- **Tag from the default branch** (`main` or `master`) at the commit that bumped the version.
- **Tag format**: per-track convention (above).
- **Annotated tags** (`git tag -a v1.0.0 -m "..."`) over lightweight tags — they carry author + message + signature.
- **Sign tags** (`git tag -s` or `--sign`) for release authenticity, especially on public projects.

### Per-track release artifacts

#### Track: dotnet

- `dotnet pack -c Release -o out/` → `.nupkg` files in `out/`.
- Push: `dotnet nuget push out/*.nupkg --api-key <key> --source <feed>`.
- Trusted publishing (OIDC) preferred over long-lived API keys for `nuget.org`.

#### Track: python

- `python -m build` (or `uv build`) → `.tar.gz` and `.whl` in `dist/`.
- Push: `twine upload dist/*` (or `uv publish`).
- Trusted publishing (PyPI's OIDC) preferred over long-lived tokens.

#### Track: typescript

- `npm publish` (or `pnpm publish` / `yarn publish`) — runs `prepublishOnly` script then publishes.
- Provenance: `npm publish --provenance` (npm 9.5+) for OIDC-attested provenance.

#### Track: go

- Release = git tag. `goreleaser` automates the full release flow (cross-compile, archives, checksums, GitHub release).
- No central registry to push to — `proxy.golang.org` indexes from the git tag.

#### Track: rust

- `cargo publish` pushes to crates.io.
- Trusted publishing (OIDC for crates.io) is in development; until then, scoped `cargo login` tokens.
- `cargo-release` automates version bump + tag + publish.

---

## Bumping Workflow (cross-track)

For each release:

1. **Decide bump magnitude** (per the Bump Rules table above).
2. **Update the version** in the source-of-truth file (per track).
3. **Update CHANGELOG.md** with what changed.
4. **Commit the version bump** with a conventional message (`chore(release): v1.2.3`).
5. **Tag** the commit (per-track tag format).
6. **Push** the commit AND the tag (`git push --follow-tags`).
7. **Build and publish** the package per track.
8. **Verify** the published package on the registry.

---

## Backout

If a published version is broken:

- **dotnet / NuGet**: deprecate the version (cannot delete after 72 hours); push a fixed `1.2.4` immediately.
- **python / PyPI**: yank the version (`twine yank`); push a fixed `1.2.4` immediately. (Files remain downloadable for existing pin users; new installs skip yanked.)
- **typescript / npm**: deprecate the version (`npm deprecate`); push a fixed `1.2.4`. Unpublishing is restricted (rules vary by age and downloads).
- **go**: cannot delete a tag once pushed to a public proxy; push a fixed `v1.2.4`. Use `retract` directive in `go.mod` to mark a bad version.
- **rust / crates.io**: yank the version (`cargo yank --vers 1.2.3`); push a fixed `1.2.4`.

The fix-forward path is universal: ship a corrected version. Removal is at best partial.
