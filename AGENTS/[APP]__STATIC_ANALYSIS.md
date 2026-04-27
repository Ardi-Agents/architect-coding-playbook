# Appendix: Static Analysis Rules

> **Parent**: [AGENTS.md](../AGENTS.md) | **Version**: 1.2 | **Updated**: 2026-01-22

---

## Tool Selection by Change Size

| Change Type | Tools Required |
|-------------|----------------|
| Small edits (<20 lines) | Ruff + ESLint + TSC |
| New functions/modules | + Mypy + Bandit + Semgrep (light) |
| Pre-commit / major changes | All tools including GitLeaks |
| Full test suite / major refactor | All tools + **Security Review** |

### Automated Security Review Trigger

**When to Run**: Automatically triggered when:
- Full test suite executed (`pytest tests/` or `npm run test`)
- Major static analysis run (`scripts/security_suite.sh`)
- Pre-deployment validation
- Weekly scheduled CI runs

**Process**:
1. Run full security scan suite (Trivy, Checkov, Semgrep, GitLeaks)
2. Execute AI-powered analysis: `scripts/analyze_security_findings.py`
3. Generate actionable report with risk assessment
4. Email notification to security team with findings
5. Update `Documentation/QA & Testing Methodology/security_findings_log.md`

**AI Judgment Criteria**:
- **CRITICAL**: Immediate action required (< 24 hours)
- **HIGH**: Review and fix within 7 days
- **MEDIUM**: Address in next sprint
- **LOW**: Track for quarterly review
- **MINIMAL**: No action needed, continue monitoring

**Reporting**:
- Email sent to configured notification address
- Report archived in GitHub Actions artifacts
- Findings logged in security_findings_log.md
- GitHub Security tab updated with SARIF results
- **Secret Redaction Rule**: Never store literal secrets (API keys, tokens, passwords, etc.) in documentation, logs, AI summaries, or reports. Always replace with placeholders such as `REDACTED_<TYPE>`. If a tool captures a secret string, redact it before committing or sharing.

---

## Dead Code Detection

Beyond language-specific tooling (Knip, etc.), apply dead code principles broadly:
zero-caller modules, functions, entry points, CLI commands, and build artifacts.
If nothing imports, invokes, or references it, delete it — dead code wastes context
and misleads agents.

### General Checks

- **Zero-caller modules**: Source files with no inbound imports or entry-point registration
- **Unused exports**: Functions, classes, or constants exported but never consumed
- **Orphaned artifacts**: Build outputs, generated files, or config entries referencing removed code
- **Stale entry points**: CLI commands, API routes, or scheduled tasks pointing to deleted handlers

### Knip (JavaScript/TypeScript)

**Knip is advisory, not authoritative.** Do NOT auto-remove flagged items.

### Before Removing Any Flagged Item

1. **Check API contracts** → `backend/app/schemas/`
2. **Check test usage** → `grep -r "ItemName" tests/`
3. **Check design specs** → `Documentation/Solution Design & Planning/`
4. **Verify build passes** → `npm run build`

### False Positives List

Maintained in: `AGENTS/[APP]__PROJECT_SPECIFIC.md` → **Knip False Positives** section

**Rules**:
- Do NOT auto-remove items in that list
- Add new false positives with location and justification
- Periodically review list for stale entries

---

## Lint Feedback Protocol

Fix lint errors in files you're modifying within same change. **Passing lint = definition of done.**

### When to Fix vs Ignore

| Situation | Action |
|-----------|--------|
| Error in file you're editing | Fix immediately |
| Error in unrelated file | Do NOT fix (scope discipline) |
| Warning in file you're editing | Fix if trivial, else document |
| Pre-existing errors | Only fix if blocking your work |

---

## Tool-Specific Configuration

### Ruff (Python)
```bash
ruff check backend/
ruff format backend/ --check
```

### ESLint (TypeScript/React)
```bash
cd frontend && npm run lint
```

### Type Checking
```bash
# Backend
mypy backend/app --ignore-missing-imports

# Frontend
cd frontend && npm run typecheck
```

### Security Scanning
```bash
# Secrets detection
gitleaks detect --source . --verbose

# Python security
bandit -r backend/app -ll
```

> Full security workflow, triggers, and license guidance live in [Documentation/QA & Testing Methodology/free_security_tooling_stack.md](../Documentation/QA%20%26%20Testing%20Methodology/free_security_tooling_stack.md). Run the tools required for your change scope before completion.

