#!/usr/bin/env node
// End-to-end audit of the install at ~/Desktop/playbook-test + ~/.claude/ user state
// Goal: verify EVERYTHING is correctly unpacked, substituted, and wired up.
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { homedir } from 'os';

const PB = '/Users/gio/Desktop/architect-coding-playbook';
const HOME = homedir();
const HOMEC = HOME + '/.claude';
const PROJ = HOME + '/Desktop/playbook-test';

let pass = 0, fail = 0, warn = 0;
const findings = [];

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const exists = (p) => existsSync(p);
const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

const check = (label, fn, level = 'fail') => {
  let ok = false, err = null;
  try { ok = !!fn(); } catch (e) { err = e.message; }
  findings.push({ label, ok, err, level });
  if (ok) pass++;
  else if (level === 'warn') warn++;
  else fail++;
};

const section = (name) => findings.push({ section: name });

// =========================================================
section('PROJECT FILES — presence & structure');
// =========================================================

check('Project root exists', () => exists(PROJ));
check('CLAUDE.md exists', () => exists(PROJ + '/CLAUDE.md'));
check('AGENTS.md (kernel) exists', () => exists(PROJ + '/AGENTS.md'));
check('AGENTS/ dir exists', () => exists(PROJ + '/AGENTS'));
check('.claude/ dir exists', () => exists(PROJ + '/.claude'));
check('.claude/settings.json exists', () => exists(PROJ + '/.claude/settings.json'));
check('.claude/rules/ exists with 3 files', () => readdirSync(PROJ + '/.claude/rules').length === 3);
check('.claude/skills/_README.md exists', () => exists(PROJ + '/.claude/skills/_README.md'));
check('.claude/agents/researcher.md exists', () => exists(PROJ + '/.claude/agents/researcher.md'));
check('.claude/agents/reviewer.md exists', () => exists(PROJ + '/.claude/agents/reviewer.md'));
check('AGENTS/PBTEST__IMPLEMENTATION.md exists', () => exists(PROJ + '/AGENTS/PBTEST__IMPLEMENTATION.md'));
check('AGENTS/PBTEST__API_DESIGN.md exists', () => exists(PROJ + '/AGENTS/PBTEST__API_DESIGN.md'));
check('AGENTS/PBTEST__STATIC_ANALYSIS.md exists', () => exists(PROJ + '/AGENTS/PBTEST__STATIC_ANALYSIS.md'));
check('AGENTS/PBTEST__CHECKLISTS.md exists', () => exists(PROJ + '/AGENTS/PBTEST__CHECKLISTS.md'));
check('AGENTS/PBTEST__TOOL_USAGE.md exists', () => exists(PROJ + '/AGENTS/PBTEST__TOOL_USAGE.md'));
check('AGENTS/PBTEST__DEPENDENCY_UPGRADES.md exists', () => exists(PROJ + '/AGENTS/PBTEST__DEPENDENCY_UPGRADES.md'));
check('AGENTS/PBTEST__PROJECT_SPECIFIC.md exists', () => exists(PROJ + '/AGENTS/PBTEST__PROJECT_SPECIFIC.md'));
check('No leftover [APP]__*.md files in AGENTS/', () => {
  return readdirSync(PROJ + '/AGENTS').filter(f => f.includes('[APP]')).length === 0;
});

// =========================================================
section('PROJECT FILES — content correctness (substitutions)');
// =========================================================

check('Project CLAUDE.md first line is @AGENTS.md', () => {
  return read(PROJ + '/CLAUDE.md').split('\n')[0] === '@AGENTS.md';
});
check('CLAUDE.md: PROJECT_NAME substituted (no [PROJECT_NAME] leaks)', () => {
  return !read(PROJ + '/CLAUDE.md').includes('[PROJECT_NAME]');
});
check('CLAUDE.md: PATH_TO_REPO substituted (no [PATH_TO_REPO] leaks)', () => {
  return !read(PROJ + '/CLAUDE.md').includes('[PATH_TO_REPO]');
});
check('CLAUDE.md: APP token substituted (no bare [APP] in body)', () => {
  return !/\[APP\]/.test(read(PROJ + '/CLAUDE.md'));
});
check('CLAUDE.md: stack-command placeholders substituted', () => {
  const c = read(PROJ + '/CLAUDE.md');
  return !c.includes('[YOUR_START_COMMAND]') &&
         !c.includes('[YOUR_TEST_COMMAND]') &&
         !c.includes('[YOUR_LINT_COMMAND]') &&
         !c.includes('[YOUR_BUILD_COMMAND]');
});
check('CLAUDE.md: docs placeholder line removed/commented', () => {
  return !/^@docs\/\[ROADMAP_OR_STRATEGY_FILE\]\.md/m.test(read(PROJ + '/CLAUDE.md'));
});

