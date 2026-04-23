// Structured report writer + terminal pretty-printer.
// - writeReport(path, report): persist JSON
// - printReport(report): colored terminal summary
// - CLI: `node report.mjs --pretty <file>` to re-render a past run

import { writeFile, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { mkdir } from 'node:fs/promises'

const C = {
  reset: '\x1b[0m',
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
  red:   '\x1b[31m',
  grn:   '\x1b[32m',
  ylw:   '\x1b[33m',
  blu:   '\x1b[34m',
  mag:   '\x1b[35m',
}

export async function writeReport (path, report) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(report, null, 2))
  return path
}

export function printReport (report) {
  const { summary, scripts } = report
  const status = summary.failed === 0 && summary.invariant_failures === 0 ? 'PASSED' : 'FAILED'
  const statusColor = status === 'PASSED' ? C.grn : C.red

  console.log()
  console.log(`${C.bold}E2E Harness Report${C.reset}  ${C.dim}run_id=${report.run_id}${C.reset}`)
  console.log(`${C.dim}${report.started_at} → ${report.ended_at}${C.reset}`)
  console.log()

  for (const s of scripts) {
    const icon = s.status === 'passed' ? `${C.grn}✓${C.reset}` : `${C.red}✗${C.reset}`
    const dur = `${C.dim}${s.duration_ms}ms${C.reset}`
    console.log(`  ${icon} [${s.kind}] ${s.name} ${dur}`)
    const failedAsserts = (s.assertions || []).filter(a => !a.passed)
    for (const a of failedAsserts) {
      console.log(`      ${C.red}• ${a.hint}${C.reset}  ${C.dim}actual=${fmt(a.actual)} expected=${fmt(a.expected)}${C.reset}`)
    }
    const failedInvs = (s.invariants || []).filter(i => i.status !== 'passed')
    for (const i of failedInvs) {
      console.log(`      ${C.mag}⚠ invariant: ${i.name} [${i.status}]${C.reset}`)
      for (const r of i.results.filter(x => !x.passed)) {
        console.log(`          ${C.red}• ${r.hint}${C.reset}  ${C.dim}actual=${fmt(r.actual)} expected=${fmt(r.expected)}${C.reset}`)
      }
    }
  }

  console.log()
  console.log(`${statusColor}${C.bold}${status}${C.reset}  total=${summary.total}  passed=${summary.passed}  failed=${summary.failed}  invariant_failures=${summary.invariant_failures}`)
  console.log()
}

function fmt (v) {
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return JSON.stringify(v.slice(0, 80))
  return JSON.stringify(v).slice(0, 120)
}

// CLI: node report.mjs --pretty <file>
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  if (args[0] === '--pretty' && args[1]) {
    const report = JSON.parse(await readFile(args[1], 'utf8'))
    printReport(report)
  } else {
    console.log('Usage: node report.mjs --pretty <report.json>')
    process.exit(64)
  }
}
