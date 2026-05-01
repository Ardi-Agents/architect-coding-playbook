# Architect Coding Playbook — Claude Code Setup

This is an interactive, machine-checkable setup. When Claude Code reads this file, it executes the steps below — it does not just display them. The shipped contract is encoded in [`CLAUDE_CODE/install.manifest.json`](./install.manifest.json); this document is the human-readable narrative.

**To run:** open Claude Code **inside a clone of `architect-coding-playbook`** and paste:

```
Run the architect-coding-playbook Claude Code setup:
@CLAUDE_CODE/SETUP.md
```

> If you're running Claude Code from a different cwd, paste the absolute path instead, e.g. `@/Users/you/Desktop/architect-coding-playbook/CLAUDE_CODE/SETUP.md`. The `@` import is resolved relative to your current working directory.

---

## Setup Instructions for Claude

You are setting up the Architect Coding Playbook for Claude Code. Execute these steps interactively. Do not summarize or skip steps.

### Safety rules — non-negotiable

- **Preservation is the default.** Existing files are never overwritten automatically. If a file exists, it stays exactly as-is unless the user explicitly approves a replacement or merge.
- **Detect before acting.** Before any write, read the existing file (if any), show a unified diff, and present three options: `(k) keep existing` / `(m) merge — choose which sections to add` / `(r) replace fully`. Default is `keep existing`.
- **Backup-before-modify.** Any time setup modifies an existing file (replace OR merge), it first copies the original to `~/.claude/.architect-playbook-backups/<filename>.<ISO-timestamp>` and records the path in the install receipt. Pure creation (new file) does not need backup.
- **No silent mutations.** Never modify content without showing it to the user first. Never touch a file the user didn't approve in this session.
- **Directories are additive.** Create directories only if they don't exist. Never delete, rename, or reorganize existing directories.
- **Reserved tree warning.** `~/.claude/projects/<encoded-cwd>/` is Claude Code's transcript + auto-memory area. Only write to the `memory/` subdirectory — never elsewhere in `projects/`.
- **Warn on conflict.** If any detected file appears to have been authored by a different setup, stop and ask: "This file looks hand-written or from another tool. Proceed? (yes/no/skip this file)".
- **Abort-safe.** At any step, `abort` ends setup cleanly without partial writes. Track every file written so the install receipt enables a future rollback.
- **Manifest integrity.** Every write must correspond to a `shippedFiles[]` entry or a `settingsMerges[]` entry in `install.manifest.json`. If a step would write something not in the manifest, stop and ask the user.

---

## Step 1: Detect Existing Setup

Run silently and report a summary:

