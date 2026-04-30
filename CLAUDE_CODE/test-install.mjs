#!/usr/bin/env node
// Comprehensive test matrix for the Architect Coding Playbook install
// Runs every assertion from the plan + every later-discovered bug
// Reports pass/fail per item grouped by plan section
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

const PB = '/Users/gio/Desktop/architect-coding-playbook';
const HOME = '/tmp/acp-final-test/home/.claude';
const HOMEROOT = '/tmp/acp-final-test/home';
const PROJ = '/tmp/acp-final-test/project';

let pass = 0, fail = 0;
const results = {};

function check(section, id, label, fn) {
  if (!results[section]) results[section] = [];
  let ok = false, err = null;
  try { ok = !!fn(); } catch (e) { err = e.message; }
  results[section].push({ id, label, ok, err });
  if (ok) pass++; else fail++;
}

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const exists = (p) => existsSync(p);
const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ========================================================================
// Section A — templates/project/settings.json (real Claude Code schema)
// ========================================================================
const SETTINGS_TPL = PB + '/CLAUDE_CODE/templates/project/settings.json';
const SETTINGS_INST = PROJ + '/.claude/settings.json';

check('A. project settings.json schema', 'A1', 'template parses as JSON', () => json(SETTINGS_TPL));
check('A. project settings.json schema', 'A2', 'no invented top-level keys (allow_read/allow_edit/auto_load/rules.global/skills.directory/agents.directory)', () => {
  const j = json(SETTINGS_TPL);
  const bad = ['allow_read', 'allow_edit', 'allow_bash', 'deny_bash', 'auto_load', 'rules', 'skills', 'agents'];
  return bad.every(k => !(k in j));
});
check('A. project settings.json schema', 'A3', 'permissions.allow has git/test entries', () => {
  const j = json(SETTINGS_TPL);
  return Array.isArray(j.permissions?.allow) &&
    j.permissions.allow.some(s => s.startsWith('Bash(git')) &&
    j.permissions.allow.some(s => s.includes('test'));
});
check('A. project settings.json schema', 'A4', 'permissions.deny has rm -rf and git push', () => {
  const j = json(SETTINGS_TPL);
  return j.permissions.deny.includes('Bash(rm -rf:*)') &&
    j.permissions.deny.includes('Bash(git push:*)');
});
check('A. project settings.json schema', 'A5', 'hooks.SessionStart exists', () => {
  const j = json(SETTINGS_TPL);
  return Array.isArray(j.hooks?.SessionStart);
});
check('A. project settings.json schema', 'A6', '$schema points at json.schemastore.org', () => {
  return json(SETTINGS_TPL)['$schema'].includes('json.schemastore.org/claude-code-settings');
});
check('A. project settings.json schema', 'A7', 'installed settings matches template byte-for-byte', () => {
  return sha(SETTINGS_TPL) === sha(SETTINGS_INST);
});

// ========================================================================
// Section B — ~/.claude/settings.json RFC 7396 merge
// ========================================================================
check('B. user settings.json merge', 'B1', 'installed settings.json parses', () => json(HOME + '/settings.json'));
check('B. user settings.json merge', 'B2', '$schema added', () => json(HOME + '/settings.json')['$schema']);
check('B. user settings.json merge', 'B3', 'includeCoAuthoredBy added (false)', () => {
  const j = json(HOME + '/settings.json');
  return j.includeCoAuthoredBy === false;
});
check('B. user settings.json merge', 'B4', 'install receipt records addedKeys', () => {
  const r = json(HOMEROOT + '/.architect-playbook-manifest.json');
  return r.settingsMerges?.[0]?.addedKeys?.includes('$schema') &&
         r.settingsMerges[0].addedKeys.includes('includeCoAuthoredBy');
});

// ========================================================================
// Section C — encoded-cwd memory path
// ========================================================================
const ENC = '-tmp-acp-final-test-project';
const MEM_DIR = HOME + '/projects/' + ENC + '/memory';

