// Happy-path script: bootstrap the harness session.
// Adapt: change the login step and the smoke endpoint to your API.

export default async function ({ api, expect, runInvariants, invariants }) {
  const assertions = []

  // Smoke-test the service is reachable.
  const health = await api.get('/healthz').catch(() => ({ status: 0 }))
  assertions.push(expect.eq(health.status, 200, 'service reachable at /healthz'))

  // Log in. Replace with your project's login endpoint and credentials strategy.
  const login = await api.post('/auth/login', {
    email:    'test-user@example.com',
    password: 'test-password',
  }).catch(() => ({ status: 0, data: null }))

  if (login.status === 200 && login.data?.token) {
    api.setToken(login.data.token)
    assertions.push(expect.eq(login.status, 200, 'login returns 200'))
  } else {
    // Harness can run without auth if your service is open; skip the token step.
    assertions.push(expect.eq(login.status, 200, 'login returns 200 (or service is open)'))
  }

  // Run a baseline invariant run; subsequent scripts will add domain-specific ones.
  const invResults = await runInvariants(
    { api },
    [],
  )

  return { assertions, invariants: invResults }
}