1. Does `~/.claude/CLAUDE.md` exist? Read it; note sections.
2. Does `~/.claude/settings.json` exist? Parse it; note any keys that overlap with the shipped settings patch.
3. Does `~/.claude/rules/` exist? List files inside.
4. Does `~/.claude/skills/` exist? List skill directories. Note any name collisions with `journal/`, `todo/`, `explain-code/`, `verify-install/`.
5. Does `~/.claude/projects/` exist? List immediate children (these are Claude Code's per-project memory + transcript dirs — DO NOT modify; only the `memory/` subdir of a chosen project gets written).
6. In the current working directory: does `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/settings.json`, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, or `AGENTS/` exist?
7. Read `~/.architect-playbook-manifest.json` if present (prior install receipt) and note version.

Report: "Found: [list what exists]. Will not touch any of these without your approval."

---

## Step 2: Onboarding Questions

Ask these one at a time. Wait for an answer before asking the next.

**Question 1 — Identity:**
> What's your name, role, and background? Goes into `~/.claude/CLAUDE.md` and `~/.claude/rules/preferences.md`.

**Question 2 — Projects:**
> What projects are you currently running on this machine? For each, give: (a) project name, (b) absolute path, (c) tech stack, (d) `[APP]__` prefix (short uppercase, e.g. `ARDI`, `MYAPP` — used to rename `[APP]__*.md` AGENTS files).

**Question 3 — Org Policies:**
> Any organization-wide tooling or library policies? Examples: "only open source, commercially licensable tools", "always TypeScript strict mode". Skip if none.

**Question 4 — Direnv:**
> Are you using `direnv` to manage env vars across projects? (y/n — if yes, we'll walk through `CLAUDE_CODE/tooling/direnv-guide.md` at the end. The shipped project `settings.json` includes a `SessionStart` hook that surfaces `$CLAUDE_PROJECT`.)

**Question 5 — Subagents:**
> Want to install the example subagents (`researcher.md`, `reviewer.md`) into each project's `.claude/agents/`? (y/n)

---

## Step 3: Install Global Layer (`~/.claude/`)

Layer 1 — personal identity across all projects on this machine. All template files referenced here are in `CLAUDE_CODE/templates/global/` and have `sha256` recorded in `install.manifest.json` under `shippedFiles[].sha256`.

### 3a. `~/.claude/CLAUDE.md`

- Source: `CLAUDE_CODE/templates/global/CLAUDE.md`. Manifest id: `global.CLAUDE`.
- Substitute tokens from Question 1 (`YOUR_NAME`, `CITY, STATE`, `YOUR_ROLE`, `COMPANY_OR_CONTEXT`, `RELEVANT INTERESTS`).
- **Graceful Q1 substitution** (handle free-form Q1 answers cleanly):
  - If Q1 didn't include an "at <company>" portion: drop the literal ` at [COMPANY_OR_CONTEXT]` segment from the Role line entirely. Result: `Role: Software Engineer` instead of an awkward `Role: Software Engineer at <empty>`.
  - If Q1 didn't supply `[CITY, STATE]` or `[RELEVANT INTERESTS]`: leave the bracketed placeholders in the file. They aren't load-bearing — the user can fill them in later or delete the lines. **Do not invent values to fill them.**
  - If Q1 did supply a clear free-form `Background:` paragraph, place it on the Background line; otherwise leave the bracketed placeholder.
- If `~/.claude/CLAUDE.md` exists: backup → show diff → ask `(k) keep / (m) merge / (r) replace`. Default `keep`.
- For `merge`: append the playbook section under a clear delimiter `<!-- architect-coding-playbook v0.4.0 -->` so a future uninstall can find and remove it.

### 3b. `~/.claude/settings.json`

- Apply the `settingsMerges[0]` entry from `install.manifest.json` (RFC 7396 JSON Merge Patch).
- The patch is:
  ```json
  {
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "includeCoAuthoredBy": false
  }
  ```
- Steps:
  1. Read existing `~/.claude/settings.json` (parse JSON; if invalid, halt and report).
  2. Compute the merge result.
  3. Backup to `~/.claude/.architect-playbook-backups/settings.json.<ISO-timestamp>`.
  4. Show unified diff. Confirm.
  5. Write merged content.
  6. Record in install receipt: `addedKeys`, `backupPath`.

### 3c. `~/.claude/rules/`

Install all four rule files (manifest ids `global.rules.preferences`, `workflows`, `org-policies`, `consistency-checks`). For each: detect → diff → confirm → write.

**Q3 substitution into `org-policies.md`:** The template has a `<!-- BEGIN Q3_ORG_POLICIES -->` … `<!-- END Q3_ORG_POLICIES -->` block at the bottom. If Q3 was answered:
1. Parse the answer into one bullet per distinct policy (e.g., "open source only" → `- All third-party tools must be open source and commercially licensable.`).
2. Replace the placeholder bullet (`- _(none — Q3 answer not provided)_`) with the parsed bullets.
3. Leave the `<!-- BEGIN/END Q3_ORG_POLICIES -->` markers in place so a future re-run can find and update them idempotently.

If Q3 was skipped, leave the placeholder bullet untouched. The file's shipped sha is for the placeholder state; any Q3 substitution intentionally drifts the file (record `userModified: true` with reason `"Q3 substitution"` in the receipt).

### 3d. `~/.claude/skills/`

Install:

- `_README.md` (id `global.skills.README`)
- `journal/SKILL.md` (id `global.skills.journal`)
- `todo/SKILL.md` (id `global.skills.todo`)
- `explain-code/SKILL.md` (id `global.skills.explain-code`)
- `verify-install/SKILL.md` (id `global.skills.verify-install`)

Confirm each before writing. Skill directories auto-discover; no settings entry needed.

### 3e. `~/.claude/projects/<encoded-cwd>/memory/`

For each project from Question 2:

1. Compute the **encoded-cwd**: take the project's absolute path and replace every non-alphanumeric character with `-`. Example: `/Users/you/dev/myapp` → `-Users-you-dev-myapp`.
2. Confirm the encoded path with the user.
3. Create `~/.claude/projects/<encoded-cwd>/memory/{MEMORY.md,debugging.md,conventions.md}` if absent.
4. Each file gets only a header line; populate organically over time.
5. **Do not write outside the `memory/` subdir.** The parent `<encoded-cwd>/` belongs to Claude Code's transcript storage.

---

## Step 4: Install Project Layer (`<project>/.claude/`)

Layer 2 — per-project rules shared with the team. Run for **each project** from Question 2.

### 4a. `<project>/CLAUDE.md`

- Source: `CLAUDE_CODE/templates/project/CLAUDE.md`. Manifest id: `project.CLAUDE`.
- Substitute Question 2 tokens (`PROJECT_NAME`, `PATH_TO_REPO`, `APP`, stack commands).
- **Substitute Q2(c) stack answer** into the `Stack:` line: replace the `[e.g., "Python/FastAPI + React/TypeScript + PostgreSQL + GCP Cloud Run"]` placeholder with the user's actual stack from Q2(c). If Q2(c) is empty, leave the placeholder.
- **First import line** must be `@AGENTS.md` so Claude Code transitively loads the kernel (Claude Code does not read AGENTS.md natively — this import bridges the gap).
- Ask the user: root or `.claude/CLAUDE.md`? Default: root.
- If file exists: backup → diff → confirm.

### 4b. `<project>/.claude/settings.json`

- Source: `CLAUDE_CODE/templates/project/settings.json`. Manifest id: `project.settings`.
- This is the **real Claude Code schema**: top-level `permissions.{allow,deny,ask,defaultMode}` flat arrays of `"Tool(args:*)"` strings, `hooks`, `includeCoAuthoredBy`. Do not invent keys.
- The shipped allow list is intentionally **broad** (covers npm/pnpm/yarn/pytest/ruff/mypy/go/cargo) so most stacks work verbatim. Tightening is **optional**; if you tighten, mark `project.settings.userModified: true` in the receipt with reason `"stack-tighten"` so `/verify-install` reports the drift as expected.
- Confirm before writing.

### 4c. `<project>/.claude/rules/`

Install (each with detect/diff/confirm). **Token substitution: substitute BOTH `[APP]` AND its URL-encoded form `%5BAPP%5D` to `<USER_PREFIX>` (the URL-encoded form appears inside markdown link targets like `[label](../../AGENTS/%5BAPP%5D__X.md)` — without substituting both, half the links break).** Also substitute `[PROJECT_NAME]` to the project name.

**Stack-derived defaults (when manifest entry has `$STACK_DEFAULTS_FROM_Q2C: true`).** Parse Q2(c) stack answer; if it matches a known family, fill the bracketed choice-placeholders in `code-style.md` and `testing.md` with sensible defaults. Detection is keyword-based (case-insensitive substring match):

| Q2(c) keyword | Stack family |
|---|---|
| `node`, `typescript`, `javascript`, `react`, `vue`, `next`, `express`, `nest` | **node-ts** |
| `python`, `fastapi`, `django`, `flask`, `pyramid` | **python** |
| `go`, `golang` | **go** |
| `rust`, `cargo`, `actix`, `rocket` | **rust** |

Stack-defaults table (apply only those matching the detected family; if multiple match, prefer the most-mentioned; if none match, leave brackets):

| code-style.md placeholder | node-ts | python | go | rust |
|---|---|---|---|---|
| `[e.g., Python 3.11, TypeScript 5.x]` (Primary language) | `TypeScript 5.x` | `Python 3.12` | `Go 1.22` | `Rust 1.78` |
| `[e.g., FastAPI, React 18 with Vite]` (Framework) | `<derive from Q2(c) — e.g., "React 18 + Vite" if "React" matches>` | `<derive from Q2(c)>` | `<derive>` | `<derive>` |
| `[e.g., PEP 8 + Ruff defaults, Airbnb JS Style Guide]` (Style guide) | `ESLint + Prettier defaults` | `PEP 8 + Ruff defaults` | `gofmt + go vet` | `rustfmt + clippy` |
| `[100]` (Line length) | `100` | `100` | `120` | `100` |
| `[4 spaces / 2 spaces]` (Indentation) | `2 spaces` | `4 spaces` | `tabs` | `4 spaces` |
| `[single / double]` (Quotes) | `single` | `double` | `(N/A — Go uses double for strings)` | `double` |
| `[required / not required]` (Trailing commas) | `required` | `required` | `(N/A)` | `required` |
| `[snake_case / camelCase]` Variables | `camelCase` | `snake_case` | `camelCase` (exported) / `lowercase` | `snake_case` |
| `[snake_case / camelCase]` Functions | `camelCase` | `snake_case` | `camelCase` (exported) | `snake_case` |
| `[kebab-case / snake_case]` Files | `kebab-case` | `snake_case` | `snake_case` | `snake_case` |
| `[match source + .test / _test]` Test files | `match source + .test` | `test_<module>` | `_test.go suffix` | `tests/<module>.rs` |

| testing.md placeholder | node-ts | python | go | rust |
|---|---|---|---|---|
| `[pytest / unittest / jest]` (Backend test framework) | `vitest` (or `jest`) | `pytest` | `go test` (built-in) | `cargo test` (built-in) |
| `[vitest / jest / playwright]` (Frontend test framework) | `vitest` | `(if applicable)` | `(N/A — frontend?)` | `(N/A)` |
| `[playwright / cypress]` (E2E) | `playwright` | `playwright` (Python bindings) | `playwright` | `playwright` |
| `[YOUR_BACKEND_TEST_CMD]` | `npm test` | `pytest tests/` | `go test ./...` | `cargo test` |
| `[YOUR_FRONTEND_TEST_CMD]` | `npm test` (or `vitest run`) | `(N/A or `vitest run`)` | `(N/A)` | `(N/A)` |
| `[YOUR_E2E_TEST_CMD]` | `npx playwright test` | `pytest tests/e2e/` | `go test ./e2e/...` | `cargo test --test e2e` |
| `[YOUR_COVERAGE_CMD]` | `vitest run --coverage` | `pytest --cov` | `go test -cover ./...` | `cargo tarpaulin` |

**`api-design.md`:** the API style placeholders (`[REST / GraphQL / gRPC]`, `[JSON / Protocol Buffers]`, `[URI versioning /v1/ ...]`, `[OAuth 2.0 / JWT / Session cookies / API key]`) are architecture-decision placeholders — leave them as-is; the user fills them in based on actual project decisions.

If Q2(c) doesn't match any known family, install templates as-is with all bracketed placeholders intact and document this in the receipt: `userModifiedReason: "no stack family detected; placeholders preserved"`.

Files to install (each with detect/diff/confirm):

- `code-style.md` (id `project.rules.code-style`)
- `testing.md` (id `project.rules.testing`)
- `api-design.md` (id `project.rules.api-design`) — skip if project has no API.
- `frontend/components.md` (id `project.rules.frontend.components`) — skip if no `frontend/` dir.
- `backend/services.md` (id `project.rules.backend.services`) — skip if no `backend/` dir.

The path-scoped rules are referenced in `<project>/CLAUDE.md` via `@.claude/rules/frontend/components.md` etc.; install only the ones that match the project's structure.

### 4d. `<project>/.claude/skills/_README.md`

Manifest id: `project.skills.README`. Confirm before writing. Project-level skills are added by the user organically.

### 4e. `<project>/.claude/agents/` (if Question 5 = yes)

- `researcher.md` (id `project.agents.researcher`)
- `reviewer.md` (id `project.agents.reviewer`)

These have proper YAML frontmatter (`name`, `description`, `tools`, `model: inherit`) — required for Claude Code to recognize them as subagents.

### 4f. Auto-copy AGENTS kernel + appendices

This step actively copies — do **not** delegate to the user. It writes TWO things:

**(i) The kernel file `AGENTS.md` at project root.** Per `manifest.agentsCopy.kernelFile`:
- Source: `<playbook>/AGENTS.md`
- Dest: `<project>/AGENTS.md`
- **Substitute `[APP]` → `<USER_PREFIX>` in content** (both plain and URL-encoded `%5BAPP%5D` forms). The kernel contains markdown cross-links to the appendices like `[AGENTS/[APP]__IMPLEMENTATION.md](AGENTS/[APP]__IMPLEMENTATION.md)`; these resolve to a real file only after `[APP]` is substituted to the user's chosen prefix.
- This is what the project `CLAUDE.md`'s first-line `@AGENTS.md` import resolves to. **Skipping this step breaks the bridge** — `@AGENTS.md` would point at a missing file and the kernel would never load.
- If `<project>/AGENTS.md` already exists, diff and ask `(k)/(m)/(r)`.

**(ii) The appendices under `<project>/AGENTS/`.** Per `manifest.agentsCopy.appendicesDir`:

1. Check if `<project>/AGENTS/` exists. If yes, for each shipped file diff against the playbook source and ask `(k)/(m)/(r)`.
2. Use the `[APP]__` prefix from Question 2 (e.g. `MYAPP`).
3. For each file in `manifest.agentsCopy.appendicesDir.files`:
   - Source: `<playbook>/AGENTS/<file>`
   - Dest: `<project>/AGENTS/<file_with_[APP]_replaced>`
   - Substitute every `[APP]` → `<USER_PREFIX>` in **filename and content**.
4. **After substitution**, prepend a TODO banner to `<USER_PREFIX>__PROJECT_SPECIFIC.md` (verbatim — do **not** run the banner through `[APP]` substitution; the banner contains a literal upstream-template link with `[APP]` that must remain unchanged):
   ```markdown
   > TODO: Replace this template with project-specific content. See [`AGENTS/[APP]__PROJECT_SPECIFIC.md`](https://github.com/farshadas/architect-coding-playbook/blob/main/AGENTS/%5BAPP%5D__PROJECT_SPECIFIC.md) for the original template.
   ```
5. Confirm each write.

**Verify after copy:** `<project>/AGENTS.md` exists at project root AND `<project>/AGENTS/<USER_PREFIX>__*.md` files exist with all `[APP]` tokens substituted. The first-line `@AGENTS.md` import in `<project>/CLAUDE.md` must resolve to a real file.

### 4g. Bridge AGENTS.md ↔ Claude Code

Claude Code does **not** read `AGENTS.md` natively. Two bridge options — ask the user which:

- **Option A (default):** `<project>/CLAUDE.md` (already written in 4a) imports `@AGENTS.md` as its first line. ✅ Cross-platform, no symlink magic.
- **Option B:** `ln -s AGENTS.md CLAUDE.md`. ✅ One file, but breaks on Windows and confuses some editors.

If 4a already wrote `CLAUDE.md` with the `@AGENTS.md` import (Option A), you're done. If the user prefers Option B, remove `<project>/CLAUDE.md` and create the symlink.

---

## Step 5: Direnv (if Question 4 = yes)

Walk the user through `CLAUDE_CODE/tooling/direnv-guide.md` step by step. Confirm `CLAUDE_PROJECT` consumer hook is enabled in the project `settings.json` (4b).

---

## Step 6: Write Install Receipt

Write `~/.architect-playbook-manifest.json` (at **HOME root**, NOT inside `~/.claude/`) recording everything this run did:

```json
{
  "schemaVersion": 1,
  "tool": "architect-coding-playbook",
  "toolVersion": "0.4.0",
  "installedAt": "<ISO timestamp>",
  "scope": "user+project",
  "writes": [
    {
      "manifestId": "global.CLAUDE",
      "path": "/Users/you/.claude/CLAUDE.md",
      "action": "created" /* or "merged" or "replaced" */,
      "shippedSha256": "<hex>",
      "userModified": false,
      "preMergeBackupPath": null /* or "~/.claude/.architect-playbook-backups/CLAUDE.md.2026-04-30T12-00-00Z" */
    }
    /* ...one entry per file written, plus settingsMerges entries with addedKeys */
  ],
  "uninstall": {
    "removePaths": ["..."],
    "revertMerges": [{"path": "...", "removeKeys": [...]}]
  }
}
```

This receipt enables a future `/uninstall-architect` skill to roll back cleanly. Each entry must reference a `manifestId` from `install.manifest.json` for traceability.

---

## Step 7: Summary

Report:

1. **Files created** — paths, by section.
2. **Files merged** — paths, with backup paths, with the keys/sections added.
3. **Files skipped** — files the user chose to keep.
4. **AGENTS/ copied** — count, the chosen `[APP]__` prefix.
5. **Memory dirs created** — encoded paths.
6. **Verify command:** suggest the user test the setup with `/verify-install` (the global skill installed in Step 3d). It re-hashes everything against `install.manifest.json` and reports drift.
7. **Next steps:**
   - Open each new `CLAUDE.md` and fill remaining `[PLACEHOLDER]` tokens.
   - Replace `<USER_PREFIX>__PROJECT_SPECIFIC.md` content per project.
   - Open Claude Code in each project to verify rules and skills load (use `/verify-install`).

End with:
> "Setup complete. The Architect Coding Playbook now governs your Claude Code sessions across all projects. Run `/verify-install` any time to drift-check."
