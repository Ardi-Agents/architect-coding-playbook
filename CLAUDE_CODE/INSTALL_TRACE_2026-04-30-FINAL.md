# Install Trace — Architect Coding Playbook

Date: 2026-04-30
Sandbox HOME: `/tmp/acp-final-test/home/`
Sandbox project: `/tmp/acp-final-test/project/`
Playbook clone: `/Users/gio/Desktop/architect-coding-playbook` (read-only — never modified)

## Step 1 — Detect existing setup

- `~/.claude/CLAUDE.md`: absent
- `~/.claude/settings.json`: absent
- `~/.claude/rules/`: absent
- `~/.claude/skills/`: absent
- `~/.claude/projects/`: absent
- `<project>/CLAUDE.md`, `.claude/`, `AGENTS/`: absent
- `~/.architect-playbook-manifest.json`: absent

Reported: "Found: nothing. Will not touch any of these without your approval."

## Step 2 — Onboarding answers (canned)

- Q1 Identity: "Test User, Software Engineer, fresh-install validation harness"
- Q2 Projects: ONE project — `finaltest`, `/tmp/acp-final-test/project`, "Node.js + TypeScript + React", `[APP]__` prefix `FINALTEST`
- Q3 Org policies: TS strict; MIT/Apache/BSD only; PRs required for main
- Q4 Direnv: yes
- Q5 Subagents: yes

## Step 3a — `~/.claude/CLAUDE.md` (pure creation)

Wrote with Q1 substitution:
- `[YOUR_NAME]` → `Test User`
- `[YOUR_ROLE]` → `Software Engineer`
- `[COMPANY_OR_CONTEXT]` → `fresh-install validation harness`
- Background sentence written from Q1.
- `[CITY, STATE]` and `[RELEVANT INTERESTS]` left as placeholders (not provided).

## Step 3b — `~/.claude/settings.json` (RFC 7396 merge)

Initial state: empty. Patch:
```
{ "$schema": "...", "includeCoAuthoredBy": false }
```
Result is the patch itself. addedKeys: `$schema`, `includeCoAuthoredBy`. No backup needed (pure creation).

## Step 3c — `~/.claude/rules/` (4 files)

- `preferences.md`: copied verbatim
- `workflows.md`: copied verbatim
- `consistency-checks.md`: copied verbatim
- `org-policies.md`: copied; then Q3 substitution — replaced the placeholder bullet
  `- _(none — Q3 answer not provided)_`
  with three parsed bullets between the `<!-- BEGIN/END Q3_ORG_POLICIES -->` markers (markers preserved). `userModified: true, reason: "Q3 substitution"`.

## Step 3d — `~/.claude/skills/` (5 entries)

- `_README.md`
- `journal/SKILL.md`
- `todo/SKILL.md`
- `explain-code/SKILL.md`
- `verify-install/SKILL.md`

All copied verbatim.

## Step 3e — Per-project memory

Encoded cwd for `/tmp/acp-final-test/project` → `-tmp-acp-final-test-project`.
Created `~/.claude/projects/-tmp-acp-final-test-project/memory/` with three files (header line only):
- `MEMORY.md` (`# Memory Index — finaltest`)
- `debugging.md` (`# Debugging Patterns — finaltest`)
- `conventions.md` (`# Project Conventions — finaltest`)

## Step 4a — `<project>/CLAUDE.md`

Wrote root-level CLAUDE.md. **First line: `@AGENTS.md`**. Substitutions:
- `[PROJECT_NAME]` → `finaltest`
- `[PATH_TO_REPO]` → `/tmp/acp-final-test/project`
- Stack → `Node.js + TypeScript + React`
- `YOUR_*_COMMAND` → `npm run dev/test/lint/build`
- Six `@AGENTS/[APP]__*.md` references → `@AGENTS/FINALTEST__*.md`
- Path-scoped imports `frontend/components.md` and `backend/services.md` left **commented** (no matching dirs).

## Step 4b — `<project>/.claude/settings.json`

Verbatim copy of the template. SessionStart hook for `$CLAUDE_PROJECT` preserved.

## Step 4c — `<project>/.claude/rules/`

Wrote three; skipped two:
- `code-style.md` — substituted `[PROJECT_NAME]` → `finaltest`
- `testing.md` — substituted `[PROJECT_NAME]` and `[APP]`
- `api-design.md` — substituted `[PROJECT_NAME]` and `[APP]` (Node implies API)
- `frontend/components.md` — SKIPPED (no `frontend/` dir)
- `backend/services.md` — SKIPPED (no `backend/` dir)

## Step 4d — `<project>/.claude/skills/_README.md`

Verbatim.

## Step 4e — `<project>/.claude/agents/`

Q5=yes → wrote `researcher.md` and `reviewer.md` verbatim with YAML frontmatter intact (`name`, `description`, `tools`, `model: inherit`).

## Step 4f — AGENTS kernel + appendices (CRITICAL)

(i) Kernel: copied `<playbook>/AGENTS.md` → `<project>/AGENTS.md` **with NO substitution**.
    Verified: `[APP]` literal still appears 11 times in the kernel (intentional — kernel is generic).

(ii) Appendices: 7 files copied with `[APP]` → `FINALTEST` in BOTH filename and content:
  - `FINALTEST__IMPLEMENTATION.md`
  - `FINALTEST__API_DESIGN.md`
  - `FINALTEST__STATIC_ANALYSIS.md`
  - `FINALTEST__CHECKLISTS.md`
  - `FINALTEST__TOOL_USAGE.md`
  - `FINALTEST__DEPENDENCY_UPGRADES.md`
  - `FINALTEST__PROJECT_SPECIFIC.md`

Then prepended TODO banner verbatim (with `[APP]` literals UNCHANGED) to
`FINALTEST__PROJECT_SPECIFIC.md`. Banner not run through substitution — the
upstream-template link must keep `[APP]` for it to point at the canonical
template on GitHub.

Bridge verified: project CLAUDE.md's first line `@AGENTS.md` resolves to the
real `<project>/AGENTS.md`.

## Step 4g — Bridge

Option A taken (default). 4a's `@AGENTS.md` import IS the bridge. No symlink needed.

## Step 5 — Direnv

Q4=yes. Sandboxed environment, so the user-walkthrough of
`CLAUDE_CODE/tooling/direnv-guide.md` is deferred. Documented in receipt:
the **consumer** side (the project `settings.json` SessionStart hook that
echoes `$CLAUDE_PROJECT`) is already in place. On a real machine the user
would create an `.envrc` per the guide and `direnv allow`.

## Step 6 — Install receipt

Wrote `/tmp/acp-final-test/home/.architect-playbook-manifest.json`
(at HOME root, NOT inside `.claude/`). Captured: every write, manifestIds,
`userModified` reasons (Q1 sub on global CLAUDE.md, Q3 sub on org-policies.md,
Q2 token subs on project files), addedKeys for the settings merge,
direnv answer, and a clean `uninstall.removePaths` list for rollback.

## Step 7 — Summary printed in chat (counts only).

## Verifications run at end

- `<project>/AGENTS.md` exists and still contains `[APP]` (kernel preserves it).
- `<project>/AGENTS/FINALTEST__*.md`: 7 files, all with `[APP]` → `FINALTEST`
  in content **except** the TODO banner in `FINALTEST__PROJECT_SPECIFIC.md`.
- Project `CLAUDE.md` line 1 is `@AGENTS.md`.
- Project `CLAUDE.md` references `FINALTEST__*.md` everywhere.
- No writes outside `/tmp/acp-final-test/`.
