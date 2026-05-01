# Appendix: Tool Usage Discipline

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-01-22
> **Scope**: Best practices for agent tool usage and command execution

---

## File Exploration

### Before Assuming Paths Exist
- Always use `ls -la` or `find` before assuming a file path exists
- When uncertain about structure, use `tree -L 2` or `find . -type f -name "*.py"`
- Check project conventions before creating new files/folders

### Reading Files
- **Read before modifying** - Always read existing files before proposing changes
- Use targeted reads (specific lines) for large files to conserve context
- For files >500 lines, read sections relevant to your task

---

## Search Patterns

### Code Search Strategy
1. **Tests first**: When searching for code, check tests first to see how it's supposed to work
2. **Use code_search tool**: For complex searches across the codebase
3. **Grep with filters**: Narrow searches with file-type filters (`--include="*.<ext>"`) to reduce noise.

### Finding Usages
```bash
# Find all references to a function (substitute your file extension)
grep -r "function_name" --include="*.<ext>" <source-dir>/

# Find all imports of a module
grep -r "<import-keyword> module" --include="*.<ext>" .

# Find test coverage for a feature
grep -r "test.*feature" --include="*.<ext>" tests/
```

---

## Linter Discipline

### Immediate Feedback
- Run lint/format on a file **immediately after editing** to catch syntax errors
- Never leave a file in a broken lint state between edits
- **Passing lint = definition of done**

### Quick Lint Commands
Run your project's configured linter / formatter / type-checker on the file you just edited. Examples by ecosystem:

- **Python:** `ruff check <path>` + `ruff format <path>` + `mypy <path>`
- **Node/TypeScript:** `npm run lint -- --fix <path>` + `tsc --noEmit`
- **Go:** `go vet ./...` + `gofmt -l <path>`
- **Rust:** `cargo clippy` + `cargo fmt -- --check`

See `[APP]__PROJECT_SPECIFIC.md` for this project's exact commands.

---

## Command Safety

### Destructive Commands
- Destructive commands (`rm`, `DROP TABLE`, `git reset --hard`, etc.) require explicit user approval
- Never batch destructive operations
- Prefer `mv` to archive instead of `rm` where possible

### Safe Patterns
```bash
# Instead of deleting, archive
mkdir -p archive
mv file_to_delete.py archive/file_to_delete.py.bak

# Instead of force operations, use safer alternatives
git stash  # instead of git reset --hard
```

### Commands That Require Approval
| Command Type | Examples | Approval Required |
|--------------|----------|-------------------|
| File deletion | `rm`, `rmdir` | Always |
| Database mutations | `DROP`, `TRUNCATE`, `DELETE` | Always |
| Git destructive | `reset --hard`, `push --force` | Always |
| System packages | `apt install`, `brew install` | Always |
| Network requests | `curl -X POST/PUT/DELETE` | Context-dependent |

---

## Git Operations

### Core Rules
- **Never commit or push** without explicit user request
- Only stage changes; user handles commits/pushes/deploys
- Ask before any git commit/push operations

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
Run your project's test runner with `-v`/`--verbose` for clear output. Examples by ecosystem:

- **Python:** `pytest <path/to/test> -v` (or `poetry run pytest …` if using Poetry)
- **Node/TypeScript:** `npm test`, `vitest run <path>`, or `jest <path>`
- **Go:** `go test -v ./...`
- **Rust:** `cargo test`
- **E2E** (may take time — inform user): `npx playwright test`, `cypress run`

See `[APP]__PROJECT_SPECIFIC.md` for this project's exact test commands.

### Test Data Management
- Use deterministic test data (no random UUIDs)
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

## Quick Reference

### Always Do
- ✅ Read file before editing
- ✅ Run lint after editing
- ✅ Check test status before marking done
- ✅ Use targeted edits over full rewrites

### Never Do Without Approval
- ❌ Delete files
- ❌ Commit to git
- ❌ Push to remote
- ❌ Run database migrations on production
- ❌ Install system packages
