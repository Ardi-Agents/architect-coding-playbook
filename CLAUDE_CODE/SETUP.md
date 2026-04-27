# Architect Coding Playbook — Claude Code Setup

This is an interactive setup. When Claude Code reads this file, it runs the steps below — it does not just display them.

**To run:** open Claude Code in any directory and paste:

```
Run the architect-coding-playbook Claude Code setup:
@CLAUDE_CODE/SETUP.md
```

---

## Setup Instructions for Claude

You are setting up the Architect Coding Playbook for Claude Code. Execute these steps interactively. Do not summarize or skip steps.

**Safety rules — enforce throughout (non-negotiable):**

- **Preservation is the default.** Existing files are never overwritten automatically. If a file exists, it stays exactly as-is unless the user explicitly approves a replacement or merge.
- **Detect before acting.** Before any write, read the existing file (if any), show a unified diff of proposed changes, and present three options: `(k) keep existing` / `(m) merge — I choose which sections to add` / `(r) replace fully`. Default choice is `keep existing`.
- **No silent mutations.** Never modify content without showing it to the user first. Never touch a file the user didn't approve in this session.
- **Directories are additive.** Create directories only if they don't exist. Never delete, rename, or reorganize existing directories.
- **Warn on conflict.** If any detected file appears to have been authored by a different setup (different playbook, different framework), stop and ask: "This file looks hand-written or from another tool. Do you want to proceed? (yes/no/skip this file)".
- **Abort-safe.** At any step, `abort` ends setup cleanly without partial writes. Track every file written so a follow-up `rollback` can remove just what this setup created.

---

## Step 1: Detect Existing Setup

Run these checks silently and report a summary:

1. Does `~/.claude/CLAUDE.md` exist? If yes, read it and note which sections it has.
2. Does `~/.claude/rules/` exist? List any files inside.
3. Does `~/.claude/skills/` exist? List any skill directories.
4. Does `~/.claude/projects/` exist? List any project subdirectories.
5. In the current working directory: does `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/settings.json`, `.claude/rules/`, `.claude/skills/`, or `.claude/agents/` exist?

Report: "Found: [list what exists]. Will not touch any of these without your approval."

---

## Step 2: Onboarding Questions

Ask these one at a time. Wait for an answer before asking the next.

**Question 1 — Identity:**
> What's your name, role, and background? This goes into `~/.claude/CLAUDE.md` and `~/.claude/rules/preferences.md`.

**Question 2 — Projects:**
> What projects are you currently running on this machine? For each, give: (a) project name, (b) absolute path, (c) tech stack. Example: "ardi-paralegal — `~/CascadeProjects/ardi-paralegal` — Python/FastAPI + React + GCP".

**Question 3 — Org Policies:**
> Any organization-wide tooling or library policies? Examples: "only open source, commercially licensable tools", "always TypeScript strict mode", "no proprietary AI providers without approval". Skip if none.

