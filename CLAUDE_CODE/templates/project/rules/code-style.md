# Code Style — [PROJECT_NAME]

> **Location:** `.claude/rules/code-style.md`
> **Scope:** This project's coding standards

---

## Language & Framework

- **Primary language(s):** [e.g., Python 3.11, TypeScript 5.x]
- **Framework(s):** [e.g., FastAPI, React 18 with Vite]
- **Style guide:** [e.g., PEP 8 + Ruff defaults, Airbnb JS Style Guide]

## Formatting

- Line length: **[100]** characters
- Indentation: **[4 spaces / 2 spaces]**
- Quotes: **[single / double]**
- Trailing commas: **[required / not required]** in multi-line lists/objects

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Variables | [snake_case / camelCase] | `user_name` / `userName` |
| Functions | [snake_case / camelCase] | `get_user` / `getUser` |
| Classes | PascalCase | `UserService` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Files | [kebab-case / snake_case] | `user-service.ts` / `user_service.py` |
| Test files | [match source + `.test` / `_test`] | `user-service.test.ts` |

## Imports

- **Order:** standard library → third-party → local
- **Always at top of file** — never inline.
- Group with blank lines between categories.
- No wildcard imports (`from module import *`).

## Comments

- Comment the **why**, not the **what**.
- Use `# TODO(<name>):` or `// TODO(<name>):` with an owner.
- Remove TODOs once resolved — see consistency check #3.

## Error Handling

- [e.g., "Always use typed exceptions, never bare except"]
- [e.g., "Log errors with context (user_id, request_id) at the boundary"]
- [e.g., "Never swallow exceptions silently"]

## Type Annotations

- **Required** for [public functions / all functions / module exports].
- Use `Optional[T]` over `T | None` for [Python 3.9+ compatibility / consistency].
- Frontend: prefer `type` over `interface` unless extension is needed.

---

> Edit to match this project's actual conventions. Delete sections that don't apply.
