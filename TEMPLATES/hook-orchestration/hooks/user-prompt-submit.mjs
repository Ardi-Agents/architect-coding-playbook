#!/usr/bin/env node
// UserPromptSubmit hook — keyword routing + memory injection + trajectory-start.
// Event: { session_id, event: "UserPromptSubmit", payload: { prompt: "..." } }
//
// Fail-open. Emits a routing recommendation to stdout as JSON.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'

const STATE_DIR = process.env.CLAUDE_STATE_DIR || '.claude/state'

// CUSTOMIZE: extend with your project's agent roster + patterns.
const PATTERNS = [
  { re: /\b(implement|create|build|write|add)\b.*\b(function|class|module|endpoint|component)\b/i, agent: 'coder',      base: 0.80 },
  { re: /\b(test|testing|coverage|unit test|integration test)\b/i,                                  agent: 'tester',     base: 0.80 },
  { re: /\b(review|audit|quality check|code smell)\b/i,                                             agent: 'reviewer',   base: 0.80 },
  { re: /\b(design|architect|architecture|system design|pattern)\b/i,                               agent: 'architect',  base: 0.80 },
  { re: /\b(bug|broken|failing|error|crash|stack trace)\b/i,                                        agent: 'debugger',   base: 0.80 },
  { re: /\b(research|investigate|explore|find out|survey)\b/i,                                      agent: 'researcher', base: 0.75 },
  { re: /\b(deploy|\bCI\b|\bCD\b|docker|pipeline|infrastructure)\b/i,                               agent: 'devops',     base: 0.75 },
  { re: /\b(API|REST|endpoint|graphql|schema)\b/i,                                                  agent: 'backend',    base: 0.75 },
  { re: /\b(UI|component|react|frontend|CSS|style)\b/i,                                             agent: 'frontend',   base: 0.75 },
]

function route (prompt) {
  const matches = PATTERNS
    .map(p => ({ p, matched: p.re.test(prompt) }))
    .filter(x => x.matched)
  if (matches.length === 0) {
    return {
      primary: { agent: 'general-purpose', confidence: 0.50, reason: 'no pattern matched — default' },
      alternatives: [],
      metadata: { routing_method: 'keyword-fallback', complexity: 'unknown' },
    }
  }
  const [first, ...rest] = matches
  const bump = Math.min(matches.length - 1, 3) * 0.05
  return {
    primary: {
      agent: first.p.agent,
      confidence: Math.min(0.90, first.p.base + bump),
      reason: `matched: ${first.p.re.source.slice(0, 60)}`,
    },
    alternatives: rest.slice(0, 2).map(m => ({
      agent: m.p.agent, confidence: m.p.base - 0.10, reason: 'secondary match',
    })),
    metadata: { routing_method: 'keyword', complexity: prompt.length < 40 ? 'low' : 'medium' },
  }
}

function readStdinJson () {
  return new Promise(resolve => {
    let raw = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', c => { raw += c })
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
    setTimeout(() => resolve({}), 50)
  })
}

async function main () {
  const event = await readStdinJson()
  const prompt = event.payload?.prompt || ''
  const sessionId = event.session_id || 'unknown'

  const recommendation = route(prompt)

  // Start a trajectory. CUSTOMIZE: write to your durable store instead of .state.
  try {
    await mkdir(join(STATE_DIR, 'trajectories'), { recursive: true })
    const trajId = randomUUID()
    const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 16)
    await writeFile(join(STATE_DIR, 'trajectories', `${trajId}.json`), JSON.stringify({
      id: trajId,
      session_id: sessionId,
      prompt_hash: promptHash,
      started_at: new Date().toISOString(),
      agent: recommendation.primary.agent,
      steps: [],
    }))
  } catch (err) {
    process.stderr.write(`[harness] trajectory-start failed: ${err.message}\n`)
  }

  process.stdout.write(JSON.stringify({ routing: recommendation }) + '\n')
  process.exit(0)
}

main()
