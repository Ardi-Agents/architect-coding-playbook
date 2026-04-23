#!/usr/bin/env node
// PreCompact hook — proactive archival before context compaction.
// Event: { session_id, event: "PreCompact", payload: { transcript?: string, reason?: string } }
//
// Fail-open (observational). Persists session state under .claude/state/archive.

import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const STATE_DIR = process.env.CLAUDE_STATE_DIR || '.claude/state'

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

async function collectTrajectories (sessionId) {
  const dir = join(STATE_DIR, 'trajectories')
  if (!existsSync(dir)) return []
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'))
  const out = []
  for (const f of files) {
    try {
      const t = JSON.parse(await readFile(join(dir, f), 'utf8'))
      if (t.session_id === sessionId) out.push(t)
    } catch {
      // ignore malformed entries
    }
  }
  return out
}

async function main () {
  const event = await readStdinJson()
  const sessionId = event.session_id || 'unknown'
  const reason = event.payload?.reason || 'compact'

  try {
    const archiveDir = join(STATE_DIR, 'archive', sessionId)
    await mkdir(archiveDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const trajectories = await collectTrajectories(sessionId)

    const snapshot = {
      session_id: sessionId,
      archived_at: new Date().toISOString(),
      reason,
      transcript_length: (event.payload?.transcript || '').length,
      trajectories_included: trajectories.length,
      trajectories,
    }
    await writeFile(join(archiveDir, `${stamp}.json`), JSON.stringify(snapshot))
    process.stdout.write(JSON.stringify({ archived: true, path: join(archiveDir, `${stamp}.json`), trajectories: trajectories.length }) + '\n')
  } catch (err) {
    process.stderr.write(`[harness] pre-compact failed: ${err.message}\n`)
  }
  process.exit(0)
}

main()
