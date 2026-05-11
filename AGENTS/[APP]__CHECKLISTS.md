# Appendix: Checklists & Templates

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 2.0 | **Updated**: 2026-05-08
>
> **Owns**: Reusable checklists (pre-completion, claim-heavy output, architecture, migration, environment), decision-log template, blocker-report template, technical-debt entry template, rule-suggestion template.
>
> **Fires when**: pre-commit, "am I done?", before publishing a state report or audit, recording a decision, hitting a blocker, surfacing tech debt.

---

## Pre-Completion Checklist (cross-track)

Before marking any task as complete, verify:

### Code Quality

- [ ] Follows existing patterns and conventions
- [ ] No placeholder code or TODOs left
- [ ] No debug print statements
- [ ] All imports used (no unused imports)
- [ ] Variable names clear and consistent

### Build-Clean (per kernel Rule #10)

- [ ] Zero warnings, zero errors on default configuration
- [ ] Track-specific operationalization satisfied (see `[APP]__STATIC_ANALYSIS.md` § Build-Clean Posture)

### Testing

- [ ] All new/modified code has tests
- [ ] Each unit-of-work satisfied its declared **acceptance assertion** (per kernel Rule #11), not just touch-points
- [ ] All tests pass (unit, integration, end-to-end)
- [ ] Auth functionality tested (if backend changes; only applies when auth is present)
- [ ] No unrelated tests failing
- [ ] Adversarial tests written for the changed surface (per `[APP]__IMPLEMENTATION.md` § Pre-/Post-Edit Lifecycle Ritual)

### Scope & Impact

- [ ] Only modified necessary components
- [ ] No unrelated code refactored
- [ ] Breaking changes documented
- [ ] No silent deferrals (per kernel Rule #16; anything deferred was authorized)

### Database & Dependencies

- [ ] Schema changes in models, migrations, services, tests (per `[APP]__IMPLEMENTATION.md` § Database Updates)
- [ ] Database migrations run successfully
- [ ] New dependencies added via the track's package manager with versions locked
- [ ] No version pins changed without approval
- [ ] License compatibility check passes (if new dependencies added — see `[APP]__DEPENDENCY_UPGRADES.md` § License Compatibility)

### Documentation

- [ ] Technical debt in productization roadmap
- [ ] Design divergences noted
- [ ] API changes in OpenAPI spec
- [ ] Decision log for non-obvious choices
- [ ] No prose-without-verification (per kernel agent-native rule — symbol references grepped, performance claims measured, behavioral claims probed)

### Deployment Readiness

- [ ] Environment variables documented
- [ ] Configuration requirements noted
- [ ] Background service requirements documented
- [ ] E2E validation script updated

### Self-Assessment

- [ ] Followed P0 > P1 > P2 > P3 > P4 precedence
- [ ] Used working code as reference
- [ ] Reviewed git diff — no unexpected changes
- [ ] Verified active branch matches expectation
- [ ] Generated rule improvement suggestions

---

## Claim-Heavy Output Checklist

> **Apply when producing**: state-of-project reports, test suites, coverage audits, architectural assessments, design documents, "what's implemented vs what's not" summaries, runbooks for new contributors.

Per the kernel's **Adversarial-Review Checkpoint** rule, claim-heavy outputs get attacked before publication, not after.

### Before publishing

- [ ] Every non-trivial claim graded **VERIFIED / READ / INFERRED / GUESSED** (per kernel evidence-tier discipline)
- [ ] Below-VERIFIED claims either **promoted** via investigation OR **explicitly marked** with the action that would settle them
- [ ] Build run, tests run, files diffed — observed, not just read
- [ ] Symbol references grepped against live source
- [ ] Performance claims backed by measurements (wall-clock recorded)
- [ ] Behavioral claims backed by probes (small experiment, observable result)
- [ ] Adversarial-review checkpoint completed:
  - [ ] If a reviewer subagent is available, invoke it (e.g., `adversarial-reviewer` in Claude Code) and resolve every finding
  - [ ] If no reviewer is available, self-review with the explicit goal of finding holes
- [ ] Reviewer findings either **fixed in this round** OR **surfaced for explicit user decision** — never silently deferred
- [ ] Convergence signal: round-N review returns zero findings of any category (REAL DEFECT, BOUNDED FOLLOW-UP, MISSING CLAIM, WEAK CLAIM, POLISH)

### Specific high-leverage attacks

- For state reports: attack the "what's implemented" claims — does the named class actually exist? Does the test count match `--list-tests` output?
- For audits: attack the methodology — is the sample exhaustive or did it miss a directory?
- For architecture diagrams: attack the arrows — does control actually flow that way, or is that aspirational?
- For runbooks: walk every command in a clean environment; what's missing from the prerequisites?

---

## Decision Log Template

```markdown
#### Decision Log

**Decision #N**: [Brief description]
- **Context**: What was uncertain
- **Options Considered**:
  1. [Option A — pros/cons]
  2. [Option B — pros/cons]
- **Chosen Approach**: What you implemented
- **Rationale**: Why (cite rule priorities, working examples)
- **Risk/Trade-offs**: Any downsides to document
- **Backout Trigger** (if relevant): When this decision should be reopened (see `[APP]__DESIGN_POSTURE.md`)
```

---

## Technical Debt Entry Template

```markdown
##### [Component Name] - [Brief Issue]
**Priority**: P0/P1/P2
**Current State**: What's implemented now
**Problem**: Why it's not production-ready
**Needed Improvement**: What needs to change
**Estimated Effort**: S/M/L/XL
**Blocks**: What this blocks (if anything)
```

---

## Blocker Report Template

```markdown
#### Blocker Encountered

**Problem**: [Concise description]

**Attempts Made**:
1. [What you tried and result]
2. [What you tried and result]
3. [What you tried and result]

**Current Understanding**: [What you know about the issue]

**Proposed Alternatives**:
A. [Approach 1 — pros/cons]
B. [Approach 2 — pros/cons]

**Recommendation**: [Which alternative and why]
```

---

## Rule Suggestion Template

When proposing new rules after completing tasks (per kernel Continuous Improvement guidance):

```markdown
#### Suggested Rule Enhancement

##### Rule: [Title]
**Type**: Cross-track | Track-specific (`<track-name>`) | Project-Specific
**Where to Land**:
  - Cross-track → kernel `AGENTS.md`
  - Track-specific → `### Track: <name>` subsection of `[APP]__<APPENDIX>.md`
  - Project-specific → `[APP]__PROJECT_SPECIFIC.md`
**Insert After**: [Specific subsection]

\`\`\`markdown
[Full rule content in markdown]
\`\`\`

**Rationale**: [Why this prevents similar issues]
```

The "Where to Land" prompt enforces the kernel's `where-to-land` discipline — every new directive declares its scope before persisting.

---

## Architecture Documentation Checklist

For DESIGN-FIRST protocol (P1):

### Core Documents

- [ ] `ARCHITECTURE_OVERVIEW.md` created
  - [ ] Executive summary
  - [ ] Architecture diagram
  - [ ] Component responsibilities
  - [ ] Data flow descriptions
  - [ ] Key design decisions with rationale
  - [ ] Cross-track contracts (if multi-track project — what crosses the .NET/Python boundary, what schema, what wire format)

- [ ] `DATA_MODEL.md` created
  - [ ] Core entities and relationships
  - [ ] Relational, document, and/or graph model definitions as applicable
  - [ ] Indexing and partitioning strategy with justification
  - [ ] Example data shapes and records
  - [ ] Relationship or topology diagram
  - [ ] Data migration and synchronization strategy
  - [ ] Source-of-truth boundaries and cross-store synchronization rules

- [ ] `API_SPECIFICATION.md` created
  - [ ] Endpoint data set
  - [ ] Request/response schemas
  - [ ] Error formats (per `[APP]__API_DESIGN.md`)
  - [ ] Pagination strategy
  - [ ] Authentication scheme (if applicable)

- [ ] `IMPLEMENTATION_ROADMAP.md` created
  - [ ] Phase breakdown
  - [ ] **Each unit declares its acceptance assertion** (per kernel Rule #11), not just file lists
  - [ ] Files to create/modify
  - [ ] Risk assessment
  - [ ] Backout triggers (per `[APP]__DESIGN_POSTURE.md`)

### Quality Checks

- [ ] Can a new engineer implement Phase 1 without questions?
- [ ] All error cases documented?
- [ ] Database schema aligns with API responses?
- [ ] Clear migration/rollback strategy?
- [ ] Cross-track contracts versioned (if multi-track)?

---

## Database Migration Checklist

```markdown
Before deploying data model changes:
- [ ] Updated application models, mappings, and validators
- [ ] Created and reviewed the required migration, transformation, or backfill procedure
- [ ] Updated all affected queries, repositories, services, and traversals
- [ ] Updated test fixtures, seed data, and example payloads
- [ ] Updated API, schema, and data-contract documentation
- [ ] Applied changes in the target environment as required
- [ ] Verified all tests pass with the updated data model

Track-specific migration tooling notes are in [APP]__IMPLEMENTATION.md § Database Updates.
```

---

## API Work Completion Checklist

Before marking API work complete:

- [ ] Backend schema definition and frontend type side-by-side (or codegen run + diff reviewed)
- [ ] Every field matches (name, type, optionality)
- [ ] Cross-reference comments added where types are manually mirrored
- [ ] If 422/400 error → checked for schema drift
- [ ] Error responses follow the cross-track shape (per `[APP]__API_DESIGN.md` § Error Response Format)
- [ ] If auth is present: protected routes covered by tests

---

## Rule Improvement Output Format

At end of substantial tasks, provide:

```markdown
## Rule Improvement Suggestions

### Rule 1: [Title]
**Type**: Cross-track | Track-specific | Project-Specific
**Where to Land**: [chosen location with reason]

\`\`\`markdown
[Full rule content]
\`\`\`

**Rationale**: [Prevention explanation]
```

---

## Environment Verification Checklist

Before marking code complete, verify deployment readiness:

```markdown
- [ ] Application runs locally using the project's standard run command
- [ ] No hardcoded local URLs in production code paths
- [ ] Environment variables are documented in the project's example/template env file
- [ ] Deployment configuration is updated for any new environment variables
- [ ] Allowed CORS origins include required local and deployed domains
- [ ] Service and API URLs are configured via environment variables or equivalent settings
```

### Environment Variable Addition Protocol

When adding new env vars:

```markdown
1. Add to local development configuration
2. Add to the example/template configuration file with documentation
3. Update deployment configuration for non-sensitive values
4. Update secret management configuration for sensitive values
5. Document the deployment/configuration change in the PR
```