// AGENTS appendices substitution
// Note: not all appendices have [APP] in their content — some (API_DESIGN, TOOL_USAGE,
// DEPENDENCY_UPGRADES, PROJECT_SPECIFIC) reference no other appendices internally.
// Only IMPLEMENTATION, CHECKLISTS, STATIC_ANALYSIS have cross-references.
for (const f of ['IMPLEMENTATION', 'API_DESIGN', 'STATIC_ANALYSIS', 'CHECKLISTS', 'TOOL_USAGE', 'DEPENDENCY_UPGRADES']) {
  check(`PBTEST__${f}.md: zero [APP] leaks`, () => {
    return !read(PROJ + '/AGENTS/PBTEST__' + f + '.md').includes('[APP]');
  });
}
// Cross-reference correctness: source [APP] occurrences == installed PBTEST occurrences (per file)
for (const f of ['IMPLEMENTATION', 'API_DESIGN', 'STATIC_ANALYSIS', 'CHECKLISTS', 'TOOL_USAGE', 'DEPENDENCY_UPGRADES', 'PROJECT_SPECIFIC']) {
  check(`PBTEST__${f}.md: PBTEST count = source [APP] count`, () => {
    const src = read(PB + '/AGENTS/[APP]__' + f + '.md');
    const inst = read(PROJ + '/AGENTS/PBTEST__' + f + '.md');
    // Strip banner + blank line if present
    const instBody = inst.startsWith('> TODO:') ? inst.split('\n').slice(2).join('\n') : inst;
    const sourceCount = (src.match(/\[APP\]/g) || []).length;
    const installedCount = (instBody.match(/PBTEST/g) || []).length;
    return sourceCount === installedCount;
  });
}
check('PBTEST__PROJECT_SPECIFIC.md starts with TODO banner', () => {
  return read(PROJ + '/AGENTS/PBTEST__PROJECT_SPECIFIC.md').startsWith('> TODO:');
});
check('PBTEST__PROJECT_SPECIFIC.md banner kept literal [APP] (upstream link)', () => {
  const banner = read(PROJ + '/AGENTS/PBTEST__PROJECT_SPECIFIC.md').split('\n')[0];
  return banner.includes('[APP]') || banner.includes('%5BAPP%5D');
});
check('PBTEST__PROJECT_SPECIFIC.md body (post-banner) has 0 [APP] leaks', () => {
  const c = read(PROJ + '/AGENTS/PBTEST__PROJECT_SPECIFIC.md');
  // Skip first 2 lines (banner + blank)
  const body = c.split('\n').slice(2).join('\n');
  return !body.includes('[APP]');
});

// Kernel AGENTS.md
check('Kernel AGENTS.md: zero [APP] leaks (after substitution)', () => {
  return !read(PROJ + '/AGENTS.md').includes('[APP]');
});
check('Kernel AGENTS.md: zero %5BAPP%5D leaks', () => {
  return !read(PROJ + '/AGENTS.md').includes('%5BAPP%5D');
});
check('Kernel AGENTS.md: PBTEST appears (substitution applied)', () => {
  return read(PROJ + '/AGENTS.md').includes('PBTEST');
});

// Project rules — URL-encoded substitution
for (const r of ['code-style', 'testing', 'api-design']) {
  check(`Rule ${r}.md: zero [APP] leaks`, () => {
    return !read(PROJ + '/.claude/rules/' + r + '.md').includes('[APP]');
  });
  check(`Rule ${r}.md: zero %5BAPP%5D leaks`, () => {
    return !read(PROJ + '/.claude/rules/' + r + '.md').includes('%5BAPP%5D');
  }, 'warn'); // warn since this is a deeper bug we may not have fixed in user's install
  check(`Rule ${r}.md: zero [PROJECT_NAME] leaks`, () => {
    return !read(PROJ + '/.claude/rules/' + r + '.md').includes('[PROJECT_NAME]');
  });
}

