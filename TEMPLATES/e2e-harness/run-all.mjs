#!/usr/bin/env node
// E2E harness orchestrator.
// Runs happy scripts in order (numeric prefix), then edges in parallel,
// writes a JSON report, and exits 0/1/2 based on severity.

import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

import expect from './lib/expect.mjs'
import invariantsApi from './lib/invariants.mjs'
import { createClient } from './lib/api.mjs'
import { writeReport, printReport } from './lib/report.mjs'

const { runInvariants } = invariantsApi

const __dirname = dirname(fileURLToPath(import.meta.url))

async function listScripts (dir) {
  try {
    const files = await readdir(dir)
    return files
      .filter(f => f.endsWith('.mjs') && !f.endsWith('.example'))
      .sort()
      .map(f => ({ name: f.replace(/\.mjs$/, ''), path: join(dir, f) }))
  } catch {
    return []
  }
}

async function runScript (script, kind, ctx) {
  const start = Date.now()
  const mod = await import(pathToFileURL(script.path).href)
  const fn = mod.default
  if (typeof fn !== 'function') {
    return {
      name: script.name, kind,
      assertions: [{ passed: false, hint: `missing default export`, actual: typeof fn, expected: 'function' }],
      invariants: [],
      duration_ms: 0,
      status: 'failed',
    }
  }
  try {
    const { assertions = [], invariants = [] } = await fn(ctx)
    const status = assertions.every(a => a.passed) && invariants.every(i => i.status === 'passed') ? 'passed' : 'failed'
    return { name: script.name, kind, assertions, invariants, duration_ms: Date.now() - start, status }
  } catch (err) {
    return {
      name: script.name, kind,
      assertions: [{ passed: false, hint: 'script threw', actual: String(err), expected: 'no throw' }],
      invariants: [],
      duration_ms: Date.now() - start,
      status: 'failed',
    }
  }
}

async function main (argv) {
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null
  const help = argv.includes('--help')

  if (help) {
    console.log(`Usage: node run-all.mjs [--only happy|edges]`)
    console.log(``)
    console.log(`Runs numbered happy scripts in order, then edge scripts in parallel.`)
    console.log(`Writes report to output/run-<timestamp>.json.`)
    console.log(``)
    console.log(`Exit codes:`)
    console.log(`  0  all passed`)
    console.log(`  1  assertion failure`)
    console.log(`  2  invariant failure`)
    process.exit(0)
  }

  const api = createClient({ baseUrl: process.env.E2E_BASE_URL })
  const ctx = { api, expect, runInvariants, invariants: invariantsApi }

  const report = {
    run_id: randomUUID(),
    started_at: new Date().toISOString(),
    ended_at: null,
    scripts: [],
    summary: { total: 0, passed: 0, failed: 0, invariant_failures: 0 },
  }

  // Happy scripts: numbered, sequential.
  if (!only || only === 'happy') {
    const happy = await listScripts(join(__dirname, 'happy'))
    for (const s of happy) {
      const r = await runScript(s, 'happy', ctx)
      report.scripts.push(r)
      if (r.status === 'failed') break // halt happy chain on first failure
    }
  }

  // Edge scripts: order-independent, parallel.
  if (!only || only === 'edges') {
    const edges = await listScripts(join(__dirname, 'edges'))
    const results = await Promise.all(edges.map(s => runScript(s, 'edge', ctx)))
    report.scripts.push(...results)
  }

  // Summary.
  for (const s of report.scripts) {
    report.summary.total++
    if (s.status === 'passed') report.summary.passed++
    else report.summary.failed++
    report.summary.invariant_failures += (s.invariants || []).filter(i => i.status !== 'passed').length
  }
  report.ended_at = new Date().toISOString()

  const path = join(__dirname, 'output', `run-${Date.now()}.json`)
  await writeReport(path, report)
  printReport(report)
  console.log(`report: ${path}`)

  if (report.summary.invariant_failures > 0) process.exit(2)
  if (report.summary.failed > 0) process.exit(1)
  process.exit(0)
}

main(process.argv.slice(2)).catch(err => {
  console.error('harness crashed:', err)
  process.exit(3)
})
