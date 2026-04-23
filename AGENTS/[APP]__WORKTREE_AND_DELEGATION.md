# Appendix: Worktrees and Delegation — Isolated Agent Spaces

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.0 | **Updated**: 2026-04-23
> **Scope**: How a lead agent splits work across isolated spaces and merges the result

---

## Why This Appendix Exists

`[APP]__META_ORCHESTRATION.md` describes *what shape* a swarm takes. This appendix describes *where each agent lives* — the concrete mechanics of giving each agent its own filesystem, its own branch, its own context, so two agents never overwrite each other's edits. It also describes the inverse: how a meta-agent (lead) integrates work from isolated spaces back into a single coherent change.

Most multi-agent disasters are avoidable with one rule: **every file has exactly one owner at any given moment**. Enforcing that rule by policy is fragile; enforcing it by *topology* — each agent working in its own git worktree, with its own branch, and an explicit merge step run by the lead — is durable. This is the pattern this appendix describes.

The delegation framing extends this: the same one-owner rule applies to *tasks*, not just files. Two agents running on the same task produce confusion even if they never touch a shared file. Structured delegation — with explicit hand-offs and clearly scoped responsibilities — is how you scale past two or three agents without incidents.

---

## Two Delegation Mechanisms

Most runtimes expose two distinct ways to split work. Pick deliberately.

### Subagents (single session, Task tool)
- Run **inside** the current session. Results stream back to the caller.
- Hub-and-spoke topology: subagents can't message each other — only through the caller.
- Lower token cost — a summarized result flows back, not the entire intermediate context.
- Ideal for: read-heavy exploration, independent research, short implementations whose output the caller will immediately integrate.

### Agent teams (multi-session, independent context windows)
- Each teammate is a **full** agent instance with its own context window.
- Teammates can message each other directly and (in mature setups) share a task list.
- One agent is the Team Lead; teammates self-coordinate on delegated items.
- 3–5× the token cost of a single session.
- Ideal for: work that genuinely needs distributed progress over time — parallel implementation in separate code areas, long-running research where the lead benefits from concurrent partial results.

**Default to subagents.** Agent teams are worth the cost only when teammates *genuinely* need to communicate, challenge each other, or work in parallel for long enough that a single hub-and-spoke back-channel would bottleneck them.

---

## Task Decomposition Decision Tree

```
Is the task trivial (< 5 lines, one file, obvious)?
  YES → Do it directly. No delegation.
  NO ↓

Is it focused (1–3 files, one domain)?
  YES → Single subagent, or do it yourself.
  NO ↓

Are subtasks independent, with no shared files?
  YES → Parallel subagents (multiple Task calls in ONE message).
  NO ↓

Do subtasks need cross-agent discussion or debate?
  YES → Agent team with delegate/mesh mode.
  NO → Sequential subagents with explicit dependency chain.
```

**Rule of thumb**: the default answer is "don't split". Split when parallelism is genuine, when independent verification matters, or when contexts would collide.

---

## File Ownership Strategies

Every file has exactly one owner. Pick one of three strategies:

### Layer-based
- Agent A owns `src/components/*`
- Agent B owns `src/api/*`
- Agent C owns `src/db/*`

Clear ownership lines along architectural boundaries. Works when the work decomposes naturally by layer. Watch for layer-crossing changes that need careful sequencing.

### Feature-based
- Agent A owns all files for feature X
- Agent B owns all files for feature Y

Good for independent features. Struggles when features touch shared infrastructure (auth, logging, shared types).

### Phase-based
- Agent A writes; Agent B reviews; Agent C tests.
- Sequential, never concurrent — the second agent starts after the first commits.

Necessary when two agents must touch the same files: they cannot do so at the same time. Sequence them.

**Mixing strategies is fine.** A typical non-trivial task has layer-based owners for the core split and phase-based sequencing for the review stage.

---

## Worktree Isolation

Git worktrees give each agent its own working directory **and** its own branch, sharing the same `.git` database. This is the mechanical enforcement of the one-owner rule.

### Shape

```
repo/
├── .git/                 (shared database)
├── worktree-main/        (you — never run agents here)
├── worktree-frontend/    (agent A — branch: agent/frontend)
├── worktree-backend/     (agent B — branch: agent/backend)
└── worktree-db/          (agent C — branch: agent/db)
```

### Creation

```bash
git worktree add ../worktree-frontend -b agent/frontend main
git worktree add ../worktree-backend  -b agent/backend  main
git worktree add ../worktree-db       -b agent/db       main
```

Each worktree starts from the same base commit (`main`) and evolves independently.

### Rules
- **Each agent runs in its own worktree.** No exceptions. An agent editing the shared checkout is a silent-overwrite incident waiting to happen.
- **Each worktree tracks its own branch.** Never share branches across worktrees; that defeats isolation.
- **Base from a current commit.** Pull `main` before creating worktrees so agents don't diverge on stale code.
- **Commit before the worktree is removed.** Uncommitted work in a deleted worktree is unrecoverable.
- **Worktree cleanup is a mergehook.** Remove worktrees only after their branches have been merged or their work has been explicitly abandoned.

