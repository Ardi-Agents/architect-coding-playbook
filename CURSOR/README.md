# Cursor Integration

The Architect Coding Playbook works with Cursor through `AGENTS.md` (which Cursor reads natively) plus `.cursor/rules/*.mdc` for Cursor-specific scoping.

---

## Quickstart

From inside your target project:

1. **Place `AGENTS.md` at the repo root.** Cursor's agent reads it as part of the system prompt.
   ```bash
   cp /path/to/architect-coding-playbook/AGENTS.md ./AGENTS.md
   cp -R /path/to/architect-coding-playbook/AGENTS ./AGENTS
   ```

2. **Replace `[APP]__PROJECT_SPECIFIC.md` content with your project's specifics** — stack commands, test/build scripts, environment conventions.

3. **(Optional) Add path-scoped rules in `.cursor/rules/`.** Cursor uses MDC files with frontmatter for path scoping:

   ```markdown
   ---
   description: Frontend component conventions
   globs: ["frontend/**/*.tsx", "frontend/**/*.ts"]
   alwaysApply: false
   ---

   # Frontend Components

   See @AGENTS/[APP]__IMPLEMENTATION.md for the canonical implementation rules.

   ## Cursor-specific
   - When generating new components, default to colocating tests next to source.
   - Use the project's `tsconfig.json` paths; never use `../../../` style imports.
   ```

   Save as `.cursor/rules/frontend-components.mdc`.

---

## How AGENTS.md maps to Cursor

| Architect Coding Layer | Cursor Equivalent |
|---|---|
| `AGENTS.md` (kernel) | Read natively at repo root |
| `AGENTS/[APP]__*.md` appendices | Imported via `@AGENTS/[APP]__X.md` from Cursor rule files |
| Project-specific overrides | `.cursor/rules/*.mdc` with `globs` for path-scoping |
| User preferences | Cursor's User Rules (Settings → Rules) |

---

## Cursor rule types

- **Always** (`alwaysApply: true`) — loaded every session.
- **Auto-Attached** (`globs: [...]` + `alwaysApply: false`) — loaded when working in matching paths.
- **Agent Requested** (`description` only) — agent fetches when needed.
- **Manual** (no frontmatter trigger) — only when `@`-mentioned.

For the playbook: keep `AGENTS.md` and `AGENTS/` as the source of truth; use `.cursor/rules/` only for Cursor-specific scoping that doesn't belong in the kernel.

---

## Notes

- Cursor adopted `AGENTS.md` natively in late 2025. Keep your `AGENTS.md` updated; `.cursor/rules/` is for Cursor-only extensions.
- The legacy `.cursorrules` single-file format still works but is superseded by the `.cursor/rules/` directory.
- Team Rules (Cursor Team/Enterprise) take precedence over project rules — coordinate with your org's Cursor admin if you have org-wide policies.

→ Cursor's official docs: https://cursor.com/docs/context/rules
