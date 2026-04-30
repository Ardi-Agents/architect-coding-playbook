# Frontend Components — [PROJECT_NAME]

> **Location:** `.claude/rules/frontend/components.md`
> **Loaded:** When working on files under `frontend/`
> **Source of truth:** [`@AGENTS/[APP]__IMPLEMENTATION.md`](../../../AGENTS/%5BAPP%5D__IMPLEMENTATION.md)

---

## Component Discipline

- One component per file. File name matches export name.
- Co-locate component, styles, tests, and stories: `Button/{Button.tsx,Button.test.tsx,Button.stories.tsx,index.ts}`.
- Prefer composition over configuration — small components combine; avoid mega-components with 20+ props.

## Hooks

- Custom hooks live in `src/hooks/` and start with `use`.
- Never call hooks conditionally; never inside loops.
- A hook with an effect must declare every dependency it reads. Lint with `react-hooks/exhaustive-deps`.

## State

- Local component state for UI-only concerns (open/closed, hovered, draft input).
- Lifted state (parent or context) for cross-component coordination.
- Server state via the project's data layer (React Query / SWR / RTK Query) — never `useState` for fetched data.
- Avoid prop drilling beyond two levels — reach for context or a store.

## Props & Types

- Every prop typed. Optional props default in the component, not the call site.
- Discriminated unions for variant props: `type ButtonProps = { variant: 'primary' } | { variant: 'icon'; icon: IconName }`.
- No `any`. No `as` casts unless commented with the reason.

## Rendering

- Lists need stable keys — never the array index unless the list is immutable and ordered.
- Memoize only after profiling. `React.memo` / `useMemo` / `useCallback` are not free.
- Suspense boundaries at route or feature level, not per component.

## Accessibility

- Interactive elements use semantic tags (`button`, `a`, `input`) — never `<div onClick>` for clickable UI.
- Every form input has a label. Every image has `alt`. Color is never the only signal.
- Focus is visible and trappable inside modals.

---

> Edit to match this project's actual component conventions. Delete sections that don't apply.
