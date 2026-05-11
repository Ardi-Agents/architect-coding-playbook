# Architect Coding Playbook

This repository is a portable starting point for building a high-discipline, agent-driven coding workflow using:

- `AGENTS.md` as the global rule kernel
- `AGENTS/` as modular appendices for implementation, API design, static analysis, tool usage, checklists, dependency upgrades, and project-specific overrides

The goal is to help teams move from generic prompting to repeatable, auditable, and safer agent behavior.

## Why This Exists

This playbook is the operational artifact of **Architect Coding** — a software 
development methodology where the engineer acts as orchestrator and AI agents 
handle all implementation.

The tooling (AGENTS.md, the AGENTS/ directory, the P0-P4 matrix) is 
intentional. Each piece encodes a specific answer to a specific failure mode 
in agentic development: slop, context rot, scope creep, and unconstrained 
autonomy.

> *You design. AI codes. Together you ship.*

→ [Read the methodology overview](./CONCEPT.md)
→ [Deep dive: AGENTS.md as a Development Operating System](./docs/AGENTS_AS_DEV_OS.md)

## What is in this repo

- `AGENTS.md`
  - The core policy layer
  - P0-P4 priority matrix and conflict resolution
  - Design-first protocol
  - Tool/file discipline and context-preservation protocol
- `AGENTS/`
  - `[APP]__IMPLEMENTATION.md`
  - `[APP]__API_DESIGN.md`
  - `[APP]__STATIC_ANALYSIS.md`
  - `[APP]__TOOL_USAGE.md`
  - `[APP]__CHECKLISTS.md`
  - `[APP]__DEPENDENCY_UPGRADES.md`
  - `[APP]__PROJECT_SPECIFIC.md` (template override; replace for your project)

## Install

This playbook installs itself. Point a coding agent at this repo and paste **one** of the prompts below — the agent does the rest, preserving anything you already have.

### One-paste install (recommended)

**Step 1.** Clone the repo:

```bash
git clone https://github.com/farshadas/architect-coding-playbook.git ~/architect-coding-playbook
cd ~/architect-coding-playbook
```

**Step 2.** Open Claude Code (or your AI CLI) **inside the clone** and paste:

```
Install the Architect Coding Playbook on this machine.

1. Read CLAUDE_CODE/SETUP.md and execute it as an interactive setup.
2. Enforce its safety rules — never overwrite existing files without showing
   me a diff and getting my explicit approval. Default to preserving what
   I already have. Backup before any merge or replace.
3. After install, run /verify-install to confirm everything matches the
   shipped manifest at CLAUDE_CODE/install.manifest.json.
4. Summarize what was created, what was skipped, and what I should verify.
```

> **Why "inside the clone"?** Claude Code's `@CLAUDE_CODE/SETUP.md` import resolves relative to your current working directory. From outside the clone, use the absolute path: `@/path/to/architect-coding-playbook/CLAUDE_CODE/SETUP.md`.

### Safety guarantees

The setup flow will:

- **Detect** any existing `~/.claude/`, `.claude/`, `AGENTS.md`, or `AGENTS/` files before writing anything.
- **Preserve by default** — if a file already exists, you get three choices: `keep existing` (default), `merge` selectively, or `replace fully`.
- **Show diffs** for every proposed write. No silent mutations.
- **Warn on foreign files** — if a detected file looks hand-written or authored by another framework, setup pauses and asks before touching it.
- **Abort-safe** at any step. Rollback removes only what this setup created.

Full safety rules live in [`CLAUDE_CODE/SETUP.md`](./CLAUDE_CODE/SETUP.md).

### Agent compatibility

`AGENTS.md` + `AGENTS/[APP]__*.md` is the cross-tool kernel; per-CLI bootstraps live in their own sibling directories with quickstarts.

| Agent | Reads | Bootstrap |
|---|---|---|
| **Claude Code** | `CLAUDE.md` (NOT `AGENTS.md` natively) | [`CLAUDE_CODE/SETUP.md`](./CLAUDE_CODE/SETUP.md) — full interactive install. Optionally: [`claude-code-plugin/`](./claude-code-plugin/README.md) for `/plugin install`. |
| **Cursor** | `AGENTS.md` natively + `.cursor/rules/*.mdc` | [`CURSOR/README.md`](./CURSOR/README.md) — `cp` quickstart. |
| **Codex CLI** | `AGENTS.md` natively | [`CODEX/README.md`](./CODEX/README.md) — two `cp` commands. |
| **Windsurf / Cline / Aider / Copilot** | `AGENTS.md` natively | Just copy `AGENTS.md` + `AGENTS/` into the repo root. |

> **Cross-tool note.** Claude Code is the lone holdout on native AGENTS.md adoption — it reads `CLAUDE.md`. The setup flow generates a thin `CLAUDE.md` that opens with `@AGENTS.md`, so the same kernel reaches Claude Code transitively. Alternatively, symlink: `ln -s AGENTS.md CLAUDE.md` (works on macOS/Linux; Windows users should prefer the import). See [agents.md](https://agents.md/) for the cross-tool standard.

### Manual path (for humans who prefer it)

If you want to install without an agent:

```bash
git clone https://github.com/farshadas/architect-coding-playbook.git ~/architect-coding-playbook
cd <your-target-project>
cp ~/architect-coding-playbook/AGENTS.md ./AGENTS.md
cp -R ~/architect-coding-playbook/AGENTS ./AGENTS

# Replace [APP]__ with your project's prefix (example uses MYAPP)
cd AGENTS && for f in '[APP]__'*.md; do mv "$f" "${f//\[APP\]/MYAPP}"; done && cd ..

# For Claude Code: bridge AGENTS.md so Claude reads it
echo '@AGENTS.md' > CLAUDE.md
# (or, if you prefer a symlink)
# ln -s AGENTS.md CLAUDE.md
```

Then edit `AGENTS/MYAPP__PROJECT_SPECIFIC.md` with your project's specifics.

For the full Claude Code setup (skills, subagents, memory, per-project `.claude/`), follow [`CLAUDE_CODE/SETUP.md`](./CLAUDE_CODE/SETUP.md) step by step.

### Verify the install

After running the agent-driven or manual install, drift-check it:

```
/verify-install
```

This re-hashes every shipped file against [`CLAUDE_CODE/install.manifest.json`](./CLAUDE_CODE/install.manifest.json) and reports `OK / drifted / missing / foreign` per file.

---

## Rollout sequence

1. Start with `AGENTS.md` + `[APP]__PROJECT_SPECIFIC.md`.
2. Add API / implementation / static-analysis appendices next.
3. Add checklist and dependency-upgrade appendices after week 1.
4. Review and tighten rules from real task outcomes.

## Maintenance model

- Treat rules like code: version, review, and iterate.
- Add post-task rule improvement proposals.
- Keep a changelog of significant behavior changes to your agent rules.

---

If this playbook helps, fork it and adapt the project-specific appendix to your stack first.
