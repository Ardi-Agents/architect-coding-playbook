# NiemBouml Project-Specific Operating Manual

> **Parent**: [AGENTS.md](../AGENTS.md)
> **Owns**: Project objective + background, clean-room discipline, locked decisions, current state of the solution, re-entry checklist, deferred-work backlog, open research items, public source list, established architectural facts.
>
> Lives in `AGENTS/` so it evolves with the project alongside the rest of the operating manual. As work moves from "deferred" to "shipped," update the relevant section in place.

---

## Objective

Apache-2.0-licensed drop-in replacement for the parts of bouml that
the niem-tools plug-out interacts with, so the co-worker can share
niem-tools with a standards organization without GPL contamination.
Apache 2.0 chosen over MIT for the explicit patent grant — important
when shipping into a standards-org context.

**Construction:** clean-room — copyright protects bouml's source
expression, not its interface or behavior. Spec extraction from
public documentation only; black-box observation permitted; bouml's
GPL source never opened.

**Honest framing of the construction:** the textbook clean-room
defense uses a two-team wall (spec team consults the protected work,
implementation team only sees the spec). With a single implementer
doing both, the construction is weaker than the Phoenix-BIOS / Wine /
Compaq precedents — still legally defensible (APIs are not
copyrightable expression; reading public docs doesn't contaminate),
but not gold-standard. If the standards organization downstream
requires gold-standard, a second person re-implements behind the wall
against this spec.

## Clean-room discipline (do not violate)

- **Never read bouml source.** No `gregsmirnov/bouml`, no fork, no
  source mirror. The directory `C:\dev\NiemBouml` must stay free of
  bouml source.
- **Permitted reference material:**
  - `bouml.fr/doc/*` (official documentation)
  - `bouml.fr/tutorial/*` (official tutorials)
  - `docs.huihoo.com/bouml/4.21/*` (older mirror — useful when
    bouml.fr's PHP is broken on a class page)
  - User-authored model files committed to public GitHub repos
    (model data, not bouml's source)
  - Black-box observations: socket capture, model save-and-diff
- **Document the source of every spec claim** — auditable trail.

## LOCKED decisions

- **Language:** .NET 10 / C#.
- **Scope:** Scope 1 only — plug-out host + thin C++ stub library.
  No model authoring (Scope 2), no full bouml parity (Scope 3).
- **Project naming:** `NiemBouml.*` — names the project after its
  primary consumer (niem-tools), honest signaling that this exists
  to unblock that one downstream.
- **Wire format between host and stub:** ours to design — niem-tools
  talks to *our* Apache-2.0 C++ stub library, which talks to *our* host. We
  do NOT need to be wire-compatible with bouml's host. Default plan:
  JSON-RPC over TCP.
- **C++ stub library:** lives at `cpp-stub/` in the same repo
  (deferred — directory exists, no code yet). Co-worker relinks
  niem-tools against this stub instead of bouml's GPL one. Source
  changes to niem-tools: zero.
- **Test framework:** xUnit.v3 (via `xunit.v3.mtp-v2` 3.2.2) +
  FluentAssertions 6.12.2 (last MIT-licensed release; 7.0+ went
  commercial under Xceed).
- **Solution format:** `.slnx`. Central package management via
  `Directory.Packages.props`.

## Current state of the solution

```
C:\dev\NiemBouml\
├── NiemBouml.slnx
├── Directory.Build.props          ← TFM net10.0, LangVersion 14, Nullable, warnings-as-errors
├── Directory.Packages.props       ← CPM: xunit.v3.mtp-v2 3.2.2, FluentAssertions 6.12.2
├── global.json                    ← SDK 10.0.201, MTP runner mode for dotnet test
├── .editorconfig + .gitignore
├── src/
│   ├── NiemBouml.Core/            ← skeleton — UML metamodel + .prj parser will live here
│   ├── NiemBouml.Protocol/        ← skeleton — JSON-RPC wire DTOs (Core has no Protocol dep)
│   ├── NiemBouml.Host/            ← skeleton — refs Core + Protocol; TCP server + dispatch
│   └── NiemBouml.Cli/             ← skeleton — refs Host; AssemblyName=niembouml
├── tests/
│   ├── NiemBouml.Core.Tests/
│   ├── NiemBouml.Protocol.Tests/
│   ├── NiemBouml.Host.Tests/
│   ├── NiemBouml.IntegrationTests/  ← refs all four src projects
│   └── Fixtures/                    ← empty, for clean-room sample .prj files
├── cpp-stub/                        ← empty placeholder for C++ Apache-2.0 stub
├── AGENTS.md                        ← STILL SCG-FLAVORED, content adaptation deferred
├── AGENTS/  (20 BOUML__*.md files)  ← STILL SCG-FLAVORED, content adaptation deferred
├── CLAUDE.md                        ← slim redirect, done
└── PLAN.md                          ← this file
```

**Verified working** (last session):
- `dotnet build NiemBouml.slnx` → clean (0 warnings, 0 errors)
- `dotnet test --solution NiemBouml.slnx` → 4 placeholder tests pass

**bin/obj cleaned before rename** so the first cold build picks up
the new folder path correctly.

## Re-entry checklist for the next session

1. Confirm cwd is `C:\dev\NiemBouml` (folder was renamed from `bouml.fr`).
2. Run `dotnet restore NiemBouml.slnx` once to refresh package cache
   under the new path.
3. Run `dotnet build NiemBouml.slnx` — expect clean.
4. Run `dotnet test --solution NiemBouml.slnx` — expect 4/4 pass.
   **Important:** do NOT pass `--no-build` or `-nologo` to
   `dotnet test`; in MTP runner mode those flags get forwarded to
   each test exe and break test discovery (xUnit emits its help
   screen, exit 5). Bare `dotnet test --solution NiemBouml.slnx` is
   the clean form.

If any of those fail, that's the first thing to fix.

## Deferred work (in priority order)

1. **Adapt AGENTS.md and AGENTS/BOUML__*.md content** — currently
   carries SemanticCodeGraph-specific text. The kernel structure
   should move to a NiemBouml-flavored stack baseline (.NET 10,
   xUnit.v3, MTP runner mode, JSON-RPC, clean-room discipline as a
   top-level section). Per user's earlier directive: do NOT move or
   delete the BOUML__*.md files — adapt their contents in place.
2. **`.prj` parser** in `NiemBouml.Core` — text DSL, version-stamped
   header (`format 221`), block-structured key-value pairs, six
   token categories (keywords, quoted strings, integers, `yes`/`no`,
   enums, `// comments`). Hand-rolled lexer + recursive-descent
   parser. Sample fixture pulled in last session: contents of
   `juleswh/bouml-smartptr` on GitHub (community plug-out — user
   data, clean-room safe).
3. **UML metamodel** in `NiemBouml.Core` — ~130 `UmlBase*` classes
   per `bouml.fr/doc/empty_html/index.html`. niem-tools likely
   exercises only ~10–15 (Package, Class, Attribute, Operation,
   Relation, View, Item, Stereotype, Settings, Com, plus a few
   diagram types). Implement what niem-tools needs first; expand if
   other plug-outs adopt later.
4. **JSON-RPC wire contract** in `NiemBouml.Protocol`. Default pick:
   `StreamJsonRpc` from Microsoft for the C# server side. C++ stub
   uses `nlohmann/json` or RapidJSON. Both ends speak a standard
   format → no protocol drift.
5. **TCP server + dispatcher** in `NiemBouml.Host`. Suggested:
   `System.IO.Pipelines`. Bouml allocates the port dynamically
   starting at 1024 — replicate that contract.
6. **C++ stub library** at `cpp-stub/`. Mirror `UmlCom.h` API
   surface for the methods niem-tools touches; marshal to JSON-RPC.
   Drop-in replacement for the GPL stub niem-tools currently links.
7. **Integration test against real niem-tools** — the acceptance
   gate. Spin up our host, point niem-tools at it, verify the model
   walk produces the expected schema output.

## Open research items (still PENDING)

- **Full `.prj` schema reverse-engineering.** Last session captured
  the format shape from one fixture. To handle real niem-tools
  models we need broader coverage — save tiny bouml models locally
  and diff to discover all the keywords, child-file references, and
  edge cases. Black-box observation; clean-room safe.
- **`UmlCom`'s exact wire-protocol opcode set.** Public API surfaces
  6 wire primitives (`read_id`, `read_string`, `read_bool`,
  `read_char`, `read_unsigned`, `read_item_list`) and command
  families via `CmdFamily` / `OnInstanceCmd` / `ClassGlobalCmd`
  / etc. — but the opcode integer values are not public. Since the
  wire format is **ours to design** (not bouml's), we do not need
  to reverse them; we pick our own. Only relevant if we ever want
  bouml's existing GPL plug-outs to talk to our host (out of scope
  for niem-tools' need).
- **Plug-out-side API method count for niem-tools specifically.**
  Best estimate: ~250–350 method slots across ~10–15 base classes.
  Settled empirically by attempting an integration test and
  surfacing every API call niem-tools actually makes.

## Background — why this exists

The co-worker built niem-tools as a bouml plug-out. He wants to
share it with a standards organization. Bouml is GPL, and although
plug-outs run as separate processes communicating over a TCP socket
(architecturally as decoupled as plugins get), the bouml-supplied
API stub library that links into every plug-out is GPL. That's the
contamination: the plug-out binary contains GPL code, so its source
must be GPL-compatible to redistribute alongside it.

A clean-room reimplementation of the host side and the stub library
gives the standards org an Apache-2.0 alternative they can build
against, fully sidestepping GPL.

## Sources gathered (all public — no source code consulted)

- https://www.bouml.fr/ — license language ("free software" since 7.0)
- https://www.bouml.fr/doc/plugout.html — plug-out architecture, TCP socket
- https://www.bouml.fr/doc/projectfiles.html — `.prj` text-file structure
- https://www.bouml.fr/doc/plugoutupgrade.html — upgrade flow (no wire-protocol details)
- https://www.bouml.fr/contrib.html — contrib licensing
- https://www.bouml.fr/legal-mentions.html — license breakdown
- https://bouml.fr/tutorial/tutorial_plugout.html — plug-out tutorial
- https://bouml.fr/doc/empty_html/index.html — full ~130-class API index
- https://docs.huihoo.com/bouml/4.21/* — older mirror (useful when bouml.fr 500s on class pages)
- https://docs.huihoo.com/bouml/4.21/empty_html/class5248.html — `UmlCom` API (44 static methods, wire primitives)
- https://docs.huihoo.com/bouml/4.21/empty_html/class1408.html — `UmlBaseClass` (47 methods)
- https://docs.huihoo.com/bouml/4.21/empty_html/class3200.html — `UmlBaseItem` (29 methods, root)
- https://docs.huihoo.com/bouml/4.21/empty_html/class1280.html — `UmlBaseAttribute` (29 methods)
- https://github.com/juleswh/bouml-smartptr — community plug-out repo, source for the sample `.prj` file we read last session

## Architectural facts established (verified from public docs)

- Plug-outs are **standalone executables**, launched by bouml with
  `bouml <project> -exec <plug-out> <opts> -exit`. Communicate over
  TCP/IP socket; bouml chooses a free port starting at 1024.
- The stub library **caches data** to reduce network round-trips.
- API uses Qt types (`QVector`, `QCString` in older versions,
  `QString` in modern); the stub library carries Qt as a transitive
  dep — niem-tools already has Qt for that reason.
- `.prj` is the top-level text file in a project directory; sub-data
  lives in numbered files (`<n>` for packages, `<n>.diagram` for
  diagrams, `<n>.bodies` for operation bodies). All text. Format
  grammar not officially documented; reverse by save-and-diff.
- `format 221` is the version stamp at the top of every `.prj` —
  refuse-or-warn loudly when format diverges from a known-tested
  set.