**Question 4 — Direnv:**
> Are you using `direnv` to manage environment variables across projects? (y/n — if yes, we'll walk through `CLAUDE_CODE/tooling/direnv-guide.md` at the end.)

**Question 5 — Subagents:**
> Want to install the example subagents (`researcher.md`, `reviewer.md`) into each project's `.claude/agents/` directory? (y/n)

---

## Step 3: Install Global Layer (`~/.claude/`)

This is **Layer 1** — personal identity across all projects on this machine.

Build the global layer using the templates in `CLAUDE_CODE/templates/global/`:

### 3a. `~/.claude/CLAUDE.md`

- Source template: `CLAUDE_CODE/templates/global/CLAUDE.md`
- Fill in identity from Question 1.
- Show full proposed content. Ask: "Write to `~/.claude/CLAUDE.md`? (yes/no/edit)"
- Wait for explicit confirmation.

### 3b. `~/.claude/rules/`

Install all four rule files. For each, show diff against existing file (if any), ask before writing:

- `~/.claude/rules/preferences.md` (from `templates/global/rules/preferences.md`) — communication & code style
- `~/.claude/rules/workflows.md` (from `templates/global/rules/workflows.md`) — preferred workflows
- `~/.claude/rules/org-policies.md` (from `templates/global/rules/org-policies.md`) — fill in answers from Question 3
- `~/.claude/rules/consistency-checks.md` (from `templates/global/rules/consistency-checks.md`) — Brian's 10-check catalog

### 3c. `~/.claude/skills/_README.md`

- Source template: `CLAUDE_CODE/templates/global/skills/_README.md`
- Install only the README — do not auto-create example skills (user authors these organically).
- Confirm before writing.

### 3d. `~/.claude/projects/<project>/memory/`

For each project from Question 2, create the memory scaffold:

- `~/.claude/projects/<project-name>/memory/MEMORY.md` — empty index with project name as header
- `~/.claude/projects/<project-name>/memory/debugging.md` — empty file with header
- `~/.claude/projects/<project-name>/memory/conventions.md` — empty file with header

Reference: `CLAUDE_CODE/templates/global/projects/_README.md` for the pattern.
Confirm before creating each project's memory directory.

---

## Step 4: Install Project Layer (`<project>/.claude/`)

This is **Layer 2** — per-project rules shared with the team. Run this for **each project** from Question 2.

For each project, install:

### 4a. `<project>/CLAUDE.md` (or `<project>/.claude/CLAUDE.md`)

- Source template: `CLAUDE_CODE/templates/project/CLAUDE.md`
- Fill in project name, path, stack from Question 2.
- Ask the user which location they prefer (root or `.claude/`). Default: root.
- Show proposed content. Confirm before writing.

### 4b. `<project>/.claude/settings.json`

- Source template: `CLAUDE_CODE/templates/project/settings.json`
- Tighten `allow_bash` / `deny_bash` to match the project's stack commands.
- Confirm before writing.

### 4c. `<project>/.claude/rules/`

Install three rule files. Confirm each:

- `code-style.md` (from `templates/project/rules/code-style.md`)
- `testing.md` (from `templates/project/rules/testing.md`)
- `api-design.md` (from `templates/project/rules/api-design.md`) — skip if project has no API

### 4d. `<project>/.claude/skills/_README.md`

- Source template: `CLAUDE_CODE/templates/project/skills/_README.md`
- Confirm before writing.

### 4e. `<project>/.claude/agents/` (if Question 5 = yes)

Install the example subagents:

- `researcher.md` (from `templates/project/agents/researcher.md`)
- `reviewer.md` (from `templates/project/agents/reviewer.md`)

Confirm each before writing.

### 4f. AGENTS/ directory

Remind the user (don't auto-copy):

> "Copy `AGENTS/` from `architect-coding-playbook` into each project root. Replace `[APP]__PROJECT_SPECIFIC.md` with project-specific content. See main README for the canonical workflow."

---

## Step 5: Direnv (if Question 4 = yes)

Walk the user through `CLAUDE_CODE/tooling/direnv-guide.md` step by step.

---

## Step 6: Summary

Report:

1. **What was created** — list of files written and directories created.
2. **What was skipped** — files that already existed and the user chose to keep.
3. **Next steps for the user:**
   - Open each new `CLAUDE.md` and fill in any remaining `[PLACEHOLDER]` tokens.
   - Copy `AGENTS/` folder into each project (see main README).
   - Replace `AGENTS/[APP]__PROJECT_SPECIFIC.md` with project specifics.
   - Open Claude Code in each project to verify rules and skills load correctly.
   - Optionally promote project-level skills to global by copying `<project>/.claude/skills/<name>/` to `~/.claude/skills/`.
4. **Verification command** — suggest the user test the setup by asking Claude Code:
   > "What rules are loaded for this session?"

End with:
> "Setup complete. The Architect Coding Playbook now governs your Claude Code sessions across all projects."
