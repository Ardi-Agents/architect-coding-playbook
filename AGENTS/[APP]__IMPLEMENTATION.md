# Appendix: Implementation Guidelines

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.2 | **Updated**: 2026-01-22
> **Scope**: Development workflow and practices

---

## Test-Driven Development (TDD)

### Core Requirements
- **Write or enhance tests as you implement**
- **Proper testing after non-trivial changes** (>50 lines OR >2 files)
- **Comprehensive tests after major changes**
- **Regression tests first**: Before fixing a bug, write test that reproduces the failure
- **Prod-only URL/redirect bugs**: Capture `curl -sI` headers for canonical + non-canonical routes (e.g. `/path` vs `/path/`) before/after, and add a regression test for any redirect/auth behavior you change

### Deterministic Test Data (P1)
Use **hardcoded, static data** for all tests:
- ❌ **Bad**: `user_id = uuid.uuid4()` (Random, hard to debug)
- ✅ **Good**: `user_id = "00000000-0000-0000-0000-000000000001"` (Predictable)

**Exception**: Integration tests may use factories with predictable seeds.
**Why**: Makes debugging regressions significantly faster.

### Iterative Protocol
When something fails:
1. **Write/Enhance Test**: Capture the issue
2. **Understand Root Cause**: Debug deeply
3. **Use Reference**: Find last working version, compare with `git diff`
4. **Fix the Issue**: Implement fix
5. **Test & Iterate**: Run tests until passing

### Root Cause Over Symptoms (P1)
- **Diagnose root causes**, not symptoms or side-effects
- Avoid blanket or "quick fix" solutions that might hide errors
- Never silently discard, mask, or change user data

**Example**:
- ❌ **Wrong**: API returns 500 → add try/except to catch and return 200
- ✅ **Correct**: API returns 500 → trace error, fix underlying bug, add test

### Smoke Test Updates
- Every new endpoint with self-test path → add to smoke test script

---

## Scope Boundary Enforcement

### Before Modifying Existing Functionality
1. Document why change is necessary for current milestone
2. If unrelated to current work → **DO NOT MODIFY**
3. Create checkpoint test to verify unrelated systems still work

### Examples

❌ **WRONG**: Adding file upload → refactoring user auth "to be cleaner"
✅ **CORRECT**: Adding file upload → only touch upload-related components

❌ **WRONG**: Fixing status pipeline bug → reformatting entire codebase
✅ **CORRECT**: Fixing status pipeline bug → minimal changes to pipeline code

### Change Impact Testing
After each significant modification:
1. Run targeted tests for modified component
2. Run integration tests for unchanged components
3. Stop immediately if unrelated functionality breaks

---

## Working Component Reference Protocol

**Principle**: When fixing existing code, find last working version first.

### Required Steps
1. Identify last known working commit
2. Use `git show`/`git diff` to compare current vs working
3. Only modify what is broken, preserve what works

### Example Workflow
```bash
# Find when it last worked
git log --all --grep="feature X working"

# Compare current vs working
git diff HEAD abc123def -- path/to/file.py

# Identify minimal change needed
```

❌ **WRONG**: Auth broken → rewrite from scratch
✅ **CORRECT**: Auth broken → `git show` last working → compare → fix only what changed

---

## Step-by-Step Implementation

### Principles
- Implement step-by-step, iterate, reflect
- **Accuracy over speed**
- Sometimes rewriting from scratch > trying to revise

### Pre-Implementation Checklist
- [ ] Parse specification into detailed requirements
- [ ] Cross-reference against existing rules
- [ ] Analyze current structure vs requirements
- [ ] Create validation checklist
- [ ] Plan cleanup alongside feature work

### State Machine Modeling
When frontend/backend logic has >2 UI/workflow modes:
- Model state explicitly (discriminated unions, reducers, enum handlers)
- Document possible states, transitions, side effects
- Ensure tests cover each state/transition

---

## Database Updates

### Schema Consistency Validation
Validate across:
- ORM models (`models.py`)
- Migration scripts
- Service layer code
- Test fixtures and mocks
- API request/response schemas

### Migration Verification
Before relying on column that exists in ORM:
1. Verify column exists in actual database schema
2. If missing, add Alembic migration
3. Note verification command (`alembic current`, `psql \d`)
4. Document in PR description

### Checklist
```markdown
Before deploying database changes:
- [ ] Updated ORM models
- [ ] Created migration script
- [ ] Updated all services querying affected tables
- [ ] Updated test fixtures
- [ ] Updated API documentation
- [ ] Ran migration on target environment
- [ ] Verified all tests pass
```

---

## Static Analysis

> Full rules: [AGENTS/[APP]__STATIC_ANALYSIS.md]([APP]__STATIC_ANALYSIS.md)

**Quick Reference**:
- Small edits: Ruff + ESLint + TSC
- New modules: + Mypy + Bandit
- Pre-commit: All tools including GitLeaks
- **Knip false positives**: See `AGENTS/[APP]__PROJECT_SPECIFIC.md` → Knip False Positives section
- **Passing lint = definition of done**

---

## Error Recovery & Time-Boxing

### Time Limits
| Duration | Action |
|----------|--------|
| <15 min | Active debugging |
| 15-30 min | Document attempts, search for working examples |
| >30 min | Create blocker report, propose alternative |

### Blocker Report Format
```markdown
#### 🚧 Blocker Encountered

**Problem**: [Concise description]

**Attempts Made**:
1. [What tried and result]
2. [What tried and result]

**Current Understanding**: [What you know]

**Proposed Alternatives**:
A. [Approach 1 - pros/cons]
B. [Approach 2 - pros/cons]

**Recommendation**: [Which and why]
```

### Escalation
> See [AGENTS.md → Decision Documentation](../AGENTS.md#decision-documentation) for authoritative escalation triggers.

---

## Technical Debt Management

### Requirements
- Document clearly when building new capability with tech debt
- Record in productization roadmap document

### Entry Format
```markdown
##### [Component Name] - [Brief Issue]
**Priority**: P0/P1/P2
**Current State**: What's implemented now
**Problem**: Why not production-ready
**Needed Improvement**: What needs to change
**Estimated Effort**: S/M/L/XL
**Blocks**: What this blocks
```

### Examples of Tech Debt
- Hard-coded config (should be env vars)
- Missing error handling in edge cases
- In-memory state (should be persisted)
- Synchronous operations (should be async)
- Missing monitoring/logging for critical paths

---

## Workflow Status Integrity

**Principle**: Stuck workflows are bugs. Never apply manual status fixes.

### Required Response to Stuck Workflows
1. **Do NOT manually update status** (hides root cause)
2. **Reproduce in E2E test** first
3. **Implement systematic fix** to underlying pipeline
4. **Verify with full test suite**

### Example
❌ **WRONG**: Transaction stuck → manually update to `COMPLETED`
✅ **CORRECT**:
1. Write E2E test reproducing stuck state
2. Identify why transition failed
3. Fix transition logic
4. Run test suite to verify automatic completion

---

## Authentication System Protection

### P0 - CRITICAL
- **Never modify auth code unless explicitly requested**
- **Always test auth after ANY backend changes**
- Document auth changes with justification

### Testing Requirement
```bash
pytest tests/test_auth_flow.py -v
curl -X POST /api/auth/login -d '{"username":"test","password":"test"}'
```
