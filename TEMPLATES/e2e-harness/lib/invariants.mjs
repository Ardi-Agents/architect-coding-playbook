// Business-rule invariants.
//
// Invariants are statements about state that must remain true regardless of
// the sequence of operations that produced it. Add yours below.
//
// Each invariant is an async function that returns an array of expect results.
// The harness treats invariant failures with elevated severity in reports.

import expect from './expect.mjs'

/**
 * No soft-deleted row ever appears in a list endpoint.
 * Adapt: replace listEndpoint and the filter with your system's equivalents.
 */
export async function softDeletedRowsInvisibleInList ({ api, model = 'items', listEndpoint = '/items' }) {
  const results = []
  const list = await api.get(listEndpoint).catch(() => ({ data: [] }))
  const rows = Array.isArray(list.data) ? list.data : []
  const leaked = rows.filter(r => r.deleted_at !== null && r.deleted_at !== undefined)
  results.push(expect.hasLength(leaked, 0, `${model}: no soft-deleted rows in list`))
  return results
}

/**
 * All timestamps in responses are ISO-8601 with trailing Z (the kernel UTC contract).
 * Adapt: extend the field list to your schemas.
 */
export async function timestampsAreUtcZ ({ api, endpoint, timestampFields = ['created_at', 'updated_at'] }) {
  const results = []
  const response = await api.get(endpoint).catch(() => ({ data: [] }))
  const rows = Array.isArray(response.data) ? response.data : [response.data]
  for (const row of rows.slice(0, 10)) {
    if (!row) continue
    for (const field of timestampFields) {
      if (row[field] !== undefined && row[field] !== null) {
        results.push(expect.isIsoUtc(row[field], `${endpoint}: ${field} is ISO-8601 UTC`))
      }
    }
  }
  return results
}

/**
 * Example scaffold for a domain-specific invariant.
 * Replace with your own: aggregate totals match components, no orphaned joins,
 * unique-by-business-key constraints hold, etc.
 */
export async function exampleDomainInvariant ({ api }) {
  const results = []
  // e.g. sum of child rows equals parent aggregate:
  // const parent = await api.get('/orders/summary?user=test-user')
  // const children = await api.get('/orders?user=test-user').then(r => r.data)
  // const componentSum = children.reduce((acc, o) => acc + o.total, 0)
  // results.push(expect.eq(parent.data.total, componentSum, 'orders total = sum of line items'))
  return results
}

/**
 * Run a set of invariants by name. Each invariant is called with the shared
 * context `{ api, ...extras }`.
 */
export async function runInvariants (context, invariants) {
  const out = []
  for (const inv of invariants) {
    const name = inv.name || 'anonymous'
    try {
      const results = await inv(context)
      out.push({ name, results, status: results.every(r => r.passed) ? 'passed' : 'failed' })
    } catch (err) {
      out.push({
        name,
        results: [{ passed: false, hint: 'invariant threw', actual: String(err), expected: 'no throw' }],
        status: 'errored',
      })
    }
  }
  return out
}

export default { softDeletedRowsInvisibleInList, timestampsAreUtcZ, exampleDomainInvariant, runInvariants }
