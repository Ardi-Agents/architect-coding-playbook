# Org-Level Policies

This file is always loaded across all projects. It defines the rules that apply organization-wide or across your personal machine — independent of any specific project stack.

---

## Tooling & Dependencies

- All third-party tools, libraries, and frameworks must be open source and commercially licensable (MIT, Apache 2.0, BSD, or equivalent). Do not introduce source-available, proprietary, or restrictively licensed dependencies without explicit approval.
- Before adding any new dependency, check: (1) license type, (2) last commit date, (3) whether an existing dependency already covers the need.

## Security

- Never commit secrets, API keys, tokens, or credentials to version control. Use environment variables, `.env` files (gitignored), or a secrets manager.
- Never include sensitive values in URLs, query parameters, or log output.
- Full security rules: see AGENTS.md P0 — Security & Data Integrity.

## Agent Autonomy Limits

- Never push to a remote repository without explicit user confirmation.
- Never deploy or run migration scripts on production environments.
- Never modify authentication or authorization code unless explicitly requested.
- Full autonomy rules: see `@AGENTS.md` — P0 and Tool & File Discipline sections.

## Code Quality

- All new or modified code must have tests before a task is marked complete.
- Passing lint is the definition of done — do not leave a file in a broken lint state.
- Full quality rules: see `@AGENTS.md` — P1 Correctness & Planning.

---

> This file contains examples. Edit to match your actual policies.
> The `@AGENTS.md` references above are the source of truth — this file supplements, not replaces them.