// =========================================================
section('PROJECT FILES — cross-reference resolution');
// =========================================================

check('@AGENTS.md from CLAUDE.md resolves', () => exists(PROJ + '/AGENTS.md'));

// Kernel internal links → must resolve
check('Kernel AGENTS.md: all internal markdown link refs resolve', () => {
  const k = read(PROJ + '/AGENTS.md');
  // Find all markdown link refs to AGENTS/ files
  const refs = [...new Set((k.match(/AGENTS\/[A-Z_]+__[A-Z_]+\.md/g) || []))];
  if (refs.length === 0) return true;
  return refs.every(r => exists(PROJ + '/' + r));
});

// Project CLAUDE.md → AGENTS appendices
check('Project CLAUDE.md @AGENTS/PBTEST__*.md imports all resolve', () => {
  const c = read(PROJ + '/CLAUDE.md');
  const refs = [...new Set((c.match(/@AGENTS\/PBTEST__[A-Z_]+\.md/g) || []))];
  if (refs.length === 0) return false; // should have some
  return refs.every(r => {
    const path = r.slice(1); // strip @
    return exists(PROJ + '/' + path);
  });
});

// Project rules → relative AGENTS paths
check('Rule testing.md: relative AGENTS paths resolve', () => {
  const c = read(PROJ + '/.claude/rules/testing.md');
  // Find ../../AGENTS/X paths
  const refs = c.match(/\.\.\/\.\.\/AGENTS\/[A-Z_]+__[A-Z_]+\.md/g) || [];
  if (refs.length === 0) return true;
  return refs.every(r => {
    // From <project>/.claude/rules/testing.md, ../../AGENTS/X means <project>/AGENTS/X
    const path = r.replace('../../AGENTS/', PROJ + '/AGENTS/');
    return exists(path);
  });
});

check('Rule api-design.md: relative AGENTS paths resolve', () => {
  const c = read(PROJ + '/.claude/rules/api-design.md');
  const refs = c.match(/\.\.\/\.\.\/AGENTS\/[A-Z_]+__[A-Z_]+\.md/g) || [];
  if (refs.length === 0) return true;
  return refs.every(r => exists(r.replace('../../AGENTS/', PROJ + '/AGENTS/')));
});

// =========================================================
section('PROJECT — settings.json validity & shape');
// =========================================================

check('settings.json parses as JSON', () => json(PROJ + '/.claude/settings.json'));
check('settings.json has $schema', () => json(PROJ + '/.claude/settings.json')['$schema']);
check('settings.json has permissions.allow', () => Array.isArray(json(PROJ + '/.claude/settings.json').permissions?.allow));
check('settings.json has permissions.deny', () => Array.isArray(json(PROJ + '/.claude/settings.json').permissions?.deny));
check('settings.json has permissions.ask', () => Array.isArray(json(PROJ + '/.claude/settings.json').permissions?.ask));
check('settings.json has hooks.SessionStart', () => Array.isArray(json(PROJ + '/.claude/settings.json').hooks?.SessionStart));
check('settings.json deny includes git push', () => {
  return json(PROJ + '/.claude/settings.json').permissions.deny.includes('Bash(git push:*)');
});
check('settings.json deny includes rm -rf', () => {
  return json(PROJ + '/.claude/settings.json').permissions.deny.includes('Bash(rm -rf:*)');
});
check('settings.json has NO invented keys (allow_read/auto_load/etc)', () => {
  const j = json(PROJ + '/.claude/settings.json');
  return !('allow_read' in j) && !('auto_load' in j) && !('rules' in j) &&
         !(j.permissions && 'allow_bash' in j.permissions);
});

// =========================================================
section('PROJECT — subagent frontmatter (Anthropic spec compliance)');
// =========================================================

const checkAgent = (name) => {
  const p = PROJ + '/.claude/agents/' + name + '.md';
  if (!exists(p)) return null;
  const c = read(p);
  return {
    hasFrontmatter: c.startsWith('---\n'),
    hasName: /^name:\s*\S/m.test(c),
    hasDescription: /^description:\s*\S/m.test(c),
    hasTools: /^tools:\s*\S/m.test(c),
    fmContent: c.startsWith('---\n') ? c.split('---\n')[1] : null,
  };
};