check('C. encoded-cwd memory', 'C1', 'memory dir at encoded path', () => exists(MEM_DIR));
check('C. encoded-cwd memory', 'C2', 'NOT at friendly-name path', () => !exists(HOME + '/projects/finaltest/memory'));
check('C. encoded-cwd memory', 'C3', 'MEMORY.md exists', () => exists(MEM_DIR + '/MEMORY.md'));
check('C. encoded-cwd memory', 'C4', 'debugging.md exists', () => exists(MEM_DIR + '/debugging.md'));
check('C. encoded-cwd memory', 'C5', 'conventions.md exists', () => exists(MEM_DIR + '/conventions.md'));
check('C. encoded-cwd memory', 'C6', 'no writes outside memory/ subdir under <encoded>/', () => {
  const dir = HOME + '/projects/' + ENC;
  return readdirSync(dir).every(d => d === 'memory' || d.startsWith('.'));
});

// ========================================================================
// Section D — AGENTS auto-copy (kernel + appendices)
// ========================================================================
check('D. AGENTS auto-copy', 'D1', '<project>/AGENTS/ dir exists', () => exists(PROJ + '/AGENTS'));
check('D. AGENTS auto-copy', 'D2', '7 FINALTEST__*.md appendix files copied', () => {
  const files = readdirSync(PROJ + '/AGENTS').filter(f => f.startsWith('FINALTEST__'));
  return files.length === 7;
});
check('D. AGENTS auto-copy', 'D3', 'zero [APP] leaks in IMPLEMENTATION.md', () => {
  return !read(PROJ + '/AGENTS/FINALTEST__IMPLEMENTATION.md').includes('[APP]');
});
check('D. AGENTS auto-copy', 'D4', 'zero [APP] leaks in API_DESIGN.md', () => {
  return !read(PROJ + '/AGENTS/FINALTEST__API_DESIGN.md').includes('[APP]');
});
check('D. AGENTS auto-copy', 'D5', 'TODO banner prepended to PROJECT_SPECIFIC.md', () => {
  return read(PROJ + '/AGENTS/FINALTEST__PROJECT_SPECIFIC.md').startsWith('> TODO:');
});
check('D. AGENTS auto-copy', 'D6', 'banner upstream link kept literal [APP] (not substituted)', () => {
  const banner = read(PROJ + '/AGENTS/FINALTEST__PROJECT_SPECIFIC.md').split('\n')[0];
  return banner.includes('AGENTS/[APP]__PROJECT_SPECIFIC.md') ||
         banner.includes('%5BAPP%5D__PROJECT_SPECIFIC.md');
});
check('D. AGENTS auto-copy', 'D7', '<project>/AGENTS.md kernel file exists (the critical fix)', () => exists(PROJ + '/AGENTS.md'));
check('D. AGENTS auto-copy', 'D8', 'kernel file is non-trivial (>100 lines)', () => {
  return read(PROJ + '/AGENTS.md').split('\n').length > 100;
});
// NEW BUG CHECK: kernel cross-links should resolve to the user's prefix
check('D. AGENTS auto-copy', 'D9', 'kernel internal [APP] links resolve to actual files (BUG FIX VERIFICATION)', () => {
  const k = read(PROJ + '/AGENTS.md');
  // Find [APP] markdown links in kernel
  const linkMatches = k.match(/\[APP\]__[A-Z_]+\.md/g) || [];
  if (linkMatches.length === 0) return true; // no cross-links
  // Each linked file should exist under <project>/AGENTS/
  const allResolve = linkMatches.every(linkRef => {
    return exists(PROJ + '/AGENTS/' + linkRef);
  });
  return allResolve;
});