#### Trivy Fix vs Ignore Matrix

| Scenario | Action |
|----------|--------|
| **New dependency introduces HIGH/CRITICAL CVE** | Do **not** merge. Select a different version/library or remove the dependency so the finding disappears. |
| **CVE pre-existed in lockfile / base image** | Document the CVE ID, affected package, and mitigation plan inside `AGENTS/[APP]__PROJECT_SPECIFIC.md` under Security Exceptions, then tag the security/infra owner for prioritization. |


---

## Integration with CI

Ensure these checks pass before marking work complete:
- [ ] `ruff check` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] No new security warnings from Bandit/GitLeaks

---

## Test Coverage Requirements

### Measurement
```bash
# Backend with coverage report
poetry run pytest tests/backend/ --cov=backend/app --cov-report=term-missing --cov-report=html

# View HTML report
open htmlcov/index.html
```

### Targets
| Component | Minimum Coverage |
|-----------|------------------|
| Models | 100% |
| Schemas | 100% |
| Repositories | 95% |
| Services | 85% |
| API endpoints | 90% |
| Overall | 80% |

### Structural Coverage Checks

Beyond percentage targets, verify structural test health:

- **File pairing**: Every source module has a corresponding test file. New modules get tests before merge.
- **No stale imports**: Test files don't import deleted or renamed functions. A test that imports a phantom is worse than no test.
- **New code = new tests**: PRs adding modules without test files are incomplete.

### Improving Coverage
1. **Identify gaps**: Review `--cov-report=term-missing` output
2. **Prioritize**: Focus on critical paths (auth, data mutations)
3. **Add tests**: Target uncovered branches, not just lines
4. **Mock external services**: LLM calls, file I/O, external APIs

---

## Knip CI Integration

### Recommended CI Check
```yaml
- name: Dead Code Check
  run: |
    cd frontend && npx knip --reporter json > knip-report.json
    # Review report for new unused exports
```

### Auto-Update False Positives
When adding to false positives list in `[APP]__PROJECT_SPECIFIC.md`, include:
1. **Item name and location**
2. **Why it's a false positive** (API contract, roadmap feature, etc.)
3. **Date added**
4. **Review date** (3 months out) - periodically verify still needed

---

## Documentation & Artifact Integrity

Static analysis applies to prose and project artifacts, not just source code.
Run these checks when documentation or project structure changes.

### Documentation Separation of Concerns

Each concept, rule, or schema definition must live in exactly one file. No content
duplicated across documentation files — reference the authoritative source instead.

**Checks**:
- No two files define the same rule, schema, or procedure
- When content appears similar in multiple files, one file owns it and others link to it
- Merge or deduplicate any violations found during review

### Documentation Referential Integrity

Every file, function, CLI command, or configuration key mentioned in docs must exist
in the code. Every module in the code must appear in the correct documentation domain.

**Checks**:
- File paths referenced in docs resolve to actual files
- Function and class names cited in docs exist in the codebase
- CLI commands documented actually run without error
- New modules are mentioned in the appropriate documentation section
- Removed code is scrubbed from all docs (not just the source file)

### Runbook & Pipeline Accuracy

Walk through any runbook, setup guide, or pipeline documentation mentally (or literally).
Do the commands, file paths, and sequencing match what the code actually does?

**Checks**:
- Shell commands in docs execute successfully in a clean environment
- File paths in step-by-step instructions point to real locations
- Step ordering matches actual dependency order (e.g., migrate before seed)
- Environment variable names match what the code reads
- Tool versions and flags match current project configuration

### Plan File Staleness

Plan files (`ACTIVE_PLAN.md`, roadmap documents, implementation plans) go stale quickly.
Completed or obsolete plans waste context and mislead agents.

**Checks**:
- No plan files with all tasks marked complete — archive or delete them
- No plan files referencing features already shipped or abandoned
- `agent_sessions_tmp/` contains only active session plans
- Roadmap items that shipped are moved to a changelog or removed

### README Accuracy

The README is often the first file an agent or developer reads. Inaccurate READMEs
erode trust and cause wrong assumptions.

**Checks**:
- Repo structure trees match actual files and directories
- Feature descriptions match implemented (not aspirational) behavior
- Unimplemented features are explicitly marked as planned or removed
- Setup instructions produce a working environment
- Badge URLs and links resolve correctly
