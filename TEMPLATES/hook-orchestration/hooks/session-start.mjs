#!/usr/bin/env node
// SessionStart hook — warm caches and announce.
// Event: { session_id, event: "SessionStart", payload: {...} }
//
// Safe to fail (fail-open): logs a warning on failure and exits 0 so the session continues.

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const MEMORY_DIR = process.env.CLAUDE_MEMORY_DIR || '.claude/memory'
const STATE_DIR  = process.env.CLAUDE_STATE_DIR  || '.claude/state'

async function importMemories () {
  // CUSTOMIZE: swap for your memory backend (SQLite, vector DB, remote store).
  if (!existsSync(MEMORY_DIR)) return { count: 0 }
  const files = (await readdir(MEMORY_DIR)).filter(f => f.endsWith('.md'))
  return { count: files.length, files }
}

async function warmGraph () {
  // CUSTOMIZE: call your graph MCP server or a local cache builder.
  // For now, just check for GRAPH_REPORT.md as a presence indicator.
  const hints = ['graphify-out/GRAPH_REPORT.md', 'graph-out/GRAPH_REPORT.md']
  for (const h of hints) if (existsSync(h)) return { present: true, path: h }
  return { present: false }
}

async function ensureStateDir () {
  await mkdir(STATE_DIR, { recursive: true })
}

function readStdinJson () {
  return new Promise(resolve => {
    let raw = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', c => { raw += c })
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
    // If no stdin is piped, resolve quickly.
    setTimeout(() => resolve({}), 50)
  })
}

async function main () {
  const event = await readStdinJson()
  const sessionId = event.session_id || 'unknown'

  try {
    await ensureStateDir()
    const mem   = await importMemories()
    const graph = await warmGraph()

    // CUSTOMIZE: count recent trajectories from your store.
    const trajectories = { count: 0 }

    const status = `[harness] session=${sessionId.slice(0, 8)} memories=${mem.count} graph=${graph.present ? 'ready' : 'n/a'} trajectories=${trajectories.count}`
    process.stdout.write(JSON.stringify({ status }) + '\n')

    // Persist a marker for session-end.
    await writeFile(join(STATE_DIR, `session-${sessionId}.start.json`), JSON.stringify({
      session_id: sessionId, started_at: new Date().toISOString(), memories_loaded: mem.count,
    }))
  } catch (err) {
    process.stderr.write(`[harness] session-start: ${err.message}\n`)
  }
  process.exit(0) // fail-open
}

main()
