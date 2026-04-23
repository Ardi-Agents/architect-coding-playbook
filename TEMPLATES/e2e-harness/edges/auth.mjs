// Edge script: auth failure modes.
// Exercises 401 / 403 paths without assuming specific endpoints.

export default async function ({ api, expect }) {
  const assertions = []
  const base = api.baseUrl()

  // Missing token → 401 on a protected endpoint.
  // Adapt: pick a route you know is protected in your project.
  const protectedRoute = '/me'  // commonly protected; replace as needed
  const anon = await fetch(`${base}${protectedRoute}`).catch(() => ({ status: 0 }))
  assertions.push(expect.eq(anon.status, 401, `no token → 401 on ${protectedRoute}`))

  // Malformed token → 401.
  const bad = await fetch(`${base}${protectedRoute}`, {
    headers: { authorization: 'Bearer not-a-real-token' },
  }).catch(() => ({ status: 0 }))
  assertions.push(expect.eq(bad.status, 401, `malformed token → 401 on ${protectedRoute}`))

  // Empty Authorization header → 401.
  const empty = await fetch(`${base}${protectedRoute}`, {
    headers: { authorization: '' },
  }).catch(() => ({ status: 0 }))
  assertions.push(expect.eq(empty.status, 401, `empty authorization header → 401 on ${protectedRoute}`))

  return { assertions, invariants: [] }
}
