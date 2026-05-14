# Appendix: Tool Usage Discipline

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 2.0 | **Updated**: 2026-05-08
>
> **Owns**: Structural-tool priority per track, file exploration, search strategy, lint commands per track, test execution per track, command safety, git operations, docker operations, process hygiene.
>
> **Fires when**: "find usages of", "who calls X", "search the codebase", "run lint", "run tests", "is this safe to delete?", before any shell command.

---

## Structural Tool Priority (per kernel rule)

> **Cross-track rule from kernel**: For structural questions ("who calls X?", "what implements Y?", "blast radius of Z?", "which tests cover W?"), use the language-specific structural tool first; **grep is the fallback, not the default**.

Grep sees text; structural tools see semantics. A structural tool knows that `Foo()` in a comment is not a call and that `MyClass` in a string literal is not a type reference.

### Per-track structural tools

#### Track: dotnet

> **Depth**: expert.

- **Roslyn-based language servers** — Visual Studio / Rider / OmniSharp / Razor expose "Find All References", "Go to Implementation", "Find Callers" via the Roslyn workspace.
- **`Microsoft.CodeAnalysis`** APIs — for programmatic structural queries (build a small CLI wrapping `Workspace`, `SymbolFinder`, `Compilation` for repo-specific queries).
- **`dotnet-symbol`** — symbol metadata for diagnostics.
- **Project-specific structural tools** — if your team has built a Roslyn-based query tool over your codebase, document it in `[APP]__PROJECT_SPECIFIC.md` and reference it from this section.

#### Track: python

> **Depth**: consensus.

- **`pyright` LSP** (or `mypy --inspect`) for cross-file symbol resolution.
- **`jedi`** for go-to-definition, usages, and refactoring.
- **`ast` stdlib + `astroid`** for programmatic AST walking.
- **`grep-ast`** — semantic grep that respects AST boundaries.

For "who imports X": `grep -r "from <module> import <symbol>" .` works as a fallback but misses dynamic imports and `importlib` patterns.

#### Track: typescript

> **Depth**: consensus.

- **TypeScript Language Service** (`tsserver`) — used by editors; can be queried programmatically for "find all references" and "go to definition".
- **`tree-sitter`** — language-agnostic structural parsing; `tree-sitter-typescript` grammar for TS.
- **`ts-morph`** — programmatic TypeScript AST manipulation.

For "who calls X": editor-driven "Find All References" beats grep when types are complex (overloads, generics, decorators).

#### Track: go

> **Depth**: consensus.