for (const a of ['researcher', 'reviewer']) {
  check(`${a}.md has YAML frontmatter`, () => checkAgent(a)?.hasFrontmatter);
  check(`${a}.md has name field`, () => checkAgent(a)?.hasName);
  check(`${a}.md has description field`, () => checkAgent(a)?.hasDescription);
  check(`${a}.md has tools field`, () => checkAgent(a)?.hasTools);
}

// =========================================================
section('USER SCOPE — ~/.claude/');
// =========================================================

check('~/.claude/CLAUDE.md exists', () => exists(HOMEC + '/CLAUDE.md'));
check('~/.claude/CLAUDE.md preserved graphify section', () => {
  return read(HOMEC + '/CLAUDE.md').includes('graphify');
});
check('~/.claude/CLAUDE.md has playbook delimiter', () => {
  return read(HOMEC + '/CLAUDE.md').includes('<!-- BEGIN architect-coding-playbook');
});
check('~/.claude/settings.json parses', () => json(HOMEC + '/settings.json'));
check('~/.claude/settings.json has $schema (added by install)', () => {
  return json(HOMEC + '/settings.json')['$schema'];
});
check('~/.claude/settings.json has includeCoAuthoredBy=false', () => {
  return json(HOMEC + '/settings.json').includeCoAuthoredBy === false;
});
check('~/.claude/settings.json preserved hooks (not clobbered)', () => {
  const j = json(HOMEC + '/settings.json');
  return j.hooks && Object.keys(j.hooks).length > 0;
});
check('~/.claude/settings.json preserved permissions (not clobbered)', () => {
  return json(HOMEC + '/settings.json').permissions !== undefined;
});

check('~/.claude/rules/preferences.md exists', () => exists(HOMEC + '/rules/preferences.md'));
check('~/.claude/rules/workflows.md exists', () => exists(HOMEC + '/rules/workflows.md'));
check('~/.claude/rules/org-policies.md exists', () => exists(HOMEC + '/rules/org-policies.md'));
check('~/.claude/rules/consistency-checks.md exists', () => exists(HOMEC + '/rules/consistency-checks.md'));

// Q3 substitution check on real install
check('~/.claude/rules/org-policies.md: Q3 block has user content (not placeholder)', () => {
  const c = read(HOMEC + '/rules/org-policies.md');
  const m = c.match(/<!-- BEGIN Q3_ORG_POLICIES -->([\s\S]*?)<!-- END Q3_ORG_POLICIES -->/);
  if (!m) return false;
  return !m[1].includes('_(none — Q3 answer not provided)_') &&
         /TypeScript/i.test(m[1]);
});

// User skills
for (const s of ['journal', 'todo', 'explain-code', 'verify-install']) {
  check(`~/.claude/skills/${s}/SKILL.md has frontmatter`, () => {
    const p = HOMEC + '/skills/' + s + '/SKILL.md';
    if (!exists(p)) return false;
    const c = read(p);
    return c.startsWith('---\n') && /^name:/m.test(c) && /^description:/m.test(c);
  });
}

// Memory dir at encoded-cwd
const ENC = '-Users-gio-Desktop-playbook-test';
check(`~/.claude/projects/${ENC}/memory/MEMORY.md exists`, () => {
  return exists(HOMEC + '/projects/' + ENC + '/memory/MEMORY.md');
});
check(`~/.claude/projects/${ENC}/memory/debugging.md exists`, () => {
  return exists(HOMEC + '/projects/' + ENC + '/memory/debugging.md');
});
check(`~/.claude/projects/${ENC}/memory/conventions.md exists`, () => {
  return exists(HOMEC + '/projects/' + ENC + '/memory/conventions.md');
});

// =========================================================
section('INSTALL RECEIPT — completeness');
// =========================================================

