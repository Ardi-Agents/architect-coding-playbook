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

**Safety rules — enforce throughout:**
- Never overwrite an existing file without showing the full proposed content and getting explicit confirmation.
- If a file already exists, read it first, show a diff of what would change, and ask: "Keep existing, merge, or replace?"
- Create directories only if they don't already exist.

---

### Step 1: Check existing setup

Run these checks silently and report a summary:

1. Does `~/.claude/CLAUDE.md` exist? If yes, read it and note what sections it has.
2. Does `.claude/CLAUDE.md` exist in the current directory? If yes, read it.
3. Does `~/.claude/rules/` exist? List any files.
4. Does `.claude/rules/` exist in the current directory? List any files.

Report: "Found: [list what exists]. Will not touch any of these without your approval."

---

### Step 2: Ask onboarding questions

Ask these one at a time. Wait for an answer before asking the next.

**Question 1:** What's your name, role, and background? (This goes into the global `CLAUDE.md` identity section.)

**Question 2:** What projects are you currently running on this machine? For each, what's the tech stack? (e.g., "Project A — Python/FastAPI + React; Project B — Node.js/Express")

**Question 3:** Any org-wide tool or library policies that should apply across all your projects? Examples: "only open source, commercially licensable tools", "always use TypeScript strict mode", "no proprietary AI providers without approval". Skip if none.

**Question 4:** Are you using direnv to manage environment variables across projects? (y/n — if yes, we'll walk through `CLAUDE_CODE/tooling/direnv-guide.md` at the end.)

---

### Step 3: Generate global `~/.claude/CLAUDE.md`

Using the answers from Step 2, fill in `CLAUDE_CODE/templates/global-CLAUDE.md` with the user's details.

Show the complete proposed file content. Say: "This is what I'll write to `~/.claude/CLAUDE.md`. Confirm to write, or tell me what to change."

Wait for explicit confirmation before writing.

---

### Step 4: Generate per-project `.claude/CLAUDE.md`

For each project mentioned in Question 2:

1. Fill in `CLAUDE_CODE/templates/project-CLAUDE.md` with the project name and stack.
2. Show the proposed content. Say: "This is what I'll write to `<project-path>/.claude/CLAUDE.md`. Confirm to write, or tell me what to change."
3. Wait for confirmation before writing.
4. Create `<project-path>/.claude/rules/` if it doesn't exist.

---

### Step 5: Direnv (if applicable)

If the user said yes in Question 4, walk them through `CLAUDE_CODE/tooling/direnv-guide.md` step by step.

---

### Step 6: Summary

Report what was created, what was skipped, and what the user should do next:
- Open each new `CLAUDE.md` and fill in any remaining `[PLACEHOLDER]` tokens
- Copy `AGENTS/` folder into each project (see main README for instructions)
- Replace `AGENTS/[APP]__PROJECT_SPECIFIC.md` with project-specific content