- **`gopls`** — Go language server; "find references", "implementations", "callers" all available via LSP.
- **`go/ast` stdlib** for AST-level analysis.
- **`golang.org/x/tools/go/callgraph`** for call-graph construction.
- **`grep -r --include="*.go"`** acceptable for simple symbol lookups (Go's import discipline makes name collisions rare).

#### Track: rust

> **Depth**: consensus.

- **`rust-analyzer`** — language server with full structural-query support ("find references", "find implementations", "find usages of trait method").
- **`syn`** — Rust syntax-tree library; the basis for proc macros and analysis tools.
- **`cargo-call-stack`** — call graph and stack-depth analysis.
- **`cargo expand`** — see what proc macros generate (essential when a macro creates the symbol you're investigating).

### Fallback: grep

When the structural tool is unavailable or doesn't understand a metaprogramming pattern, fall back to grep — but document the limitation as a known blind spot. Grep won't see:

- Reflection / dynamic dispatch (`Type.GetMethod` in .NET, `getattr` in Python, `eval` anywhere)
- Macro-expanded code (Rust proc macros, C# source generators, TS decorators that emit calls)
- DI container resolutions (constructor-injected services aren't called via name in source)
- ORM-generated query callers (LINQ-to-SQL translators, SQLAlchemy magic methods)

For these patterns, structural tools are not just preferred — they're necessary.

---

## File Exploration

### Before Assuming Paths Exist

- Use the agent's directory-listing tool (Glob, `ls`, `tree -L 2`) before assuming a file path exists
- Check project conventions in `[APP]__PROJECT_SPECIFIC.md` before creating new files/folders

### Reading Files

- **Read before modifying** — Always read existing files before proposing changes
- Use targeted reads (specific line ranges) for large files to conserve context
- For files >500 lines, read sections relevant to your task

---

## Search Patterns

### Code Search Strategy

1. **Structural tool first** (per the rule above) for "who calls", "what implements", "find references"
2. **Tests for usage examples**: When learning how code is used, check tests first to see how it's supposed to work
3. **Grep with filters**: Narrow searches with file-type filters to reduce noise

### Finding Usages (when grep is the right tool)

```bash
# Find all references to a symbol (track-appropriate file extension)
grep -r "function_name" --include="*.<ext>" <source-dir>/

# Find all imports of a module
grep -r "<import-keyword> module" --include="*.<ext>" .

# Find test coverage for a feature
grep -r "test.*feature" --include="*.<ext>" tests/
```

For "who calls X" / "what implements Y" / "blast radius" — use the structural tool, not grep.

---

## Linter Discipline

### Immediate Feedback

- Run lint/format on a file **immediately after editing** to catch syntax errors
- Never leave a file in a broken lint state between edits
- **Passing lint = part of the definition of done** (per kernel build-clean rule)

### Quick Lint Commands per track

#### Track: dotnet

- File-targeted formatting: `dotnet format whitespace --include <path>` and `dotnet format style --include <path>`
- Solution-wide: `dotnet format` (whitespace + style + analyzer fixes)
- Verify-only (CI): `dotnet format --verify-no-changes`

#### Track: python

- `ruff check <path>` (lint) + `ruff format <path>` (format)
- `mypy <path>` (type-check)
- File-targeted: pass the path; project-wide: omit it

#### Track: typescript

- `eslint --fix <path>` (lint + autofix)
- `prettier --write <path>` (format)
- `tsc --noEmit` (type-check; whole project — TS doesn't natively support per-file)

#### Track: go

- `gofmt -l -w <path>` (format)
- `go vet ./...` (vet, package-level)
- `staticcheck ./...` (richer linting)

#### Track: rust

- `cargo fmt` (format)
- `cargo clippy --all-targets --all-features -- -D warnings` (lint with warnings as errors)
- Per-crate: `cargo clippy --package <name>`

See `[APP]__PROJECT_SPECIFIC.md` for this project's exact commands and any tool-specific config.

---

## Command Safety

### Destructive Commands

- Destructive commands (`rm`, `DROP TABLE`, `git reset --hard`, force-push, etc.) require explicit user approval
- Never batch destructive operations
- Prefer `mv` to archive instead of `rm` where possible

### Safe Patterns

```bash
# Instead of deleting, archive
mkdir -p archive
mv file_to_delete.<ext> archive/file_to_delete.<ext>.bak

# Instead of force operations, use safer alternatives
git stash  # instead of git reset --hard
```

### Commands That Require Approval

| Command Type | Examples | Approval Required |
|--------------|----------|-------------------|
| File deletion | `rm`, `rmdir`, `Remove-Item` | Always |
| Database mutations | `DROP`, `TRUNCATE`, `DELETE` (without WHERE) | Always |
| Git destructive | `reset --hard`, `push --force`, `branch -D` | Always |
| System packages | `apt install`, `brew install`, `winget install` | Always |
| Network requests | `curl -X POST/PUT/DELETE` to non-localhost | Context-dependent |

---

## Git Operations

### Core Rules

- **Never commit or push** without explicit user request
- Only stage changes; user handles commits/pushes/deploys
- Ask before any git commit/push operations
- **Verify the active branch before any commit** — the working tree may be shared across sessions; HEAD may have changed in another session. Run `git status` before staging; if HEAD is unexpected, halt and ask.

### Safe Git Commands (Can Auto-Run)

```bash
git status
git diff
git log -n 10
git branch
git show <commit>
```

### Unsafe Git Commands (Require Approval)

```bash
git commit
git push
git reset --hard
git rebase
git merge
git checkout -b  # (creates branch)
```

---

## Test Execution

### Running Tests Safely

Per-track commands per `[APP]__IMPLEMENTATION.md` § TDD. Quick reference:

| Track | Targeted | All tests |
|-------|----------|-----------|
| dotnet | `dotnet test --filter "FullyQualifiedName~<name>" --solution <name>.slnx` | `dotnet test --solution <name>.slnx` |
| python | `pytest tests/path/to/test_file.py::test_name -v` | `pytest tests/ -v` |
| typescript | `vitest run path/to/test` (or `npm test -- <pattern>`) | `vitest run` (or `npm test`) |
| go | `go test -run TestName ./pkg` | `go test ./...` |
| rust | `cargo test --package <name> -- <test_pattern>` | `cargo test` |
| E2E | _(may take time — inform user)_ | `npx playwright test`, `cypress run`, etc. |

See `[APP]__PROJECT_SPECIFIC.md` for this project's exact test commands.

### Test Data Management (cross-track)

- Use deterministic test data (no random UUIDs / timestamps in inputs)
- Clean up test artifacts after runs
- Don't leave test databases in inconsistent state

---

## Docker Operations

### Safe Operations

```bash
docker ps
docker logs <container>
docker-compose ps
```

### Operations Requiring Awareness

```bash
docker-compose up -d    # Starts services (OK for local dev)
docker-compose down     # Stops services (inform user)
docker system prune     # Destructive (require approval)
```

---

## Process Hygiene (cross-track)

These rules optimize how the agent interacts with the shell, especially during long-running operations.

### One Purpose Per Shell Call

❌ **Avoid**: `cmd1 && cmd2 | cmd3 > /dev/null; cmd4` (multiple unrelated operations chained)
✅ **Prefer**: separate calls for separate purposes — each tool call is one logical operation.

When commands genuinely need to chain (e.g., `cd && build`), use sequential invocations or a single chained operation with clear intent. Avoid `;`-chained pipelines that mix unrelated work.

### Narrate Before Long-Running Calls

When kicking off a multi-minute build, full test suite, or background process, narrate first:

> "Starting full build (typically 90s). Waiting for completion."

This lets the user distinguish "agent is working" from "agent is hung".

### Prefer Background Mode for Genuinely Long Tasks

When parallel work is available and the long-running task doesn't block the next step, run it in the background and check back when notified.

### On Internal Errors, Retry Simply

If a tool result returns "Tool result missing due to internal error" — retry immediately in the simpler form (single-line command, file-based script). Don't loop on the same multi-line shape.

### Active-Branch Verification Before Commit

The working tree may be shared across sessions on the same machine. A branch switch in another session changes HEAD globally. Before any `git commit`:

1. Run `git status` to confirm current branch.
2. If unexpected, halt and ask before staging.

The `gitStatus` snapshot at session start is *not* live — verify before acting.

---

## Quick Reference

### Always Do

- ✅ Use the structural tool before grep for structural questions
- ✅ Read file before editing
- ✅ Run lint after editing
- ✅ Check test status before marking done
- ✅ Use targeted edits over full rewrites
- ✅ Narrate before long-running calls
- ✅ Verify active branch before commit

### Never Do Without Approval

- ❌ Delete files
- ❌ Commit to git
- ❌ Push to remote
- ❌ Run database migrations on production
- ❌ Install system packages
- ❌ Force-push to any shared branch
