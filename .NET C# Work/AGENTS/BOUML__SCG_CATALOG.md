# SemanticCodeGraph (SCG) — structural query tool

> **Owns**: Canonical reference catalog for the `scg` Cli surface — command synopses, when-to-use guidance, output envelope shape, blind spots, and trigger-phrase mappings. Single source of truth for the per-project root-CLAUDE.md sync mechanism (`scg sync-claude-md`).
>
> **How this catalog reaches projects**: each .NET project's root `CLAUDE.md` carries a marker-pair block (start/end HTML comments tagged "managed by `scg sync-claude-md`"). The `sync-claude-md` command reads this file and rewrites the block atomically; `check-claude-md` verifies the project's block is current. The exact marker strings live in `ClaudeMdSync.StartMarker` / `EndMarker` — embedded in the running assembly — and are deliberately omitted here so this prose can't collide with the literal tokens during inspection.

For any structural question in a .NET codebase ("who calls X?", "what
tests cover Y?", "if I change Z, what breaks?"), reach for SCG before
grep. Grep sees text; SCG sees the semantic graph.

## Why SCG-first — rationale + anti-pattern

**The rule, restated.** For any structural question on a .NET codebase, the first tool call is SCG, not Grep, Read, or Glob. Grep and Read are fallbacks for plain-text searches (string literals, log messages, config keys, comments, content searches in non-source files). They are NOT the default for "who calls X?", "what implements Y?", "if I change Z, what breaks?"

**The cost-of-bypass math (F1 vs Beetle).** Round-trip costs for "where is method X used" with depth-2 transitive context:

- **F1 (SCG)**: 1 call. `scg query callers <id> --depth 2`. JSON envelope; structurally complete.
- **Beetle (Grep/Read)**: 5+ calls. Grep for the method name; for each hit, Read the surrounding file to disambiguate `Foo()` from `Bar.Foo()`; for each disambiguated call site, Grep for *its* callers; for each of those, Read again. Loose typing on `Foo` in extension-method-rich codebases makes the Read step worse, not optional. And no transitive context unless you walk the whole tree manually.

For a single question this is annoying. For a long editing session that asks dozens of structural questions, the bypass produces tens of redundant tool calls and the agent loses track of which Greps it has already done. The F1 has no such accumulation. **SCG is the F1 car; Grep / Read are the Volkswagen Beetle. Both will get you to work; one does it in 1 call instead of 5+. Default to the F1.**

**The anti-pattern this rule explicitly forbids:**

> "I'll just grep first to be quick, SCG can come later."

That bypass is the failure mode this rule is meant to catch. Grep is *slower in net* because it surfaces text matches without structural context — every grep result still needs follow-up SCG queries to verify. The "let me grep first" reflex feels faster turn-by-turn but compounds across an editing session.

**How to apply (imperative):**

- **Before any `Edit` on a .cs file** — run `scg query exercising <method-id> --include all` on the method being edited. One JSON envelope replaces 5+ Read/Grep calls.
- **Before any `Grep` with `--type cs` or a `*.cs` glob** — pause and ask the question SCG-style. The trigger-phrase mapping below the command table covers the common cases.
- **Before any `Read` on an unfamiliar method/type** — run `scg investigate <name>` first. Returns location, callers, implementers, covering tests, finding count in one shot. Read only the specific lines you actually need afterward.
- **When investigating a defect or rumor** — run `scg find <suspect-pattern>` against the live DB to confirm or refute prevalence *empirically*, instead of reasoning from source about what *should* be there.
- **When the `pre-edit-structural-lookup` skill loads** — execute its prescription verbatim. The skill exists because the discipline lapses without a prompt.

**Recovery if the rule lapses.** Symptoms — the agent reaches for Grep/Read on a structural question, or skips a `pre-edit-structural-lookup` skill prescription. Recovery — stop, run the SCG query that *should* have fired, treat the SCG result as the source of truth, then continue. The lost time on the Greps is sunk cost; do not compound by ignoring the structural answer when it arrives.

**Origin.** Elevated to a global standing rule on 2026-05-04 after Wave 1 of the IDE-Parity plan exposed the bypass pattern: 4 of 5 items used grep/read first when SCG would have been faster + structurally complete; ~5–10 redundant tool calls per item that bypass.

## Reference

**Repo:** `C:\dev\SemanticCodeGraph` (co-developed; treat as a
first-class tool for any .slnx project on this machine).

**Executable** (current local build, .NET 10):
`C:\dev\SemanticCodeGraph\src\SemanticCodeGraph.Cli\bin\Debug\net10.0\scg.exe`

NOT on PATH. Invoke via the full path. Verify with
`<full-path>\scg.exe --version` (≥ 0.9.0 expected).

**Per-repo databases:** each .NET repo has its own snapshot at
`<repo>/.scg/<system-name>.db`. Re-extract before any structural
query if source has changed since the last extract — the DB is a
frozen snapshot, not a live view.

| Command | Form | When to use |
|---|---|---|
| **extract** | `scg extract <solution.slnx> --output <db> [--system-name <name>] [--sarif-dir <path>] [--incremental [--watch [--debounce-ms <n>] [--quiet] [--until-clean]]]` | First step on a fresh repo, OR refresh after source changes. `--sarif-dir <path>` is repeatable; ingests every `*.sarif` under each path as `SecurityFindingNode` rows attached via `MethodFlaggedBy` / `TypeFlaggedBy` / `FileFlaggedBy` edges. `--incremental` re-walks only drifted projects against the existing DB; falls back to a full extract automatically when the planner reports `RequiresFullExtract` (no snapshot, missing project metadata, repo HEAD drift). `--watch` (requires `--incremental`) keeps the DB fresh in the background: starts a `FileSystemWatcher` rooted at the solution directory after the initial extract, runs the incremental extractor when source files change (`.cs`/`.csproj`/`.props`/`.targets`/`.sln`/`.slnx`/`.json` outside `bin`/`obj`/`.git`/`.scg`), debounces bursts via `--debounce-ms` (default 1000). Emits structured JSON-per-line status to stderr (`started`/`saw`/`reextract`/`reextract-error`/`buffer-overflow`/`fatal-error`/`settled`). `--quiet` suppresses per-event `saw` and zero-delta `reextract` events; errors and overflow always surface. `--until-clean` runs the watcher, settles when the channel drains and one debounce window passes with no new events, then exits 0 — the deterministic CI / pre-commit shape. Without `--until-clean`, runs until Ctrl+C and exits 130 (SIGINT convention). |
| **refresh-sarif** | `scg refresh-sarif --output <dir> [--solution <slnx>] [--tool dotnet-build\|codeql\|semgrep] [--severity-floor warning\|error]` | On-demand SARIF emission. Drives external analyzers (`dotnet build` always; `codeql` and `semgrep` when on PATH) and writes their SARIF outputs to `<dir>` for a subsequent `scg extract --sarif-dir`. The JSON report records which tools ran, which were skipped (with install hints), per-tool elapsed time, and finding counts. `--tool` is repeatable; omit to run every available. The `dotnet-build` path uses a transient `_scg-sarif.targets` injected via `--property:DirectoryBuildTargetsPath` so per-project SARIF emits with `$(MSBuildProjectName)` correctly resolved and `,version=2.1` preserved. Build failures surface stderr/stdout as a structured `SARIF_DOTNET_BUILD_FAILED` warning. |
| **find** | `scg find <pattern> --database <db> [--kind <kind>] [--types-only] [--exclude-kinds <k1,k2,...>] [--regex] [--include-projects]` | Locate symbols by name pattern. `--kind` matches a single kind; `--types-only` matches the type-shaped set (Class/Interface/Struct/Enum/Delegate); `--exclude-kinds` drops listed kinds (CSV). `--types-only` and `--kind` are mutually exclusive; `--kind X --exclude-kinds X` is rejected. |
| **investigate** | `scg investigate <name> --database <db>` | One-shot summary for a type: kind, location, key facts, callers, implementers, covering tests. Best first call when reading unfamiliar code. |
| **info** | `scg info <id> --database <db>` | Quick-info one-liner for a single node id: kind, name, location, parent, plus per-kind extras (accessibility / isStatic / isAbstract on the kinds that carry them). Cheaper than `investigate` (no callers/tests/findings rollup) and cheaper than `signature` (no source span). Returns `{found: false}` (exit 0) when the id doesn't resolve — consumers branch on the `found` field. The "what is this thing again?" call. |
| **info-id** | `scg info-id <id> [--database <db>]` | Id-shape recognizer: splits on first `:`, looks up the prefix in the canonical prefix→NodeKind table, emits `{recognized, prefix, kindCandidates, …}`. Without `--database` the call is offline (no SQLite open) — useful for validating ids carried in from external context (LLM hallucination check, offline graph-dump consumer). With `--database` it also resolves the id and narrows the multi-mapped `type:` prefix (Class / Interface / Struct / Enum / Delegate) to a single concrete kind. Distinct from `info`: `info-id` validates id SHAPE; `info` projects a known-resolved node. |
| **signature** | `scg signature <id> --database <db> [--with-doc]` | Source-span text for a symbol id. One `spans` entry per FileSpan — partial types yield N. `text` is verbatim file content from `startLine` through `endLine`, inclusive. Roslyn syntax-node Location covers from the first attribute through the closing brace, so attributes + body are inside `text`. XML doc-comments are leading trivia (not part of the syntax node), so they're explicitly absent from `text`; pass `--with-doc` to surface the `Documentation` payload field as a separate `documentation` slot (omitted when not asked; passed-and-null distinguishes "asked, none exists" from "didn't ask"). `[Conditional]` / `#if`-gated regions are returned verbatim; the command does not evaluate active config. `{found: false}` when the id doesn't resolve; per-span `{text: null, error: <reason>}` when the file is missing or the line range is out of bounds (other spans on the same node are unaffected). Distinct from `info` (one-line metadata, no source) and `investigate` (callers / tests / findings rollup, no source). |
| **edit-context** | `scg edit-context <symbol-id> --database <db> [--depth <n>] [--max-callers <n>] [--no-body] [--no-blast-radius]` | The agent-facing pre-edit envelope. Collapses `find + investigate + callers + covering-tests + diagnose + recent + signature + findings + blast-radius` into ONE JSON call. Every slice key is **always present** in the envelope (`callers`, `reads`, `writes`, `implementers`, `coveringTests`, `findings`, `churn`, `signature`, `body`, `blastRadius`, `diagnostics`); each slice carries a `{status, reason, payload}` shape with `status` ∈ `Complete` / `Truncated` / `Skipped` / `NotApplicable`. Slim per-slice projections (`CallerSummary`, `TestSummary`, `FindingSummary`, etc.) keep the envelope size bounded for agent consumption — full nodes are available via `query node` / `signature` / etc. when needed. Truncation is honest: `--max-callers` overflow surfaces as `status: Truncated, reason: "max-callers=N"`; blast-radius frontier-width / max-visits truncation surfaces with the underlying token. `--no-body` and `--no-blast-radius` flip those slices to `Skipped` (with the flag string in `reason`). The body slice's status stays `Complete` even when individual spans couldn't be read (file missing / line range out of bounds) — those surface as per-span `{text: null, error: <reason>}` inside the spans array, mirroring the `signature` command's contract. Consumers must inspect each span's `error` field to know if some text is missing; the slice-level status reflects only whether the slice itself ran. Distinct from `query references`: that's structural-only (callers/reads/writes/implementers/findings) with full-node payloads — fast and narrow. `edit-context` is the pre-edit superset with source body + churn + diagnostics + slim projections. Use `query references` when you want every structural attachment as its own slice; use `edit-context` when you're about to edit and want the full pre-edit environment. |
| **pre-edit-context** | `scg pre-edit-context --file <path> --database <db> [--summary \| --full] [--include-body] [--no-blast-radius] [--depth <n>] [--max-callers <n>]` | Generalises `edit-context` to a whole file. Discovers symbols via the same path-substring semantics as `query members-of-file` (filename / repo-relative / absolute / URI all accepted). Default `--summary` mode returns one row per symbol with the slice-status grid + per-slice row counts (no slice payloads); the agent reads the grid, picks symbols that look interesting (high caller-count + zero coverage + recent churn → drill in), then runs `edit-context` on those symbol ids. `--full` mode returns one full `edit-context` envelope per symbol; body + blast-radius default OFF in `--full` for envelope-size discipline (a 50-method file with all body + blast-radius would be 100+KB), opt in via `--include-body` and the absence of `--no-blast-radius`. Summary mode forces both off regardless of flags. Empty file (no matching symbols) returns `{found: false}` with both `summary` and `full` arrays null — distinct from "matched but empty". |
| **test-selection** | `scg test-selection (--diff (--from <ref> \| --current) \| --files <p,...>) --database <db> [--direct-only] [--solution <slnx>]` | Pre-merge test selection: deduplicated test set that exercises any method whose source file changed. Three input modes for "what changed": `--diff --current` diffs the database snapshot against current source, `--diff --from <ref>` materialises a historical snapshot at the given git ref (requires `--solution <slnx>`) and diffs against current, `--files <csv>` is the explicit-list fallback. Each row carries `{testId, testName, className, filePath, framework, filterArgs: {inProcess, mtp, vstest}}` — pre-built test-runner filter arg strings for THREE invocation paths: `inProcess` (single-dash `-class <name>` for direct `SemanticCodeGraph.Tests.exe -class …`), `mtp` (double-dash `--filter-class <name>` for `dotnet test -- --filter-class …`), and `vstest` (`--filter "FullyQualifiedName~…"` for legacy vstest). Envelope-level `dedupClassFilter` uses the in-process single-dash form ready to splat into `SemanticCodeGraph.Tests.exe -class Foo -class Bar`. **Transitive default ON** per Wave 5 §Q4 — name-pattern selection misses structural reach; pass `--direct-only` to opt out. Framework field is currently always `"unknown"` because `MethodNode` only carries `IsTest = bool`; promote when walker captures framework name. |
| **validate-schema** | `scg validate-schema --database <db> [--sample-limit <n>]` | Five-check schema-integrity audit: `orphanEdges` (Relationships rows whose Source/Target id doesn't resolve in Nodes), `duplicateUids` (defense-in-depth on PRIMARY KEY across both tables), `emptyIds` (empty-string violations on every NOT NULL TEXT column of both tables: `Nodes.{Uid, Id, Name, Payload}` + `Relationships.{Uid, SourceId, TargetId, Payload}` + `Meta.{Key, Value}` — samples carry a `source` discriminator and an `emptyColumns` array naming the offending columns), `unknownKinds` (Kind values not in canonical NodeKind / RelationshipKind enum names — catches schema drift), `systemIdMismatches` (Nodes whose SystemId Uid doesn't resolve to a System-kind node). Always exits 0 — agents/scripts branch on the JSON envelope's per-check counts. Default sample limit is 10 per check (configurable; `--sample-limit 0` returns counts without samples). Out of scope: per-kind payload validation, edge source/target kind constraints, auto-repair. |
| **diagnose** | `scg diagnose <method-id-or-name> --database <db>` | Compiler/SCG-captured diagnostics for a method. Surfaces issues `dotnet build` hides at the warning threshold. |
| **audit async** | `scg audit async --database <db>` | Async-hygiene audit across the graph. Catches sync-over-async, unawaited tasks, missing ConfigureAwait, etc. |
| **kinds** | `scg kinds [name]` | List the node kinds the graph understands. No DB needed; useful for picking the right `--kind` filter. |
| **query node** | `scg query node [--id <id> \| --uid <uid> \| --name <name> \| --kind <kind>] --database <db>` | Retrieve a single node by any locator. Foundation for the other queries. |
| **query callers** | `scg query callers <target-id> --database <db> [--depth <n>] [--exclude-tests \| --prod-only \| --tests-only]` | "Who calls this?" Direct callers at depth 1; transitive at higher depth. The single most important query before any edit — tells you blast radius. `--exclude-tests` (alias `--prod-only`) drops test-method callers when the question is "is this reachable from production?"; `--tests-only` keeps just tests. The three filters are mutually exclusive. |
| **query implementers** | `scg query implementers <type-id> --database <db> [--depth <n>]` | "What implements / derives from this?" Type hierarchy traversal. |
| **query base-types** | `scg query base-types <type-id> --database <db> [--include-interfaces] [--depth <n>]` | Reverse direction of `query implementers`: walks UP from a type to its bases. Without `--include-interfaces`, only `ClassExtendsClass` (class chain). With `--include-interfaces`, also `ClassImplementsInterface` / `StructImplementsInterface` / `InterfaceImplementsInterface` so a class reaches the interfaces it implements and an interface reaches the interfaces it extends. Without `--depth`, returns direct bases (one hop). With `--depth N`, returns transitive closure up to N hops, ordered by depth then Uid. Useful for refactor-impact analysis ("what types does this depend on for its contract?"), generic constraint checks, and visualizing inheritance chains. |
| **query members** | `scg query members <type-id> --database <db> [--include-inherited] [--depth <n>] [--kind <k>[,<k>...]] [--accessibility <a>[,<a>...]]` | Lists members declared on a type — methods, properties, fields, event-fields, indexers, constructors. Walks the `{Class,Struct,Interface}Declares{Method,Property,Field,EventField,Indexer,Constructor}` edge family. Without `--include-inherited`, just the type's own declarations (rows are `Node` envelopes). With `--include-inherited` (or any `--depth`), also walks `ClassExtendsClass` upward and unions members from each base; rows become `MemberWithDeclarer` envelopes carrying `member` + `declaredOnTypeId` + `depth` (0 = own, N > 0 = inherited). Class chain only — interfaces aren't walked; for interface bases run `query base-types --include-interfaces` then `query members` on each. `--kind` and `--accessibility` are CSV (`Method,Property` / `Public,Protected`); members shadowed in a derived class surface twice (raw inheritance closure, no shadowing rules applied). |
| **query overrides** | `scg query overrides <method-id> --database <db>` | Bidirectional over the `MethodOverridesMethod` edge emitted by `MemberDeclarationWalker`. Returns BOTH slices in one envelope: `overrides` = methods THIS one overrides (forward, at most one per C# language rule), `overriddenBy` = methods that override THIS (reverse, unbounded). The `direction` tag is a derived hint — `forward` (only the override slot is populated), `reverse` (only overriders), `both` (mid-chain method that overrides AND is overridden), `none` (resolved id, no edges either way), `unknown` (id doesn't resolve). Override is a structural fact about virtual dispatch, NOT a call edge — `TestCoverageWalker.TraversedEdgeKinds` deliberately excludes `MethodOverridesMethod` (a query-time `--include-overrides` flag on `covering-tests` would be the right shape if the attribution is wanted; out of scope for Wave 4). **Blind spots (treat results as a lower bound)**: external overrides (BCL like `object.ToString`, third-party NuGet virtuals) are NOT in the graph and don't surface; explicit-interface impls bind through `ExplicitInterfaceImplementations`, not the override slot, so they don't surface either; **expression-bodied property overrides** (`public override T Prop => expr;`) don't currently emit edges because the walker doesn't synthesize `AccessorNode`s for that syntactic form (block-bodied `{ get { return expr; } }` accessor overrides DO emit edges correctly). |
| **query inheritors-of-method** | `scg query inheritors-of-method <method-id> --database <db>` | Combined reverse-direction query over BOTH `MethodOverridesMethod` (overriders) AND `MethodCallsBaseMethod` (base-callers — call sites that invoke the queried method via `base.X()`). Returns two slices in one envelope; `direction` tag is `overriders` / `base-callers` / `both` / `none` / `unknown`. A method that BOTH overrides AND base-calls the queried method appears in BOTH slices simultaneously — the engine returns the raw closure without dedup; consumers wanting "unique inheritors" dedupe at their layer. Distinct from `query overrides` (which returns only the override edge in both directions); use this when you want every transitive way "something derives from / reaches into" the queried method. **Behavioral note**: `MethodCallsBaseMethod` IS counted by `TestCoverageWalker` (a `base.X()` call is a real method call; a test of the override transitively exercises the base) — symmetric inverse of the `MethodOverridesMethod` exclusion. |
| **query covering-tests** | `scg query covering-tests <target-id> --database <db> [--direct-only \| --transitive \| --depth <n>]` | "What tests exercise this method?" Crucial before changing behavior — tells you which tests will catch regressions. Default uses pre-materialised Exercises edges (capped at TestCoverageWalker's 3-hop BFS). Pass `--transitive` (or `--depth N`, which implies it) when the target is a private helper reached only through deeper pipelines and the basic query returns zero. `--direct-only` and `--transitive` are mutually exclusive. |
| **query exercised-by** | `scg query exercised-by <test-id> --database <db>` | Inverse of covering-tests: given a test, what production methods does it call? Useful for understanding test scope. |
| **query recent** | `scg query recent --database <db> [--since <iso-8601>] [--min-commits <n>]` | Hot-path identification: which symbols have been edited recently / often. |
| **query hotspots** | `scg query hotspots --database <db> [--since <iso-8601>] [--top <n>] [--sort composite\|churn\|fan-in\|coverage]` | Top-N production methods ranked by composite hotspot score = `churnPct × fanInPct × (1 − coveragePct)`. Each row carries raw axis values (`churn`/`fanIn`/`coverage`), per-axis percentile (`churnPct`/`fanInPct`/`coveragePct`) AND the composite — so the agent can answer "is this hotspot real?" without re-querying (high-churn / zero-coverage = real; high-churn / high-coverage = probably fine). Envelope-level distribution stats (P50/P75/P95/P99/Max for each axis) tell consumers whether top-N covers the high-risk tail or barely scratches the surface. Default `--top 20`. Test methods are excluded from the candidate set. `--since` filters to methods declared in files with `LastCommitDate ≥ since` (lifetime fallback when null). |
| **query blast-radius** | `scg query blast-radius <source-id> --database <db> [--kinds <k1,k2,...>] [--depth <n>] [--max-frontier-width <n>] [--max-visits <n>]` | "If I change X, what types of impact propagate?" Pre-refactor sanity check. `--kinds` is optional (omitted = all kinds; the kindsHistogram surfaces the top-N affected categories). BFS stops when a single level exceeds `--max-frontier-width` (default 50) or total visits exceed `--max-visits` (default 5000). The envelope reports `truncated`, `truncationReason`, `maxDepthReached`, `visitedCount`. |
| **query orphans** | `scg query orphans --database <db> [--kind <k>] [--under <p>] [--repo <r>] [--include-tests] [--include-direct-callers-only] [--include-generated] [--allow-any-kind]` | "What's never called?" Methods with zero callers — dead-code candidates. Default: methods only and excludes test methods (their callers are runtime-bound). `--allow-any-kind` widens to every node kind. `--include-direct-callers-only` ignores transitive reachability when classifying. Reads results carefully — runtime-bound code (DI, reflection, attribute binding) is structurally invisible and false-positives are expected there. |
| **query exercising** | `scg query exercising <target-id> --database <db> [--include callers\|tests\|all]` | "What reaches this?" Direct callers + (with `--include tests` or `all`) covering tests in one envelope. The `--include all` form is the swiss-army "show me everything that touches this" — typically the right call before a behavioral edit. |
| **query diff** | `scg query diff (--from <old.db> \| --since <git-ref> \| --current) [--to <new.db>] [--solution <slnx>] [--system-name <name>] [--repo <name>] [--under <path>] [--format <fmt>]` | "What changed structurally?" Three modes — see paragraph below. Envelope: `{fromTotal, toTotal, added, removed, modified, warnings[], summary{addedCount, removedCount, modifiedCount, unchangedCount, byKind, unaccountedFromCount}}`. `warnings` is structured: each entry `{code, severity, message, files?}` — codes include `DIFF_ORPHAN_NO_PROJECT`, `DIFF_LINKED_MULTI_PROJECT`, `DIFF_MSBUILD_LOAD`. `modified` rows carry `{fromId, toId, before, after, changes:[...]}` (tags: `signature`, `location`, `payload`). Partition contract: `fromTotal = unchanged + removed + modified + unaccountedFromCount`. |
| **query di** | `scg query di <node-id> --database <db> [--format <fmt>]` | DI / runtime-binding facts for a single node id, in four directional slices: `asImplementation` (edges that target this id), `asInterface` (RegistersInterfaceImplementation edges whose Metadata.Interface is this id — "what implementations resolve me at runtime?"), `asFunctionEntryPoint` (HasFunctionEntryPoint edges targeting this id), `triggers` (RegistersFunctionTrigger edges originating from this id). |
| **query di-bindings** | `scg query di-bindings --database <db> [--by-interface <id>] [--by-impl <id>] [--by-source <id>] [--lifetime singleton\|transient\|scoped]` | Global listing of every DI registration edge in the graph (RegistersInterfaceImplementation / RegistersConcreteService / RegistersHostedService). Distinct from `query di <id>` (node-scoped). Filters narrow progressively. Use for "what does this project register?", "what's wired up for IFoo?", "which singletons live in this graph?". |
| **query doc-gaps** | `scg query doc-gaps --database <db> [--accessibility <list>] [--under <path>] [--allow-any-kind] [--include-generated] [--include-tests]` | Public surface with empty `Documentation` payload — symmetric with `query test-gaps` but anchored on missing docs. Default kind-list: 11 syntactic doc-target kinds (Class / Interface / Struct / Enum / Delegate / Method / Property / Field / Constructor / EventField / Indexer); default accessibility: Public + Protected (narrower than test-gaps because internal docs are typically scoped to the assembly); excludes test methods and source-generated by default. Walker may not populate Documentation for every kind even when source has docs — query is most reliable on the canonical kind-list. |
| **query test-gaps** | `scg query test-gaps --database <db> [--accessibility <list>] [--under <path>] [--allow-any-kind] [--include-generated]` | Public surface with zero covering tests — dual of `query orphans`. Default kind: Method; default accessibility: Public+Protected+Internal; always excludes test methods themselves; excludes source-generated nodes by default. **Known false positives:** runtime-bound symbols (DI services, attribute-bound entry points, reflection call sites) often have no structural Exercises edge even when real tests exercise them. |
| **query members-of-file** | `scg query members-of-file <file-path> --database <db> [--format <fmt>]` | Outline view: every symbol declared in a file, ordered by start line. Substring/URI semantics match `query findings --file` (filename / repo-relative / absolute / URI all accepted; backslashes normalised; LIKE wildcards escaped). Returns ALL kinds whose first FileSpan matches — symbol nodes plus any non-symbol nodes (e.g. `LockStatement`) in the file; consumers wanting strict outline filter on `$type`. |
| **query reads** / **query writes** | `scg query reads \| writes <id> --database <db> [--format <fmt>]` | Bidirectional over `MethodReads/WritesField` + `MethodReads/WritesProperty` (each command unions field + property edges). Auto-direction: callable id → fields/properties accessed (`by-callable`); field/property id → callables that access it (`by-storage`); unknown → `unknown`. Read and write are kept as separate commands (not merged) because the user mental model "who READS this state vs who WRITES this state" is the natural disambiguation when refactoring shared mutable state. |
| **query locks** | `scg query locks <id> --database <db> [--format <fmt>]` | Bidirectional over the four `*DeclaresLockStatement` edge kinds: callable id → lock-statement nodes held (direction `by-callable`); lock-statement id → containing callable (direction `by-lock`); unknown → `unknown`. The walker resolves a single enclosing callable per lock, so reverse direction returns at most one row. Replaces the plan's two-command spelling (`lock-holders` / `locks-held-by`) with the consistent auto-direction shape. |
| **query subscribers** | `scg query subscribers <id> --database <db> [--format <fmt>]` | Bidirectional over `MethodSubscribesToEvent`: callable id → events subscribed to (direction `by-callable`); event-field id → callables that subscribe (direction `by-event`); unknown id → empty + direction `unknown`. Covers both `+=` and `-=` under one edge family. **Gap**: event-RAISE (`event.Invoke()`) is not currently captured by any walker, so a "publishers" companion is unavailable today; deferred to a future walker addition. |
| **query catches-of** | `scg query catches-of <id> --database <db> [--format <fmt>]` | Bidirectional over `CatchesException`: callable id → exception types caught (direction `by-callable`); type id → callables that catch it (direction `by-exception-type`); unknown id → empty + direction `unknown` (distinguishes "no edges" from "id missing"). Same blind spots as `query throws-from`: external (BCL/NuGet) types absent; catch-all `catch{}` blocks bind no type and produce no edges. |
| **query throws-from** | `scg query throws-from <callable-id> --database <db> [--format <fmt>]` | "Every exception type this callable throws." Rides `ThrowsException` edges emitted by `ExceptionFlowWalker`. Source must be a callable (Method / Constructor / Accessor / Lambda / AnonymousMethod); other source kinds return empty. **Important blind spot**: external exception types (BCL such as `System.InvalidOperationException`, third-party NuGet) are NOT in the graph and don't appear — only in-graph exception types surface. Catch-all `catch { ... }` blocks don't bind to a type and produce no edges either way. Propagation (a method that doesn't catch what its callees throw) is invisible by design — combine with `query callers` for transitive reach. |
| **explain** | `scg explain <finding-or-rule-id> --database <db> [--with-similar]` | Surfaces SARIF metadata for a single finding (when input is a `finding:<hash>` id) or for a rule (when input is a rule id like `S2068`). Two input shapes; `inputKind` field on the envelope tells the consumer which path was taken. Finding-id input returns the specific finding's row plus its rule's metadata projected from the finding payload (RuleId / RuleName / HelpUri); with `--with-similar`, also returns a bounded sample of other findings flagging the same rule. Rule-id input returns rule metadata + total count + bounded sample of all findings with that rule. SCG does NOT store rule metadata as a separate node kind — it lives on each ingested `SecurityFindingNode`; this command projects from the first matching finding. Tools that emit incomplete rule metadata (RuleId only, no RuleName) flow through verbatim. `{found: false}` when neither a finding nor any rule-matching finding resolves. |
| **query sync-over-async** | `scg query sync-over-async --database <db>` | Lists every sync-over-async call site in the graph: `task.Result`, `task.Wait()` (any-arg), `task.GetAwaiter().GetResult()`, plus the conditional-access shapes `task?.Result` and `task?.Wait()`, all on a `System.Threading.Tasks.Task` / `Task<T>` / `ValueTask` / `ValueTask<T>` receiver. The classic ASP.NET-classic deadlock pattern. Detection is purely syntactic + a receiver-type semantic check at extraction time (see `SyncOverAsyncWalker`); custom user types named `Result` / `Wait()` / `GetResult()` are filtered out by the receiver-type check. Each row carries the containing callable, the syntactic pattern (`Result` / `Wait` / `GetResult`), the receiver-type FQN (using `OriginalDefinition` so generic instantiations collapse), the call-site id, location, and verbatim expression text. Sources: 4 callable kinds (Method / Constructor / Accessor / LambdaExpression — anonymous methods route under the lambda edge kind, mirroring the LockStatement convention). Detection covers both the chained `task.GetAwaiter().GetResult()` shape AND the stored-awaiter shape `var awaiter = task.GetAwaiter(); awaiter.GetResult();` — the receiver-type check recognises `TaskAwaiter` / `TaskAwaiter<T>` / `ValueTaskAwaiter` / `ValueTaskAwaiter<T>` and maps them back to the corresponding awaitable FQN, so `ReceiverTypeFqn` is uniform across both paths. **Remaining blind spots** (treat results as a lower bound): chained double-conditional `task?.GetAwaiter()?.GetResult()`; pathological `(await task).GetAwaiter().GetResult()` produces a (correct-but-bizarre) false positive. Distinct from `query async-deadlock-risk` (which surfaces callables that hold a lock AND await; this command surfaces the specific syntactic patterns regardless of whether they're inside a lock). |
| **query async-deadlock-risk** | `scg query async-deadlock-risk --database <db>` | Heuristic: every callable that BOTH holds at least one `lock(...)` AND has at least one `await` expression in its body. The classic async-deadlock pattern (lock taken, await on a sync-context-bound continuation that needs the same lock) requires control-flow analysis to detect precisely; this heuristic reports a structural over-set. The envelope carries an explicit `falsePositiveExpected: true` flag and a `disclaimer` field — the lock and the await may be on disjoint paths in the body. Each result row carries the full lock-statement set (`lockSpans`) and awaited-method set (`awaitedTargets`) so consumers can verify by inspection. Sources: 4 callable kinds — Method, Constructor, Accessor, LambdaExpression (the LockStatementWalker emits `LambdaDeclaresLockStatement` for both lambda AND anonymous-method bodies, so anonymous methods surface under the lambda edge kind when applicable). |
| **query references** | `scg query references <symbol-id> --database <db> [--include callers,reads,writes,implementers,findings,all]` | Aggregator over existing primitives: composes `callers` + `reads` + `writes` + `implementers` + `findings` into one envelope. `--include` is a CSV (default `all`); narrowing to specific slices is supported but the kind→slice mapping is auto-applied: callable kinds (Method / Constructor / Accessor / Lambda / AnonymousMethod) carry callers + reads + writes + findings; type kinds (Class / Interface / Struct / Enum / Delegate) carry implementers + findings; field / property / event-field kinds carry reads + writes. Slices the kind doesn't carry are silently omitted, NOT emitted as empty arrays — this keeps consumer code uniform across kinds. Envelope: `{command, id, found, kind, slices: {...}, totals: {...}}`. `{found: false}` when the id doesn't resolve. Distinct from `query exercising` (callers + tests, single dedup-and-rank list) and from `investigate` (broader rollup including covering-tests + key facts). Use `references` when the question is "every structural attachment point on this id" and you want each surface as its own slice. |
| **query findings** | `scg query findings --database <db> [--rule <id>] [--severity <level>] [--tool <name>] [--file <path>] [--for-method <id>] [--for-type <id>]` | Global listing of every `SecurityFindingNode` ingested via `extract --sarif-dir`. Filters narrow progressively: `--rule S2068`, `--severity error`, `--tool CodeQL`, `--for-method <id>` (returns findings attached via `MethodFlaggedBy`), `--for-type <id>` (via `TypeFlaggedBy`). `--file` is a case-insensitive substring match against the stored SARIF URI — accepts a filename (`Foo.cs`), repo-relative path (`src/Extractor/Foo.cs`), Windows-native or POSIX absolute path (backslashes are normalised), or full SARIF URI; SQL LIKE wildcards (`%`, `_`) in the input are escaped so filenames like `my_test.cs` match literally. Source data is SARIF 2.1.0 from external analyzers (NetAnalyzers, SonarAnalyzer, CodeQL, etc.); see `scg refresh-sarif` for the on-demand emission path or wire `<ErrorLog>` into `Directory.Build.props` for per-build emission. `investigate <type>` and `query exercising --include all` also surface finding counts / finding rows alongside the structural facts. |

**Locator narrowing flags:** `find`, `query node --name/--kind`,
and `investigate` accept `--repo <name>` and `--under <path>` to
narrow results to a single repo or subtree. Traversal commands
(`callers`, `implementers`, `covering-tests`, `exercised-by`,
`blast-radius`) deliberately span the full graph — cross-boundary
visibility is the point.

**`query diff` modes:**

- **`--from <old.db> --to <new.db>`** (Flavor A) — compare two
  pre-existing SCG databases. Use when both snapshots are already
  on disk. The to-DB defaults to autodiscovery from `.scg/`.
- **`--since <git-ref> [--solution <slnx>]`** (Flavor B) — resolves
  the git ref to a commit, materialises a historical SCG database
  cached at `.scg/historical/<sha>.db`, then diffs it against the
  current DB. First run extracts (slow); subsequent runs at the
  same sha hit cache (fast). Use for "what's changed since I
  shipped tag X" or "since last release."
- **`--current`** (Flavor C / Option D) — diffs the current DB
  against the on-disk source files it tracked. Loads each changed
  file's project through `MSBuildWorkspace` and uses Roslyn's
  semantic model to ground-truth parameter types — no
  re-extraction, but **requires the project to have been built**
  (`bin/<config>/<tfm>/*.dll` on disk). Refuses with a precise
  `dotnet build <project>` instruction when the assembly is
  missing. Use for "what symbols did I add or remove since I
  extracted?" without paying for a full extract pass. See blind
  spots below for limits.

**Output formats.** All commands emit JSON on stdout by default;
the envelope shape is `{command, count, results}`. Pass `--format
<name>` to switch the shape:

- `--format full` (default) — full envelope with the `results`
  array. Use for machine consumption / piping to `jq`.
- `--format compact` — drops `results`, adds `kindsHistogram` +
  first-N `sample`. Use for terse summary view; quick at-a-glance
  composition check.
- `--format markdown` — GFM-flavoured human-readable output.
  Available on every query. Flat-array shapes (callers /
  implementers / find / etc.) get a `kind | name | location`
  table. Bespoke shapes use richer projections: bidirectional
  (`overrides`, `inheritors-of-method`) renders two named slices;
  `diff` renders Added / Removed / Modified / Warnings sections;
  `hotspots` renders distribution stats + ranked rows; the four
  findings-surfacing commands (`query findings`, `query
  references`, `investigate`, `query exercising --include all`)
  render the SARIF metadata table — `ruleId | severity | tool |
  message | location` — the columns an agent actually wants when
  triaging analyzer findings. Use for chat-paste / readable
  terminal output / agent-consumed envelopes.
- `--format mermaid` — fenced ` ```mermaid ` `graph TD` block,
  available ONLY on graph-shaped queries: `callers`,
  `implementers`, `base-types`, `overrides`,
  `inheritors-of-method`, `blast-radius`. Non-graph queries with
  this format return a Usage error pointing at `--format markdown`.
  Use for inline-rendered diagrams in chat platforms (GitHub PRs,
  Slack, Notion).
- `--format graphviz` — DOT (`digraph G { ... }`) on the same
  graph-shaped query set as `mermaid`. Use for offline diagram
  rendering (`dot -Tsvg < out.dot`).

**Format dispatch**: every renderer is deterministic for a given
input (no timestamps, no random ordering) so per-shape pin tests
against golden output are stable. The renderer code lives in
`src/SemanticCodeGraph.Cli/Format/` (`MarkdownRenderer`,
`MermaidRenderer`, `GraphvizRenderer`).

**Errors** write `{command, error}` to stderr. **Exit codes:**
- `0` — success (zero results is still success)
- `1` — usage error (unknown command, missing required argument,
  bad flag combination, `--format mermaid` on a non-graph query)
- `2` — input error (file not found, bad id format, missing DB)
- `3` — runtime error (uncaught exception during execution)
- `4` — ambiguous (under-specified id matches multiple candidates)
- `5` — stale graph + `--strict-stale` (DB drifted from source;
  the warning fires regardless, but `--strict-stale` exits without
  producing results)
- `130` — SIGINT (graceful Ctrl+C; long-running watch mode exits
  this way after emitting `settled` to stderr)

**Strict-stale + classification:** any read-side command (every
`query`, `find`, `investigate`, `diagnose`, `audit async`) accepts
`--strict-stale`. Without it, a stale DB emits a warning to stderr
and the command proceeds. With it, the command exits with code 5
instead of returning results — useful when a script must not act
on a graph that has drifted from source. The warning text annotates
each changed file with its drift class: `(structural)` (tokens
shifted; re-extract advisable), `(whitespace)` (only formatting /
comment / trivia edits — extractor would emit the same graph),
`(deleted)` (file gone), `(unknown)` (legacy snapshot without a
token-hash baseline; treat conservatively). Whitespace-class drift
generally doesn't require re-extracting; structural-class does.

**Before any Grep with `--type cs` or a `*.cs` glob, pause and ask:**
would one of `scg find`, `scg query callers`,
`scg query covering-tests`, `scg query implementers`, or
`scg investigate` answer this faster?

- "Where is method X used?" → `query callers`, not Grep.
- "What tests exercise method X?" → `query covering-tests`, not Grep.
- "What types implement interface I?" → `query implementers`, not Grep.
- "What does class C extend? What interfaces does it implement?" / "Walk the inheritance chain from this type up to its base hierarchy" → `query base-types <type-id> --include-interfaces --depth N`. Reverse direction of `query implementers` over the same edges. Without `--include-interfaces`, just the class chain (`ClassExtendsClass` only).
- "What members does this type declare?" / "What public properties does this class have?" / "Show me all methods (own + inherited) on Derived" → `query members <type-id> [--include-inherited] [--kind Method,Property] [--accessibility Public]`. Walks the `*Declares*` member edges. Direct path returns own declarations as plain `Node` rows; with `--include-inherited` walks `ClassExtendsClass` upward and returns `MemberWithDeclarer` rows (each carries `declaredOnTypeId` + `depth`). Class chain only — interface members don't surface unless you query the interface separately. CSV filters narrow by kind and Roslyn accessibility.
- "What does this method override?" / "Who overrides this virtual?" / "Walk the override chain on Animal.Speak" → `query overrides <method-id>`. Bidirectional over `MethodOverridesMethod`. Both slices return in one envelope; `direction` tag tells you which side(s) had edges. Mid-chain methods (Dog.Speak overrides Animal.Speak AND is overridden by Puppy.Speak) surface in both slices simultaneously — the engine returns one-hop neighbours, not the transitive closure (matches C# language semantics where override is a one-step relationship). External base methods (`object.ToString`) deliberately don't surface; explicit-interface impls don't either (they bind through a separate slot, not the override slot).
- "Show me everything that inherits from this method" / "Who overrides AND who base-calls Base.Foo?" → `query inheritors-of-method <method-id>`. Combined reverse-direction over both `MethodOverridesMethod` and `MethodCallsBaseMethod` in one envelope. Distinct from `query overrides`: `overrides` returns the structural override slot in both directions; `inheritors-of-method` adds the runtime-call dimension via `base.X()`. Use this when you want every way "something derives from / reaches into" the queried method.
- "What does class C look like — callers, tests, key facts?" →
  `investigate`, not Grep + manual reading.
- "Find symbols matching name pattern P" → `find`, not Grep.
- "How many call sites does this method have?" → `query callers`
  followed by reading `count` from the JSON envelope, not
  `grep ... | wc -l`.
- "What's the full reach of this method (callers + covering tests
  in one shot)?" → `query exercising <id> --include all`.
- "What's never called / dead-code candidates?" →
  `query orphans`. Pair with `--include-tests` if tests should
  count, `--allow-any-kind` to widen beyond methods.
- "What tests cover this private helper?" — basic
  `query covering-tests <id>` returns 0 because the
  `TestCoverageWalker` BFS is depth-capped at 3 hops. Pass
  `--transitive` (or `--depth N`) to walk MethodCallsMethod
  upward at query time. Most common case: editing a private
  emit-helper called only through a long pipeline.
- "What's registered for IFoo across the whole project?" /
  "Which singletons live in this graph?" →
  `query di-bindings` with `--by-interface <id>` /
  `--by-impl <id>` / `--by-source <id>` / `--lifetime
  singleton|transient|scoped`. Distinct from `query di <id>`
  (node-scoped) — `di-bindings` is the global listing.
- "What exception types does this method throw?" / "Which methods throw `MyCustomException`?" → `query throws-from <callable-id>` (forward direction; in-graph exception types only — BCL like `InvalidOperationException` are skipped by design).
- "What does this catch block handle?" / "Where is `MyCustomException` caught in the codebase?" → `query catches-of <id>` (auto-detects direction from id kind: callable → types caught, type → callables catching).
- "Who handles this event?" / "What events does this method subscribe to?" → `query subscribers <id>` (auto-detects direction; covers both `+=` and `-=` under one edge family). Note: event-raise via `event.Invoke()` is not captured today — there is no "publishers" companion yet.
- "What locks does this method take?" / "Which method holds this `lock(_sync) { ... }` block?" → `query locks <id>` (auto-detects direction). Each lock has at most one holder per the walker contract; a lock-id reverse query returns 0 or 1 callable.
- "Who reads `_state`?" / "Who mutates `Counter`?" / "What state does `MyMethod` touch?" → `query reads <id>` and `query writes <id>` (auto-direction over field+property access edges). Critical for shared-mutable-state refactors — pair with `query locks` to see what synchronization exists around the state.
- "What's declared in this file?" / "Outline of `Foo.cs`" → `query members-of-file <path>`. Substring match against the stored file path; same path semantics as `query findings --file` (filename / repo-relative / absolute / URI accepted).
- "What does method/class X look like in source?" / "Show me the source for symbol id Y" → `scg signature <id>`. Returns the source-span text verbatim from disk, one entry per FileSpan (partial types yield N). XML docs aren't inside the syntax-node location, so pass `--with-doc` to surface them separately. Distinct from `info` (no source) and `investigate` (no source). For a one-line "what kind, where, what's the parent" the right call is `info` — use `signature` only when the source text is what you actually need.
- "What does this finding mean?" / "Tell me about rule S2068" / "Show me other findings for the same rule" → `scg explain <id>`. Two input shapes: a `finding:<hash>` id (returns the specific finding + its rule's metadata; with `--with-similar`, also a sample of other findings for the same rule) or a rule id like `S2068` (returns rule metadata + total count + sample of all findings flagging it). The `inputKind` field on the envelope tells you which path was taken. Distinct from `query findings` (lists matching findings; doesn't surface rule metadata as its own slice).
- "Find every `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` on a Task" / "Where are the sync-over-async call sites?" → `scg query sync-over-async`. Walker captures the three syntactic patterns at extract time with receiver-type filter (Task / Task<T> / ValueTask / ValueTask<T>); query is a thin SELECT. Custom user `Result` / `Wait()` / `GetResult()` are filtered out by the receiver-type check. Distinct from `query async-deadlock-risk` (which is the lock-AND-await structural over-set, not specific call-site patterns).
- "Where might async deadlocks be?" / "Find methods that await while holding a lock" → `scg query async-deadlock-risk`. Heuristic over the structural over-set: any callable with both `*DeclaresLockStatement` AND `AwaitsMethod` outgoing edges. The envelope carries a `disclaimer` field and `falsePositiveExpected: true` because the lock and the await may be on disjoint paths in the body — flow-sensitive analysis is out of scope. Treat results as candidates and verify before actioning.
- "Show me everything that references this symbol" / "Every structural attachment on this id" → `scg query references <id>`. Aggregator that returns each surface as its own slice (callers, reads, writes, implementers, findings) instead of dedup'd into one list. Auto-direction by kind: callable → callers + reads + writes + findings; type → implementers + findings; field / property → reads + writes. Slices the kind doesn't carry are silently omitted from the envelope. Pass `--include callers,findings` (CSV) to narrow. Distinct from `query exercising` (single ranked list, callers + tests only) and from `investigate` (broader human-style rollup). When the consumer is downstream code that wants per-slice arrays — not a human reading text — `references` is the right call.
- "I'm about to edit this method/class — give me the full pre-edit environment in one call" / "What do I need to know before changing X?" → `scg edit-context <id>`. Composes nine slices into one envelope (callers, reads, writes, implementers, coveringTests, findings, churn, signature, body, blastRadius, diagnostics) with always-present keys and a four-state status taxonomy (`Complete` / `Truncated` / `Skipped` / `NotApplicable`). Slim per-slice projections keep the envelope size bounded. Distinct from `query references`: structural-only references are faster and narrower; `edit-context` adds source body + churn + diagnostics for the pre-edit ritual. Pass `--no-body` to skip the body slice (when you only want metadata), `--no-blast-radius` to skip the BFS, `--max-callers <n>` to cap the callers/reads/writes/implementers slices (truncation surfaces honestly with `reason: "max-callers=N"`).
- "What's interesting in this file before I start editing?" / "Show me a per-symbol overview of Foo.cs" / "Which symbols in this file have coverage gaps and recent churn?" → `scg pre-edit-context --file <path>`. Default `--summary` returns a slice-status grid per symbol with row counts — fast triage. Pass `--full` for per-symbol full edit-context envelopes; body + blast-radius default OFF in `--full` (opt in with `--include-body` / omit `--no-blast-radius`). Use the summary grid to pick interesting symbols, then run `edit-context` on those specific ids for full payloads.
- "Which tests must I re-run after this change?" / "Pre-merge test selection from a diff" / "Tests covering the methods I touched in these files" → `scg test-selection`. Three input modes: `--diff --current` (diff against current source), `--diff --from <ref>` (diff against a historical commit; requires `--solution`), `--files <p,...>` (explicit list). Output rows carry pre-built `--filter-class` args for the in-process xunit-v3 runner; envelope-level `dedupClassFilter` is the deduplicated arg list ready to splat into the test runner. Transitive coverage default-ON; `--direct-only` opts out.
- "Where are the hotspots?" / "Which production methods are high-churn AND low-coverage?" / "Risk-rank methods for refactor focus" → `scg query hotspots`. Composes churn (file-level `LastCommitDate` / `CommitCount`) + fan-in (incoming `MethodCallsMethod`) + coverage (incoming `Exercises`). Each row carries raw axis values + per-axis percentile + composite score so the agent can drill in on "high churn, zero coverage" rows specifically. Distribution stats per axis (P50/P75/P95/P99/Max) tell you whether top-N covers the high-risk tail. Default `--top 20`, `--sort composite`; `--sort coverage` ranks low-coverage methods first.
- "What public methods have no tests?" / "Where are the test gaps?" → `query test-gaps`. Dual of `orphans`. Default: Method + public/protected/internal. Caveat: runtime-bound symbols (DI, attribute-bound) often surface as false positives; treat results as candidates not certainties.
- "What public symbols lack XML docs?" / "Where are the doc gaps?" → `query doc-gaps`. Sister to `test-gaps`. Default: 11 doc-target kinds + public/protected; excludes test methods. `--include-tests` to widen.
- "What security or correctness findings does this codebase
  have, and what symbols carry them?" / "Which methods are
  flagged by rule S2068?" / "Show me every error-level finding
  from CodeQL" → `query findings` with `--rule <id>` /
  `--severity <level>` / `--tool <name>` / `--file <path>` /
  `--for-method <id>` / `--for-type <id>`. `--file` is a
  case-insensitive substring match: pass any of filename
  (`Foo.cs`), repo-relative path, Windows-or-POSIX absolute
  path, or full SARIF URI — backslashes are normalised and
  LIKE wildcards (`%`, `_`) are escaped so filenames with
  underscores match literally. Source data: SARIF 2.1.0
  from external analyzers; emit via `<ErrorLog>` in
  `Directory.Build.props` (per-build) or
  `scg refresh-sarif --output <dir>` (on-demand), then
  `scg extract --sarif-dir <dir>` ingests them. `investigate
  <type>` and `query exercising --include all` also surface
  finding counts.
- "How do I emit fresh SARIF for a codebase that doesn't have
  `<ErrorLog>` wired into its build?" → `scg refresh-sarif
  --output <dir> --solution <slnx> --tool dotnet-build`. Pair
  with `scg extract <slnx> --output <db> --sarif-dir <dir>`
  to ingest. Self-rebuild caveat: when running `refresh-sarif`
  against the same solution that produced the running scg
  binary, copy `bin/Debug/net10.0/*` to a temp dir and run
  from there — the running process holds locks on its own
  output DLLs that the child build needs to overwrite.
- "Find every type-shaped symbol matching pattern P" (Class /
  Interface / Struct / Enum / Delegate, no methods/fields) →
  `find P --types-only`. To suppress noise kinds without
  enumerating what to keep, `find P --exclude-kinds Method,File`.
- "Did the DB drift, and if so, do I need to re-extract or is it
  just whitespace?" → read the staleness warning's annotations:
  `(structural)` ⇒ re-extract; `(whitespace)` ⇒ ignore;
  `(deleted)` ⇒ file gone; `(unknown)` ⇒ legacy snapshot, treat
  conservatively. For agents that must not act on a drifted DB,
  pass `--strict-stale` on any read-side command — exits with
  code 5 instead of returning results.
- "Should the post-edit regression catch the file I just edited?"
  — when the editsite is a private helper, run
  `scg query covering-tests <id> --transitive` first; pass each
  unique class name from the result to `-class` flags on the test
  runner. Class-name intuition under-sizes the scope on shared
  infrastructure changes.
- "What did I add or remove since I last extracted?" →
  `query diff --current` (cheap, no re-extract).
- "What's changed since I shipped <tag/sha/branch>?" →
  `query diff --since <ref>` (one-time slow extract per sha,
  cached after).
- "What's structurally different between these two SCG snapshots?"
  → `query diff --from <old> --to <new>`.
- "Did the diff have any orphan files / linked-file edge cases /
  MSBuild load errors?" → check `warnings[]` in the JSON envelope
  and filter on `code` (`DIFF_ORPHAN_NO_PROJECT`,
  `DIFF_LINKED_MULTI_PROJECT`, `DIFF_MSBUILD_LOAD`). Stderr also
  prints them as `warning [CODE]: ...` lines for terminal users.

Grep is the right tool when the question is "where does this exact
string / regex appear in any file?" — string literals, log messages,
config keys, comments, content searches in non-`.cs` files. SCG is
the right tool when the question is structural ("who," "what
implements," "if I change this, what breaks?"). When in doubt on
`.cs` source, default to SCG.

**Known blind spots** (when to fall back to coverlet / grep /
re-extract):

- **Runtime-bound call sites**: Azure Functions runtime attribute
  binding, DI container resolution, reflection-based call sites,
  and source-generated call sites are sometimes invisible to the
  graph. For runtime-binding cases, use coverlet for ground-truth
  coverage.
- **`query orphans` in DI-heavy code**: any class wired via DI looks
  orphaned to the structural graph — its consumers resolve through
  the container, not through a direct `new` or method call. Treat
  `orphans` results in DI codebases as candidates, not certainties.
- **`query diff --current` requires a built project**. Each
  changed file's project must have a current `bin/<config>/<tfm>/<asm>.dll`
  on disk. The differ loads the project through MSBuildWorkspace
  and uses Roslyn's semantic model to resolve parameter types —
  ground truth, no heuristic. If the assembly is missing the
  command refuses with the exact `dotnet build <project>` to run.
  We deliberately do NOT auto-build because builds fail mid-edit
  precisely when `--current` is most useful. The only remaining
  blind spot: brand-new files added since extraction aren't in the
  snapshot's fingerprint set and won't show up — re-extract to
  pick them up.
- **Stale DB after edits**: query results reflect the last extract,
  not the live source. SCG warns on stderr when the DB is stale
  (`{"warning": "stale: …"}`); re-extract when the warning fires
  on questions where structural truth matters.

**Discipline:** the `pre-edit-structural-lookup` and
`post-edit-consistency-check` skills auto-load before/after `.cs`
edits and use SCG under the hood. If the skill fires but `scg.exe`
isn't reachable, build/install the CLI first — don't skip the
structural lookup because the path needs work.
