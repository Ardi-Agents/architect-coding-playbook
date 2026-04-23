// Minimal HTTP client with auth + retry.
// Adapt baseUrl and loginStep for your project.

const DEFAULT_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'
const DEFAULT_RETRY = 3

export function createClient ({ baseUrl = DEFAULT_BASE_URL, token = null, retry = DEFAULT_RETRY } = {}) {
  const state = { baseUrl, token, retry }

  async function request (method, path, { body, headers = {} } = {}) {
    const url = path.startsWith('http') ? path : `${state.baseUrl}${path}`
    const opts = {
      method,
      headers: {
        'content-type': 'application/json',
        ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }

    let lastErr
    for (let attempt = 0; attempt < state.retry; attempt++) {
      try {
        const res = await fetch(url, opts)
        const text = await res.text()
        const data = text ? safeJson(text) : null
        if (res.status >= 500 && attempt < state.retry - 1) {
          await sleep(100 * Math.pow(2, attempt))
          continue
        }
        return { status: res.status, data, headers: Object.fromEntries(res.headers) }
      } catch (err) {
        lastErr = err
        if (attempt < state.retry - 1) await sleep(100 * Math.pow(2, attempt))
      }
    }
    throw lastErr || new Error(`request failed: ${method} ${url}`)
  }

  return {
    get:    (p, opts) => request('GET', p, opts),
    post:   (p, body, opts) => request('POST', p, { ...opts, body }),
    put:    (p, body, opts) => request('PUT', p, { ...opts, body }),
    patch:  (p, body, opts) => request('PATCH', p, { ...opts, body }),
    delete: (p, opts) => request('DELETE', p, opts),
    setToken (t) { state.token = t },
    baseUrl () { return state.baseUrl },
  }
}

function safeJson (text) {
  try { return JSON.parse(text) } catch { return text }
}

function sleep (ms) { return new Promise(r => setTimeout(r, ms)) }
