# Appendix: Checklists & Templates

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.1 | **Updated**: 2026-01-22
> **Scope**: Reusable checklists and templates

---

## Pre-Completion Checklist

Before marking any task as complete, verify:

### Code Quality
- [ ] Follows existing patterns and conventions
- [ ] No placeholder code or TODOs left
- [ ] No debug print statements
- [ ] All imports used (no unused imports)
- [ ] Variable names clear and consistent

### Testing
- [ ] All new/modified code has tests
- [ ] All tests pass (unit, integration, and end-to-end)
- [ ] Auth functionality tested (if backend changes)
- [ ] No unrelated tests failing

### Scope & Impact
- [ ] Only modified necessary components
- [ ] No unrelated code refactored
- [ ] Breaking changes documented

### Database & Dependencies
- [ ] Schema changes in ORM, migrations, services, tests
- [ ] Database migrations run successfully
- [ ] New dependencies added via `poetry add` with versions locked
- [ ] No version pins changed without approval

### Documentation
- [ ] Technical debt in productization roadmap
- [ ] Design divergences noted
- [ ] API changes in OpenAPI spec
- [ ] Decision log for non-obvious choices

### Deployment Readiness
- [ ] Environment variables documented
- [ ] Configuration requirements noted
- [ ] Background service requirements documented
- [ ] E2E validation script updated

### Self-Assessment
- [ ] Followed P0 > P1 > P2 > P3 > P4 precedence
- [ ] Used working code as reference
- [ ] Reviewed git diff - no unexpected changes
- [ ] Generated rule improvement suggestions

---

## Decision Log Template

```markdown
#### Decision Log

**Decision #1**: [Brief description]
- **Context**: What was uncertain
- **Options Considered**:
  1. [Option A - pros/cons]
  2. [Option B - pros/cons]
- **Chosen Approach**: What you implemented
- **Rationale**: Why (cite rule priorities, working examples)
- **Risk/Trade-offs**: Any downsides to document
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
A. [Approach 1 - pros/cons]
B. [Approach 2 - pros/cons]

**Recommendation**: [Which alternative and why]
```

---

## Rule Suggestion Template

When proposing new rules after completing tasks:

```markdown
#### Suggested Rule Enhancement

##### Rule: [Title]
**Type**: Generic | Project-Specific
**Section**: [Exact section from AGENTS.md]
**Insert After**: [Specific subsection]

```markdown
[Full rule content in markdown]
```

**Rationale**: [Why this prevents similar issues]
```

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
  - [ ] Error formats
  - [ ] Pagination strategy

- [ ] `IMPLEMENTATION_ROADMAP.md` created
  - [ ] Phase breakdown
  - [ ] Task list with acceptance criteria
  - [ ] Files to create/modify
  - [ ] Risk assessment

### Quality Checks
- [ ] Can new engineer implement Phase 1 without questions?
- [ ] All error cases documented?
- [ ] Database schema aligns with API responses?
- [ ] Clear migration/rollback strategy?

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

Datastore-specific notes are in the project-specific file [APP]__PROJECT_SPECIFIC.md.
```

---

## API Work Completion Checklist

Before marking API work complete:
- [ ] Backend schema definition and frontend type side-by-side
- [ ] Every field matches (name, type, optionality)
- [ ] Cross-reference comments added
- [ ] If 422/400 error → checked for schema drift

---

## Rule Improvement Output Format

At end of substantial tasks, provide:

```markdown
## Rule Improvement Suggestions

### Rule 1: [Title]
**Type**: Generic | Project-Specific
**Section**: [Section name]
**Insert After**: [Subsection]

\`\`\`markdown
[Full rule content]
\`\`\`

**Rationale**: [Prevention explanation]
```

---

## Environment Verification Checklist

Before marking code complete, verify deployment readiness:

```markdown
- [ ] Code runs locally via `run_torusmind.sh`
- [ ] No hardcoded `http://localhost` in production code paths
- [ ] Environment variables documented in `.env.example`
- [ ] Deployment scripts updated if new env vars added
- [ ] CORS origins include both local and cloud domains
- [ ] API URLs use env vars with sensible defaults
```

### Environment Variable Addition Protocol
When adding new env vars:
1. Add to local `.env` file
2. Add to `.env.example` with description
3. Update `gcp_deployment/00_env.sh` (non-sensitive)
4. Update `gcp_deployment/02_secrets_setup.sh` (sensitive/secrets)
5. Document in PR description: "🚀 Deployment Change: Added [VAR_NAME]"
