// Structured-result matcher library.
// Every matcher returns { passed, hint, actual, expected } — never throws.
// The harness collects these and writes them to the JSON report.

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isoUtcRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

function result (passed, hint, actual, expected) {
  return { passed: !!passed, hint, actual, expected }
}

function eq (actual, expected, hint = 'equality') {
  const passed = JSON.stringify(actual) === JSON.stringify(expected)
  return result(passed, hint, actual, expected)
}

function neq (actual, expected, hint = 'inequality') {
  const passed = JSON.stringify(actual) !== JSON.stringify(expected)
  return result(passed, hint, actual, expected)
}

function gt (actual, expected, hint = 'greater than') {
  return result(actual > expected, hint, actual, expected)
}

function gte (actual, expected, hint = 'greater than or equal') {
  return result(actual >= expected, hint, actual, expected)
}

function lt (actual, expected, hint = 'less than') {
  return result(actual < expected, hint, actual, expected)
}

function lte (actual, expected, hint = 'less than or equal') {
  return result(actual <= expected, hint, actual, expected)
}

function range (actual, min, max, hint = 'bounded numeric') {
  return result(actual >= min && actual <= max, hint, actual, { min, max })
}

function hasLength (collection, n, hint = 'collection size') {
  const len = collection?.length ?? -1
  return result(len === n, hint, len, n)
}

function includes (collection, item, hint = 'membership') {
  const passed = Array.isArray(collection) && collection.includes(item)
  return result(passed, hint, collection, item)
}

function isUuid (value, hint = 'UUID format') {
  return result(typeof value === 'string' && uuidRe.test(value), hint, value, 'uuid')
}

function matchesRegex (value, re, hint = 'regex match') {
  return result(typeof value === 'string' && re.test(value), hint, value, String(re))
}

function isIsoUtc (value, hint = 'ISO-8601 UTC with trailing Z') {
  return result(typeof value === 'string' && isoUtcRe.test(value), hint, value, 'yyyy-mm-ddThh:mm:ss[.fff]Z')
}

function isObject (value, hint = 'plain object') {
  const passed = value !== null && typeof value === 'object' && !Array.isArray(value)
  return result(passed, hint, typeof value, 'object')
}

function isArray (value, hint = 'array') {
  return result(Array.isArray(value), hint, typeof value, 'array')
}

export default {
  eq, neq, gt, gte, lt, lte, range,
  hasLength, includes,
  isUuid, matchesRegex, isIsoUtc,
  isObject, isArray,
}
