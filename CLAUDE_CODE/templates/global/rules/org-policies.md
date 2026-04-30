# Org-Level Policies

> **Location:** `~/.claude/rules/org-policies.md`
> **Loaded:** Every session
> **Scope:** Organization-wide rules — independent of project stack

---

## Tooling & Dependencies

- All third-party tools, libraries, and frameworks must be **open source and commercially licensable** (MIT, Apache 2.0, BSD, or equivalent). Do not introduce source-available, proprietary, or restrictively licensed dependencies without explicit approval.
- Before adding any new dependency, check: (1) license type, (2) last commit date, (3) whether an existing dependency already covers the need.
- Prefer dependencies with active maintenance (commit within last 6 months) and >1k weekly downloads (or equivalent maturity signal).

## Security

- Never commit secrets, API keys, tokens, or credentials to version control. Use environment variables, `.env` files (gitignored), or a secrets manager.
- Never include sensitive values in URLs, query parameters, or log output.
- Full security rules: see [`AGENTS.md`](https://github.com/farshadas/architect-coding-playbook/blob/main/AGENTS.md) — P0 Security & Data Integrity.

## Agent Autonomy Limits

- **Never push to a remote repository** without explicit user confirmation.
- **Never deploy** or run migration scripts on production environments.
- **Never modify authentication or authorization** code unless explicitly requested.
- **Never delete files** without confirming they are unreferenced (grep, tests).
- Full autonomy rules: see [`AGENTS.md`](https://github.com/farshadas/architect-coding-playbook/blob/main/AGENTS.md) — P0 and Tool & File Discipline sections.

## Code Quality

- All new or modified code must have tests before a task is marked complete.
- Passing lint is the definition of done — do not leave a file in a broken lint state.
- Full quality rules: see [`AGENTS.md`](https://github.com/farshadas/architect-coding-playbook/blob/main/AGENTS.md) — P1 Correctness & Planning.

## Licensing of Created Work

- This machine's projects default to **MIT license** unless otherwise specified.
- Document and credit any incorporated open-source code.

---

> Edit to match your actual organizational policies. The `AGENTS.md` references are the source of truth — this file supplements, not replaces them.