### Common failure modes
| Failure | Cause | Prevention |
|---------|-------|------------|
| Silent overwrite | Two agents in the same directory | One worktree per agent, enforced by the dispatcher |
| Stale base | Worktree created from old local `main` | Always `git pull` before creating |
| Lost work | Worktree deleted before commit | Commit at session end; never force-remove a worktree with uncommitted changes |
| Branch collision | Two agents on the same branch | One branch per worktree; dispatcher picks names |
| Lock-file conflicts | Agents modifying the same lock file in different worktrees | Serialize dependency changes through one designated agent |

---

## Meta-Agent Merging

Isolation is only half the pattern. After each worktree produces a branch, a **meta-agent** (the lead) integrates them back into a single deliverable.

### Merge plan

1. **Intake**: for each agent's branch, read the diff and the agent's Session Report.
2. **Scope check**: confirm each branch touched only the files it owned. A branch that leaked outside its ownership line is rejected back to its agent with a scope-violation note.
3. **Sequence**: order merges by dependency — schema/types first, then services that depend on them, then UI that depends on services.
4. **Merge**: standard git merge (fast-forward when possible; `--no-ff` when you want a merge commit to preserve the branch's identity).
5. **Conflict resolution**: if two branches conflict despite the one-owner rule, either (a) the ownership lines were drawn wrong and you re-delegate after fixing them, or (b) one of the agents leaked — go back to step 2. Do not resolve conflicts by hand-editing unrelated files.
6. **Integration test**: run the full E2E harness after all branches merge. Individual branch tests can pass while the merged whole fails.
7. **Single clean commit (optional)**: if the branch-by-branch history is noise, squash on merge. Preserve the original branches for audit if useful.

### Meta-agent responsibilities
- Does **not** write feature code. Its value is in adjudication and integration.
- Keeps an audit trail: "agent A delivered X; I accepted with note Y" is forever useful when the same decomposition recurs.
- Escalates to the user only on scope violations, merge conflicts the one-owner rule didn't catch, or integration-test failures that point back to a specific agent.

### Anti-patterns
- **Merging in arbitrary order**: a dependent branch merges before the branch it depends on; the tree compiles but doesn't work. Plan the order.
- **Hand-resolving conflicts that shouldn't exist**: if the one-owner rule was followed, there should be no conflicts. A conflict is a signal, not just an inconvenience.
- **Squashing without audit trail**: losing the branch-by-branch history hides which agent delivered which piece. Tag the merge with the contributing branches.
- **Meta-agent that also codes**: role confusion. Either you're leading or you're building. Not both on the same task.

---

## Hand-off Protocol

When work moves from one agent to another (phase-based delegation, or lead → worker → lead), a clean hand-off protocol prevents context loss.

### Inbound package (what the receiver gets)
- The task brief (what to do)
- Scope boundaries (what files / areas are yours; what is off-limits)
- Success criteria (how you'll know you're done)
- Any prior-art links (existing functions, utilities, patterns to reuse)
- Expected output format (branch name, deliverable artifact, report shape)

### Outbound package (what the sender receives back)
- A short Session Report (what was done, decisions made, open questions)
- The branch name and commit hash of the delivery
- Tests run and their outcomes
- Any scope lines that got close to violation (surface this before the merge step does)

Hand-offs that feel excessive for a 15-minute task probably are. Hand-offs that feel excessive for a 2-hour task are usually the right amount.

---

## When Worktree Isolation Isn't Worth It

The pattern has cost: worktree creation takes seconds, each agent's environment (node_modules, virtualenv) may need its own warm-up, and the meta-agent merge step adds end-to-end latency.

Skip worktree isolation when:
- You're running a single subagent and it will finish in minutes.
- The task is read-heavy (research, exploration) — worktrees are for agents that write.
- The agent is assisting you (pair-style), not running autonomously.

Use worktree isolation when:
- Two or more agents are writing code at the same time.
- A task has been decomposed into independent work packages with clear ownership.
- The project has a history of silent-overwrite incidents.
- You're running a long-lived agent team (multi-hour).

---

## Integration with Other Appendices

- `[APP]__META_ORCHESTRATION.md` — names the topology; this appendix names the *container* each agent runs in.
- `[APP]__SPARC_METHODOLOGY.md` — phase-based delegation is a natural fit for SPARC (Phase 4 Refinement = coder; Phase 5 Completion = reviewer, sequenced).
- `[APP]__AGENT_HOOKS.md` — `SubagentStart` and `SubagentStop` hooks are the natural places to auto-create and auto-cleanup worktrees.
- `[APP]__AGENT_OBSERVABILITY.md` — tag every tool-use log with the agent's worktree name so multi-agent logs remain attributable.
- `[APP]__PROJECT_DOCUMENTATION.md` — per-module CLAUDE.md files define ownership lines the dispatcher can respect.

---

## Checklist: Delegation and Worktree Readiness

- [ ] Every parallel task has explicit, non-overlapping file ownership
- [ ] Every agent runs in its own worktree on its own branch
- [ ] Worktrees base from an up-to-date `main`
- [ ] Agents commit before their worktree is removed
- [ ] A meta-agent integrates; it does not also build
- [ ] Merges are ordered by dependency
- [ ] The E2E harness runs after integration, not just per-branch
- [ ] Scope violations are caught at merge time and sent back, not silently fixed
- [ ] Hand-offs include brief, boundaries, success criteria, and expected output format
- [ ] Session Reports per agent are collected and archived
