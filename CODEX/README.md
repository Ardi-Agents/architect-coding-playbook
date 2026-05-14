# Codex CLI Integration

OpenAI Codex CLI reads `AGENTS.md` natively. The Architect Coding Playbook is already in the right format — installation is two `cp` commands.

---

## Quickstart

From inside your target project:

```bash
cp /path/to/architect-coding-playbook/AGENTS.md ./AGENTS.md
cp -R /path/to/architect-coding-playbook/AGENTS ./AGENTS
```

Then customize:

```bash
# Replace [APP]__ with your project's prefix (e.g., MYAPP__)
cd AGENTS
for f in '[APP]__'*.md; do mv "$f" "${f//\[APP\]/MYAPP}"; done

# Edit MYAPP__PROJECT_SPECIFIC.md to describe your stack, commands, conventions
#
# REQUIRED for v0.5.0+: declare the Stack Composition table at the top of
# MYAPP__PROJECT_SPECIFIC.md. It lists which language tracks (dotnet | python
# | typescript | go | rust) are active in the repo; the agent uses it to
# decide which per-track recipes fire on which files.
```

That's it. Run `codex` and Codex will load `AGENTS.md` from the repo root.

> **Note on v0.5.0 appendices**: the `AGENTS/` directory now ships 10 appendices —
> seven existing (IMPLEMENTATION, API_DESIGN, STATIC_ANALYSIS, CHECKLISTS, TOOL_USAGE,
> DEPENDENCY_UPGRADES, PROJECT_SPECIFIC) plus three new cross-track templates
> (DESIGN_POSTURE, VERSIONING, OBSERVABILITY). All ten land via the `cp -R` above;
> no per-CLI changes needed.

---

## How AGENTS.md works in Codex CLI

- **Repo root `AGENTS.md`** — loaded for every Codex session in the repo.
- **Subdirectory `AGENTS.md`** — for monorepos, the closest ancestor wins. So `services/billing/AGENTS.md` overrides `AGENTS.md` when working in `services/billing/`.
- **No frontmatter required** — plain Markdown. Codex parses headings as structure but does not enforce any schema.
- **`@`-imports work** — Codex follows `@AGENTS/[APP]__IMPLEMENTATION.md` references.

---

## Optional: per-user preferences

Codex CLI does not have a canonical user-scope rule file (no `~/.codex/AGENTS.md` convention). For personal preferences:

- Keep them in your shell profile and reference via env vars.
- Or maintain a private `~/Code/personal-AGENTS.md` and symlink into projects when you want them loaded.

---

## Notes

- Codex CLI was an early adopter of `AGENTS.md`; the format is stable.
- The `[APP]__` prefix is the playbook's convention — not enforced by Codex itself. You can rename or drop the prefix; Codex doesn't care.
- If you also use Cursor or Claude Code on the same repo, the same `AGENTS.md` serves them all (Cursor natively, Claude Code via `ln -s AGENTS.md CLAUDE.md` or a thin `CLAUDE.md` that does `@AGENTS.md`).

→ Codex `AGENTS.md` guide: https://developers.openai.com/codex/guides/agents-md
→ Cross-tool spec: https://agents.md/