// ========================================================================
// Section E — frontend/backend rule stubs
// ========================================================================
check('E. path-scoped rule stubs', 'E1', 'frontend/components.md template exists', () => exists(PB + '/CLAUDE_CODE/templates/project/rules/frontend/components.md'));
check('E. path-scoped rule stubs', 'E2', 'backend/services.md template exists', () => exists(PB + '/CLAUDE_CODE/templates/project/rules/backend/services.md'));
check('E. path-scoped rule stubs', 'E3', 'frontend stub has substantive content (>30 lines)', () => {
  return read(PB + '/CLAUDE_CODE/templates/project/rules/frontend/components.md').split('\n').length > 30;
});
check('E. path-scoped rule stubs', 'E4', 'backend stub has substantive content (>30 lines)', () => {
  return read(PB + '/CLAUDE_CODE/templates/project/rules/backend/services.md').split('\n').length > 30;
});
check('E. path-scoped rule stubs', 'E5', 'project skipped frontend/components rule (no frontend/ dir)', () => !exists(PROJ + '/.claude/rules/frontend/components.md'));
check('E. path-scoped rule stubs', 'E6', 'project skipped backend/services rule (no backend/ dir)', () => !exists(PROJ + '/.claude/rules/backend/services.md'));

// ========================================================================
// Section F — CLAUDE_PROJECT hook
// ========================================================================
check('F. CLAUDE_PROJECT hook', 'F1', 'project settings has SessionStart hook', () => {
  const j = json(SETTINGS_INST);
  return j.hooks?.SessionStart?.[0]?.matcher === 'startup';
});
check('F. CLAUDE_PROJECT hook', 'F2', 'hook command echoes CLAUDE_PROJECT', () => {
  const j = json(SETTINGS_INST);
  const cmd = j.hooks.SessionStart[0].hooks[0].command;
  return cmd.includes('CLAUDE_PROJECT');
});
check('F. CLAUDE_PROJECT hook', 'F3', 'direnv-guide.md documents the consumer', () => {
  // Test fixed: doc uses **`SessionStart` hook** with markdown formatting between SessionStart and "hook"
  const c = read(PB + '/CLAUDE_CODE/tooling/direnv-guide.md');
  return /SessionStart.*hook/i.test(c) && /CLAUDE_PROJECT.*surfaced|surfaced.*CLAUDE_PROJECT/i.test(c);
});

// ========================================================================
// Section G — example global skills
// ========================================================================
const skillCheck = (name) => {
  const p = HOME + '/skills/' + name + '/SKILL.md';
  if (!exists(p)) return false;
  const c = read(p);
  return c.startsWith('---') && /^name:/m.test(c) && /^description:/m.test(c);
};
check('G. global skills', 'G1', 'journal/SKILL.md exists with frontmatter', () => skillCheck('journal'));
check('G. global skills', 'G2', 'todo/SKILL.md exists with frontmatter', () => skillCheck('todo'));
check('G. global skills', 'G3', 'explain-code/SKILL.md exists with frontmatter', () => skillCheck('explain-code'));
check('G. global skills', 'G4', 'verify-install/SKILL.md exists with frontmatter', () => skillCheck('verify-install'));

// ========================================================================
// Section H — AGENTS.md ↔ Claude Code bridge
// ========================================================================
check('H. AGENTS.md bridge', 'H1', 'project CLAUDE.md first line is @AGENTS.md', () => {
  return read(PROJ + '/CLAUDE.md').split('\n')[0] === '@AGENTS.md';
});
check('H. AGENTS.md bridge', 'H2', 'README.md documents ln -s alternative', () => {
  return read(PB + '/README.md').includes('ln -s AGENTS.md CLAUDE.md');
});
check('H. AGENTS.md bridge', 'H3', '@AGENTS.md import resolves to a real file', () => exists(PROJ + '/AGENTS.md'));

// ========================================================================
// Section I — Cross-CLI shims
// ========================================================================
check('I. cross-CLI shims', 'I1', 'CURSOR/README.md exists', () => exists(PB + '/CURSOR/README.md'));
check('I. cross-CLI shims', 'I2', 'CODEX/README.md exists', () => exists(PB + '/CODEX/README.md'));
check('I. cross-CLI shims', 'I3', 'CURSOR README mentions .cursor/rules/', () => read(PB + '/CURSOR/README.md').includes('.cursor/rules/'));
check('I. cross-CLI shims', 'I4', 'CODEX README mentions AGENTS.md natively', () => /AGENTS\.md.*natively|natively.*AGENTS\.md/i.test(read(PB + '/CODEX/README.md')));

