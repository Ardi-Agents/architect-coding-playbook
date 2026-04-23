#!/usr/bin/env node
// Session idle detector — scans a session store and transitions
// sessions through the state machine: active → idle → completed.
//
// Storage contract: one JSON file per session under SESSION_STORE_DIR,
// shape: { session_id, state, last_activity, ... }. Replace with your
// backend (SQLite, Postgres, Redis) via the `loadSessions` and
// `saveSession` functions.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const STORE = process.env.SESSION_STORE_DIR || '.inspector/sessions'
const IDLE_MINUTES      = Number(process.env.IDLE_MINUTES || 30)
const COMPLETED_HOURS   = Number(process.env.COMPLETED_HOURS || 2)
const SCAN_SECONDS      = Number(process.env.SCAN_SECONDS || 60)

async function ensureStore () {
  if (!existsSync(STORE)) await mkdir(STORE, { recursive: true })
}

async function loadSessions () {
  const files = (await readdir(STORE)).filter(f => f.endsWith('.json'))
  const out = []
  for (const f of files) {
    try { out.push({ file: join(STORE, f), data: JSON.parse(await readFile(join(STORE, f), 'utf8')) }) }
    catch { /* skip malformed */ }
  }
  return out
}

async function saveSession (file, data) {
  await writeFile(file, JSON.stringify(data, null, 2))
}

function minutesSince (iso) {
  const then = new Date(iso).getTime()
  return (Date.now() - then) / 60000
}

async function scan () {
  const sessions = await loadSessions()
  for (const s of sessions) {
    const mins = minutesSince(s.data.last_activity || s.data.started_at || new Date().toISOString())
    const previousState = s.data.state || 'active'
    let newState = previousState

    if (previousState === 'active' && mins >= IDLE_MINUTES) newState = 'idle'
    if (previousState === 'idle' && mins >= COMPLETED_HOURS * 60) newState = 'completed'

    if (newState !== previousState) {
      s.data.state = newState
      s.data.state_changed_at = new Date().toISOString()
      await saveSession(s.file, s.data)
      process.stdout.write(JSON.stringify({
        event: 'session_state_change',
        session_id: s.data.session_id,
        from: previousState,
        to: newState,
        inactive_minutes: Math.round(mins),
      }) + '\n')
    }
  }
}

async function main () {
  await ensureStore()
  process.stdout.write(`[idle-detector] scanning ${STORE} every ${SCAN_SECONDS}s (idle=${IDLE_MINUTES}m, completed=${COMPLETED_HOURS}h)\n`)
  // Initial scan immediately, then on interval.
  await scan().catch(err => process.stderr.write(`scan error: ${err.message}\n`))
  setInterval(() => {
    scan().catch(err => process.stderr.write(`scan error: ${err.message}\n`))
  }, SCAN_SECONDS * 1000)
}

main()
