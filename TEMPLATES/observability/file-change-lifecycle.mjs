// File-change lifecycle: tracked → pending → resolved.
// Exports three operations that wrap the lifecycle. Persistence is pluggable:
// the default is a JSONL file under .inspector/file-changes/. Replace with
// your inspector core's storage layer.

import { appendFile, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const STORE_DIR = process.env.FILE_CHANGE_DIR || '.inspector/file-changes'
const LEDGER    = join(STORE_DIR, 'ledger.jsonl')

async function ensureStore () {
  if (!existsSync(STORE_DIR)) await mkdir(STORE_DIR, { recursive: true })
}

function contentHash (s) {
  return createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
}

async function writeBlob (hash, content) {
  const path = join(STORE_DIR, 'blobs', `${hash}.txt`)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  return path
}

async function append (record) {
  await ensureStore()
  await appendFile(LEDGER, JSON.stringify(record) + '\n')
}

/** State 1: Tracked — snapshot the pre-change content. */
export async function recordTracked ({ executionId, filePath, before }) {
  const snapshotHash = contentHash(before)
  await writeBlob(snapshotHash, before)
  await append({
    state: 'tracked',
    execution_id: executionId,
    file_path: filePath,
    snapshot_hash: snapshotHash,
    at: new Date().toISOString(),
  })
  return { executionId, filePath, snapshotHash }
}

/** State 2: Pending — record the post-change content and diff digest. */
export async function markPending ({ executionId, filePath, after, snapshotHash }) {
  const afterHash = contentHash(after)
  await writeBlob(afterHash, after)
  await append({
    state: 'pending',
    execution_id: executionId,
    file_path: filePath,
    snapshot_hash: snapshotHash,
    after_hash: afterHash,
    at: new Date().toISOString(),
  })
  return { executionId, filePath, snapshotHash, afterHash }
}

/** State 3: Resolved — keep (archive) or revert (restore snapshot). */
export async function resolve ({ executionId, filePath, outcome, reason = null }) {
  if (!['kept', 'reverted'].includes(outcome)) {
    throw new Error(`invalid outcome: ${outcome} (expected kept|reverted)`)
  }
  await append({
    state: 'resolved',
    execution_id: executionId,
    file_path: filePath,
    outcome,
    reason,
    at: new Date().toISOString(),
  })
  return { executionId, filePath, outcome }
}

/** Utility: list pending changes from the ledger. */
export async function listPending () {
  if (!existsSync(LEDGER)) return []
  const lines = (await readFile(LEDGER, 'utf8')).split('\n').filter(Boolean)
  const byExec = new Map()
  for (const line of lines) {
    try {
      const rec = JSON.parse(line)
      byExec.set(rec.execution_id, rec)
    } catch { /* skip malformed */ }
  }
  return [...byExec.values()].filter(r => r.state === 'pending')
}

// CLI smoke: `node file-change-lifecycle.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const id = `test-${Date.now()}`
  await recordTracked({ executionId: id, filePath: '/tmp/example.txt', before: 'hello' })
  await markPending({ executionId: id, filePath: '/tmp/example.txt', after: 'hello world', snapshotHash: contentHash('hello') })
  await resolve({ executionId: id, filePath: '/tmp/example.txt', outcome: 'kept' })
  console.log(`[lifecycle] wrote sample tracked → pending → resolved records to ${LEDGER}`)
}