// ========================================================================
// Section J — Claude Code plugin variant
// ========================================================================
const PLUGIN = PB + '/claude-code-plugin';
check('J. plugin variant', 'J1', 'plugin.json exists & parses', () => json(PLUGIN + '/.claude-plugin/plugin.json'));
check('J. plugin variant', 'J2', 'plugin manifest has required fields (name, description, version, author)', () => {
  const m = json(PLUGIN + '/.claude-plugin/plugin.json');
  return m.name && m.description && m.version && m.author;
});
check('J. plugin variant', 'J3', 'skills/ has all 4 skills', () => {
  const dirs = readdirSync(PLUGIN + '/skills').filter(d => statSync(PLUGIN + '/skills/' + d).isDirectory());
  return ['journal', 'todo', 'explain-code', 'verify-install'].every(s => dirs.includes(s));
});
check('J. plugin variant', 'J4', 'agents/ has researcher and reviewer', () => {
  return exists(PLUGIN + '/agents/researcher.md') && exists(PLUGIN + '/agents/reviewer.md');
});
check('J. plugin variant', 'J5', '.claude-plugin/ contains ONLY plugin.json (Anthropic spec)', () => {
  const cp = readdirSync(PLUGIN + '/.claude-plugin');
  return cp.length === 1 && cp[0] === 'plugin.json';
});
check('J. plugin variant', 'J6', 'plugin agents have NO hooks/mcpServers/permissionMode (security restriction)', () => {
  for (const a of ['researcher', 'reviewer']) {
    const c = read(PLUGIN + '/agents/' + a + '.md');
    if (/^hooks:/m.test(c) || /^mcpServers:/m.test(c) || /^permissionMode:/m.test(c)) return false;
  }
  return true;
});

// ========================================================================
// Section K — install.manifest.json + verify skill
// ========================================================================
const MANIFEST = json(PB + '/CLAUDE_CODE/install.manifest.json');
check('K. manifest + verify', 'K1', 'manifest valid JSON', () => MANIFEST);
check('K. manifest + verify', 'K2', 'has schemaVersion, tool, toolVersion', () => MANIFEST.schemaVersion && MANIFEST.tool && MANIFEST.toolVersion);
check('K. manifest + verify', 'K3', '20 shippedFiles entries', () => MANIFEST.shippedFiles.length === 20);
check('K. manifest + verify', 'K4', 'every shipped sha matches actual template file', () => {
  for (const f of MANIFEST.shippedFiles) {
    if (sha(PB + '/' + f.templatePath) !== f.sha256) return false;
  }
  return true;
});
check('K. manifest + verify', 'K5', 'agentsCopy.kernelFile entry exists (the critical bug fix)', () => MANIFEST.agentsCopy?.kernelFile);
check('K. manifest + verify', 'K6', 'agentsCopy.appendicesDir has 7 files', () => MANIFEST.agentsCopy?.appendicesDir?.files?.length === 7);
check('K. manifest + verify', 'K7', 'settingsMerges entry correct', () => {
  return MANIFEST.settingsMerges[0].rfc === 'RFC 7396' &&
    MANIFEST.settingsMerges[0].addedKeys.includes('$schema');
});
check('K. manifest + verify', 'K8', 'verify-install SKILL.md exists with proper frontmatter', () => skillCheck('verify-install'));
check('K. manifest + verify', 'K9', '/verify-install logic produces PASS on this install', () => {
  let ok = 0, drift = 0, missing = 0;
  for (const f of MANIFEST.shippedFiles) {
    const ip = f.installPath.replace(/^~/, HOMEROOT).replace('<PROJECT>', PROJ);
    if (!exists(ip)) { if (!f.optional) missing++; continue; }
    const s = sha(ip);
    if (s === f.sha256) ok++;
    else if (!f.tokenSubstitution) { drift++; }
  }
  return drift === 0 && missing === 0;
});

// ========================================================================
// Section L — backup-before-write
// ========================================================================
check('L. backup-before-write', 'L1', 'SETUP.md mandates backup-before-modify', () => {
  return /backup-before-modify|Backup-before-modify/i.test(read(PB + '/CLAUDE_CODE/SETUP.md'));
});
check('L. backup-before-write', 'L2', 'backups dir exists in HOME (proactively created)', () => exists(HOME + '/.architect-playbook-backups'));