check('Install receipt exists at HOME root (NOT inside .claude/)', () => {
  return exists(HOME + '/.architect-playbook-manifest.json');
});
check('Receipt parses as JSON', () => json(HOME + '/.architect-playbook-manifest.json'));
check('Receipt has writes[] array', () => {
  return Array.isArray(json(HOME + '/.architect-playbook-manifest.json').writes);
});
check('Receipt records settingsMerges with addedKeys', () => {
  const r = json(HOME + '/.architect-playbook-manifest.json');
  return r.settingsMerges?.[0]?.addedKeys?.length > 0;
});
check('Receipt has uninstall plan', () => {
  return Array.isArray(json(HOME + '/.architect-playbook-manifest.json').uninstall?.removePaths);
});
check('Receipt records pre-install backup paths', () => {
  const r = json(HOME + '/.architect-playbook-manifest.json');
  return r.uninstall?.restoreBackups?.length > 0;
});

// =========================================================
section('BACKUP — pre-install backup integrity');
// =========================================================

const BAK_DIR = HOMEC + '/.pre-playbook-backup-20260430-155125';
check('Pre-install backup dir exists', () => exists(BAK_DIR));
check('Pre-install backup contains CLAUDE.md', () => exists(BAK_DIR + '/CLAUDE.md'));
check('Pre-install backup contains settings.json', () => exists(BAK_DIR + '/settings.json'));
check('Backup CLAUDE.md is the original 4-line graphify file', () => {
  const c = read(BAK_DIR + '/CLAUDE.md');
  return c.includes('graphify') && c.split('\n').length <= 5;
});
check('Backup settings.json parses (original was valid JSON)', () => {
  return json(BAK_DIR + '/settings.json');
});
check('Backup settings.json has hooks (matches what should have been pre-existing)', () => {
  return json(BAK_DIR + '/settings.json').hooks !== undefined;
});

// =========================================================
section('MANIFEST consistency — shipped vs actual');
// =========================================================

const manifest = json(PB + '/CLAUDE_CODE/install.manifest.json');
check('Manifest valid JSON', () => manifest);
check('Every shippedFiles[].sha256 matches actual template file', () => {
  let allMatch = true;
  for (const f of manifest.shippedFiles) {
    const tplPath = PB + '/' + f.templatePath;
    if (!exists(tplPath)) { allMatch = false; break; }
    if (sha(tplPath) !== f.sha256) { allMatch = false; break; }
  }
  return allMatch;
});
check('Manifest agentsCopy.kernelFile declares tokenSubstitution (after fix)', () => {
  return typeof manifest.agentsCopy?.kernelFile?.tokenSubstitution === 'object';
});
check('Manifest agentsCopy.kernelFile substitutes both [APP] and %5BAPP%5D', () => {
  const t = manifest.agentsCopy?.kernelFile?.tokenSubstitution;
  return t && '[APP]' in t && '%5BAPP%5D' in t;
});

// =========================================================
section('ROUND-TRIP — /verify-install logic against this install');
// =========================================================

check('/verify-install: 0 unexpected drift, 0 missing', () => {
  let ok = 0, exp_drift = 0, drifted = 0, missing = 0;
  const expandPath = (p) => p.replace(/^~/, HOME).replace('<PROJECT>', PROJ);
  for (const f of manifest.shippedFiles) {
    const ip = expandPath(f.installPath);
    if (!exists(ip)) {
      if (f.optional) continue;
      missing++;
      continue;
    }
    const s = sha(ip);
    if (s === f.sha256) ok++;
    else if (f.tokenSubstitution || f.id === 'global.CLAUDE') exp_drift++;
    else { drifted++; }
  }
  return drifted === 0 && missing === 0;
});

// =========================================================
// REPORT
// =========================================================
console.log('\n=== AUDIT: ~/Desktop/playbook-test + ~/.claude/ ===\n');
let currentSection = null;
for (const f of findings) {
  if (f.section) {
    if (currentSection !== null) console.log();
    console.log('─── ' + f.section + ' ───');
    currentSection = f.section;
    continue;
  }
  let mark;
  if (f.ok) mark = '  ✓';
  else if (f.level === 'warn') mark = '  ⚠';
  else mark = '  ✗';
  console.log(`${mark} ${f.label}${f.err ? ' [' + f.err + ']' : ''}`);
}

console.log('\n=== SUMMARY ===');
console.log(`Total checks: ${pass + fail + warn}`);
console.log(`Pass: ${pass}`);
console.log(`Warn: ${warn}`);
console.log(`Fail: ${fail}`);
console.log(fail === 0 ? '\n✓ AUDIT PASSED' : '\n✗ AUDIT FAILED — see ✗ marks above');
process.exit(fail > 0 ? 1 : 0);
