# Appendix: Project Documentation — The Two-Tier CLAUDE.md Pattern

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: Structuring project-governance docs that agents actually read

---

## Why This Appendix Exists

Most projects have a README for humans. Few have documentation *designed to be loaded into an agent's context*. The two are different artifacts. A good README explains the project to a new hire reading top-to-bottom. An agent-facing doc (typically a `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, or the Copilot equivalent) is a **policy layer**: concise, precise, high signal-density, with *prescriptions* rather than explanations. Mixing them produces documents that are tedious for humans and low-signal for agents.

This appendix describes the **two-tier pattern**: one **root** document at the repo root that sets global conventions, and per-module documents at each significant subdirectory (`apps/web/CLAUDE.md`, `apps/lambdas/<service>/CLAUDE.md`, `packages/<pkg>/CLAUDE.md`). Kernel and appendices; macro and micro; the same modular shape the playbook uses for its own governance, applied to your codebase.

Why two tiers work: global rules (stack, testing priority, auth contract) belong in one place and stay stable; module-specific rules (this lambda's route table, this package's public API, this feature's known gotchas) belong near the code that embodies them and change with it. A single giant README fails at both — too much noise for global, too far from the code for module-specific.

---

## The Root CLAUDE.md

One file at the repo root. It is the closest analog to Farshad's `AGENTS.md` for your project. Structure:

### Opening
- **One-sentence product description** and who it's for.
- **Core promise** (what makes this different).
- **Priority list** for the project (what matters most: correctness? speed? features? onboarding?).

### Tech stack — locked decisions
Table of layer → technology → rationale. Everything below depends on these being locked; change only with explicit discussion.

### System architecture
- ASCII diagram of the main components and data flows.
- Server-vs-client split rules, if applicable.
- **State-separation rule** (e.g., "server state → TanStack Query; UI state → Redux"). This single rule prevents ~80% of state-management bugs in stacks that have more than one way to hold state.

### Monorepo structure
Tree of top-level directories with one-line descriptions. Agents use this to navigate without re-grepping.

### Feature registry (optional but powerful)
A table that maps every MVP or in-scope feature to: its module, its canonical files, its status. Updated as features are completed. Prevents "which file owns X?" and "is X done?" re-investigation.

```
| Feature                 | Module       | Frontend                 | Backend route           | Status |
|-------------------------|--------------|--------------------------|-------------------------|--------|
| Weekly calendar view    | Planner      | WeeklyCalendar.tsx       | GET /planner/week       | [x]    |
| Daily nutrition log     | Nutrition    | NutritionLog.tsx         | POST /nutrition/log     | [ ]    |
```

### Environment variables
Table of each var, where it's stored (secret manager, Vercel, AWS SSM), and which process reads it. Agents use this to reason about deployment changes without guessing.

### Error handling patterns
Pointer to `AGENTS/PRODUCTION_PATTERNS.md` + project-specific implementations (the path to `withErrorHandler`, the exported error classes, the expected response envelope).

### Common commands
A short cheat sheet of the ten commands an agent will need most (`pnpm dev`, `pnpm test`, `pnpm e2e`, `db:reset`, `db:migrate`, etc.).

### Code conventions
- File naming (PascalCase components, camelCase hooks, etc.)
- Commit message format (conventional commits)
- Branch naming (`feat/`, `fix/`, `refactor/`, `docs/`)
- PR format

### Key constraints
A bulleted list of things the agent should **never** do: "never hard delete", "every route has auth as first operation", "no secrets in code", "never use raw fetch". These are the P0s for this project.

### Definition of done / pre-submission checklist
What must be true before a task is considered complete. Tie to kernel's pre-completion checklist.

### Key references
Pointers to deep-dive docs:
- `AGENTS.md` + playbook appendices (if adopted)
- Per-module CLAUDE.md files (listed here as an index)
- External spec files, design docs, ADR directory

### Auto-update rule
Put an explicit instruction at the end:

> After any architectural change, pattern change, new file addition, or modified data flow — update the relevant CLAUDE.md file as the **last step** before marking work complete.

This single line prevents 80% of documentation decay. Agents follow it; humans follow it. Without it, CLAUDE.md rots faster than the codebase it describes.

---

## Per-Module CLAUDE.md

One per significant subdirectory. Kept short — 50–200 lines typically. If it's longer, the module is probably too big or the doc is documenting too much.

### Structure

```markdown
# <Module name> — CLAUDE.md

> Parent: [root CLAUDE.md](../../CLAUDE.md) | Scope: this module only

## What this module does
One-paragraph summary. Who calls it, what it owns, what it doesn't.

## Route / public API table
| Method | Path / function      | Purpose            |
|--------|---------------------|--------------------|
| GET    | /foo                | List foos          |
| POST   | /foo                | Create a foo       |
| PUT    | /foo/:id            | Update a foo       |

(For backend modules: HTTP routes. For packages: exported functions. For frontend: top-level components.)

## Business rules
- Rule 1 with rationale.
- Rule 2 with rationale.
- Rule 3 with rationale.

These are the rules the module enforces. Agents editing the module must not silently relax them.

## Common mistakes (anti-patterns)
- Concrete recent mistakes, paired with the right answer. Saves re-learning across sessions.

## Dependencies on other modules
- Module X (reads Y)
- Module Z (writes W)

## Testing expectations
- Unit test locations
- Integration test locations
- Known flaky areas (with bug IDs)

## Known tech debt
Short list; each pointing to the roadmap or a tracker issue.

## Auto-update rule
> Update this file when: routes change, business rules change, new common-mistakes are observed, or dependencies shift.
```

### Sizing discipline
- 50–200 lines. Longer means split the module or trim the doc.
- The route/public-API table is the most-read part; keep it accurate.
- Business rules with *why*; agents reason better from rules they understand than rules they've memorized.

---

## Feature Registry: Why It's Worth the Maintenance

A mapping from user-visible features to their owning files and status. The maintenance cost is real: every feature PR updates the table. The payoff is large:

- **Agent onboarding**: a fresh agent reads the registry and knows what exists without crawling the repo.
- **Scope checks**: a PR that touches a feature not in its registry row is a scope escape.
- **Status honesty**: the checkbox column forces someone to tick `[x]` only when the feature actually works, which means it comes up in reviews.
- **Post-MVP planning**: the registry becomes the source-of-truth for "what's done vs what's promised".

Put it in the root CLAUDE.md, not in a separate file. Visibility is everything.

---

## Environment Variable Documentation

Every secret or config var that the app reads lives in a single table (root CLAUDE.md is fine). Fields:

- **Name** — the exact env var
- **Storage** — where the truth lives (AWS Secrets Manager, Vercel env, GCP Secret Manager)
- **Read by** — which process (frontend, which lambda, worker)
- **Required / optional** — plus default if optional
- **Rotation policy** — if any

This table, combined with pattern 4 (env validation at boot) from `PRODUCTION_PATTERNS.md`, makes deployment changes traceable. Every PR that adds a secret touches the table; code review catches drift.

---

## Auto-Update Rule: Why It Works

Documentation rots silently. The rule doesn't prevent that — it *surfaces* rot by making doc updates the final step before marking a task complete.

Placement matters:
- **Root CLAUDE.md**: auto-update rule as the final section.
- **Per-module CLAUDE.md**: auto-update rule at the bottom, module-specific scope.
- **Kernel (`AGENTS.md` or equivalent)**: auto-update rule for the meta-docs themselves.

Repetition helps. Agents reading top-to-bottom see the rule three times; it's hard to miss.

---

## What Belongs Where

| Content | Root CLAUDE.md | Per-module CLAUDE.md | External doc |
|---------|---------------|----------------------|--------------|
| Tech stack, locked decisions | ✓ | | |
| Monorepo layout | ✓ | | |
| Feature registry | ✓ | | |
| Auth & security rules (P0) | ✓ | | |
| Testing priority stack | ✓ | | |
| Env var table | ✓ | | |
| Module route table | | ✓ | |
| Module business rules | | ✓ | |
| Known common mistakes | | ✓ | |
| Long prose explainers | | | ✓ (README, design docs) |
| ADRs | | | ✓ (adr/ directory) |
| Postmortems | | | ✓ (vault) |
| API contracts (per endpoint detail) | | | ✓ (OpenAPI/spec files) |

The pattern: CLAUDE.md is the *index* and the *policy*. Prose and details live in linked docs.

---

## Anti-Patterns

- **Single giant CLAUDE.md** with everything. Agents load the whole thing on every session; signal dilutes; edits become merge magnets.
- **Per-module CLAUDE.md that's just a README.** Narrative prose without rules and without the route/API table. Not agent-useful.
- **Stale feature registry**: the worst kind of wrong information, because agents trust it. Treat the registry like a test — if it drifts, fix it the same day.
- **Auto-update rule nowhere**: no prompt, no update, decay sets in within weeks.
- **CLAUDE.md imported from another project verbatim**: contains rules that don't apply here. Scrub before reuse.
- **CLAUDE.md that contradicts reality**: the doc says "we use Prisma" but the code uses Drizzle. Kernel: code is truth; doc lied. Fix the doc or the rule.

---

## Integration with Other Appendices

- `AGENTS.md` / `AGENT_HOOKS.md` — the SessionStart hook should load root CLAUDE.md and per-module docs relevant to the current task into the agent's context.
- `KNOWLEDGE_GRAPH.md` — root CLAUDE.md links to the graph and the vault.
- `SPARC_METHODOLOGY.md` — Phase 1 (Specification) references the module CLAUDE.md to ground requirements in existing rules.
- `PRODUCTION_PATTERNS.md` — root CLAUDE.md references this appendix for error handling, logging, etc., rather than restating.
- `E2E_HARNESS.md` — per-module CLAUDE.md lists testing expectations; root CLAUDE.md documents harness invocation commands.

---

## Checklist: Documentation Readiness

- [ ] Root CLAUDE.md exists, under 700 lines, refreshed in the last 90 days
- [ ] Tech stack table lists every locked decision with rationale
- [ ] Feature registry exists and every row has a status checkbox
- [ ] Env var table exists with storage location per var
- [ ] Key constraints are listed as explicit P0-style rules (never hard delete, etc.)
- [ ] Auto-update rule is the last section of root CLAUDE.md
- [ ] Every significant module has a CLAUDE.md with route/public-API table
- [ ] Module docs list business rules with *why*, not just *what*
- [ ] Common mistakes are documented at the module level as they're found
- [ ] Module docs link up to root CLAUDE.md at the top
- [ ] No single doc > 700 lines (split or prune if so)