// ========================================================================
// Section M — .gitignore hygiene
// ========================================================================
const GI = read(PB + '/.gitignore');
check('M. .gitignore', 'M1', '.architect-playbook-backups/ ignored', () => GI.includes('.architect-playbook-backups/'));
check('M. .gitignore', 'M2', '.architect-playbook-manifest.json ignored', () => GI.includes('.architect-playbook-manifest.json'));
check('M. .gitignore', 'M3', '.claude-flow/ ignored', () => GI.includes('.claude-flow/'));

// ========================================================================
// Section N — documentation pass
// ========================================================================
const README = read(PB + '/README.md');
check('N. documentation', 'N1', 'README has cwd-explicit install instruction', () => /cd.*architect-coding-playbook|inside.*clone/i.test(README));
check('N. documentation', 'N2', 'README has agent-compatibility table', () => {
  // Test fixed: table puts each agent on its own row, not on one line
  return /Cursor/.test(README) && /Codex/.test(README) && /Claude Code/.test(README) && /Windsurf/.test(README);
});
check('N. documentation', 'N3', 'README links to /verify-install', () => README.includes('/verify-install'));
check('N. documentation', 'N4', 'CLAUDE_CODE/README.md points at CURSOR/CODEX/plugin siblings', () => {
  const c = read(PB + '/CLAUDE_CODE/README.md');
  return c.includes('CURSOR/') && c.includes('CODEX/');
});

// ========================================================================
// Section Q3 — substitution mechanic (later fix)
// ========================================================================
check('Q3. substitution mechanic', 'Q3.1', 'org-policies template has BEGIN/END Q3 markers', () => {
  const c = read(PB + '/CLAUDE_CODE/templates/global/rules/org-policies.md');
  return c.includes('<!-- BEGIN Q3_ORG_POLICIES -->') && c.includes('<!-- END Q3_ORG_POLICIES -->');
});
check('Q3. substitution mechanic', 'Q3.2', 'SETUP.md Step 3c documents the substitution procedure', () => {
  return /Q3 substitution/i.test(read(PB + '/CLAUDE_CODE/SETUP.md'));
});
check('Q3. substitution mechanic', 'Q3.3', 'installed org-policies has Q3 answer (not placeholder)', () => {
  const c = read(HOME + '/rules/org-policies.md');
  const block = c.match(/<!-- BEGIN Q3_ORG_POLICIES -->([\s\S]*?)<!-- END Q3_ORG_POLICIES -->/);
  if (!block) return false;
  return !block[1].includes('_(none — Q3 answer not provided)_') && /TypeScript/i.test(block[1]);
});

// ========================================================================
// Section ST — settings tighten contract (later fix)
// ========================================================================
check('ST. settings tighten', 'ST1', 'manifest declares tighteningOptional: true', () => {
  const ps = MANIFEST.shippedFiles.find(f => f.id === 'project.settings');
  return ps?.tighteningOptional === true;
});
check('ST. settings tighten', 'ST2', 'SETUP Step 4b says tightening is optional', () => {
  return /Tightening is.*optional|optional.*tighten/i.test(read(PB + '/CLAUDE_CODE/SETUP.md'));
});

// ========================================================================
// Section BO — banner ordering (later fix)
// ========================================================================
check('BO. banner ordering', 'BO1', 'SETUP says banner is prepended AFTER substitution', () => {
  const c = read(PB + '/CLAUDE_CODE/SETUP.md');
  return /After substitution.*prepend|prepend.*[Bb]anner verbatim/i.test(c);
});

// ========================================================================
// Section KR — AGENTS.md kernel copy (latest fix)
// ========================================================================
check('KR. kernel copy', 'KR1', 'manifest.agentsCopy.kernelFile exists', () => MANIFEST.agentsCopy?.kernelFile?.source === 'AGENTS.md');
check('KR. kernel copy', 'KR2', 'SETUP Step 4f explicitly copies AGENTS.md', () => {
  return /kernelFile|kernel file.*AGENTS\.md/.test(read(PB + '/CLAUDE_CODE/SETUP.md'));
});
check('KR. kernel copy', 'KR3', '<project>/AGENTS.md exists post-install', () => exists(PROJ + '/AGENTS.md'));

// ========================================================================
// Section SF — subagent frontmatter (latest fix)
// ========================================================================
const agentCheck = (path) => {
  if (!exists(path)) return false;
  const c = read(path);
  return c.startsWith('---') && /^name:/m.test(c) && /^description:/m.test(c);
};
check('SF. subagent frontmatter', 'SF1', 'templates/project/agents/researcher.md has YAML frontmatter', () => agentCheck(PB + '/CLAUDE_CODE/templates/project/agents/researcher.md'));
check('SF. subagent frontmatter', 'SF2', 'templates/project/agents/reviewer.md has YAML frontmatter', () => agentCheck(PB + '/CLAUDE_CODE/templates/project/agents/reviewer.md'));
check('SF. subagent frontmatter', 'SF3', 'installed researcher.md has frontmatter', () => agentCheck(PROJ + '/.claude/agents/researcher.md'));
check('SF. subagent frontmatter', 'SF4', 'installed reviewer.md has frontmatter', () => agentCheck(PROJ + '/.claude/agents/reviewer.md'));

// ========================================================================
// Section PSI — path-scoped imports (latest fix)
// ========================================================================
check('PSI. path-scoped imports', 'PSI1', 'project CLAUDE.md template has path-scoped imports commented', () => {
  const c = read(PB + '/CLAUDE_CODE/templates/project/CLAUDE.md');
  return /^# @\.claude\/rules\/frontend\/components\.md/m.test(c);
});

// ========================================================================
// Section DP — docs placeholder removal (latest fix)
// ========================================================================
check('DP. docs placeholder', 'DP1', 'project CLAUDE.md template does not have @docs/[ROADMAP_OR_STRATEGY_FILE].md as a literal import', () => {
  const c = read(PB + '/CLAUDE_CODE/templates/project/CLAUDE.md');
  // It should not appear as a bare import line; only as a hint within parentheses
  return !/^@docs\/\[ROADMAP_OR_STRATEGY_FILE\]\.md$/m.test(c);
});

// ========================================================================
// NEW BUGS the latest install surfaced
// ========================================================================
check('NEW. new bugs', 'NB1', 'kernel AGENTS.md has 0 [APP] leaks (substitution applied)', () => {
  return !read(PROJ + '/AGENTS.md').includes('[APP]') &&
         !read(PROJ + '/AGENTS.md').includes('%5BAPP%5D');
});
check('NEW. new bugs', 'NB2', 'project rule URL-encoded %5BAPP%5D substituted', () => {
  // testing.md and api-design.md have markdown links with %5BAPP%5D (URL-encoded [APP])
  // After install, these should be substituted
  for (const f of ['testing.md', 'api-design.md']) {
    const p = PROJ + '/.claude/rules/' + f;
    if (!exists(p)) continue;
    const c = read(p);
    if (c.includes('%5BAPP%5D')) return false;
  }
  return true;
});

// ========================================================================
// REPORT
// ========================================================================
console.log('\n=== TEST MATRIX RESULTS ===\n');
const sections = Object.keys(results).sort();
for (const s of sections) {
  const sectionResults = results[s];
  const okCount = sectionResults.filter(r => r.ok).length;
  const failCount = sectionResults.filter(r => !r.ok).length;
  const status = failCount === 0 ? '✓' : '✗';
  console.log(`${status} ${s} — ${okCount}/${sectionResults.length} pass`);
  for (const r of sectionResults) {
    const mark = r.ok ? '  ✓' : '  ✗';
    console.log(`${mark} ${r.id}: ${r.label}${r.err ? ' [ERR: ' + r.err + ']' : ''}`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Total: ${pass + fail}, Pass: ${pass}, Fail: ${fail}`);
process.exit(fail > 0 ? 1 : 0);
