/**
 * JSON Server + GET /api/npi → CMS NPPES (maps `country` → `country_code`, adds `name_purpose` for names).
 * Run: npm run server
 */
import { readFileSync, writeFileSync } from 'node:fs'
import dns from 'node:dns'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import jsonServer from 'json-server'

dns.setDefaultResultOrder('ipv4first')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'db.json')
const NPPES_BASE = 'https://npiregistry.cms.hhs.gov/api'

/** json-server returns 404 for routes whose root key is missing — ensure collections exist. */
function ensureDbCollections() {
  let db
  try {
    db = JSON.parse(readFileSync(dbPath, 'utf8'))
  } catch (e) {
    console.error('[json-server] Could not read db.json:', dbPath, e)
    throw e
  }
  const requiredArrays = ['patients', 'internalDoctors', 'vitals']
  let changed = false
  for (const key of requiredArrays) {
    if (!Array.isArray(db[key])) {
      db[key] = []
      changed = true
    }
  }
  if (changed) {
    writeFileSync(dbPath, JSON.stringify(db))
    console.warn('[json-server] Updated db.json: added missing array key(s) among', requiredArrays.join(', '))
  }
}

/** Fresh TCP+TLS per request avoids occasional reset/hang-up on reused CMS connections. */
const nppesAgent = new https.Agent({ keepAlive: false })

const NPPES_TIMEOUT_MS = 60_000
/** Outer rounds (each round tries fetch + https hostname + https IPv4). DNS flakes need patience. */
const NPPES_RETRIES = 6

function headerSingle(h) {
  if (h == null) return undefined
  return Array.isArray(h) ? h[0] : h
}

function httpsRequestOnce(options, headers) {
  const mergedHeaders = { ...headers }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        agent: nppesAgent,
        ...options,
        method: 'GET',
        headers: mergedHeaders,
      },
      (incoming) => {
        const chunks = []
        incoming.on('data', (c) => chunks.push(c))
        incoming.on('end', () => {
          resolve({
            status: incoming.statusCode ?? 502,
            contentType: headerSingle(incoming.headers['content-type']),
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )
    req.on('error', reject)
    req.setTimeout(NPPES_TIMEOUT_MS, () => {
      req.destroy(new Error(`NPPES request timed out after ${NPPES_TIMEOUT_MS}ms`))
    })
    req.end()
  })
}

/** Standard TLS to hostname; `dns.setDefaultResultOrder('ipv4first')` prefers IPv4 over broken IPv6. */
async function httpsGetTextHostname(urlString, headers) {
  const u = new URL(urlString)
  return httpsRequestOnce(
    {
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      servername: u.hostname,
    },
    { Host: u.hostname, ...headers },
  )
}

/**
 * Fallback: connect to resolved IPv4 while preserving SNI / Host (some networks mis-route IPv6 only).
 */
async function httpsGetTextViaIPv4(urlString, headers) {
  const u = new URL(urlString)
  const { address } = await dns.promises.lookup(u.hostname, { family: 4 })
  return httpsRequestOnce(
    {
      hostname: address,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      servername: u.hostname,
    },
    { Host: u.hostname, ...headers },
  )
}

const RETRY_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
])

function isRetryableNetworkError(e) {
  if (e == null) return false
  if (typeof AggregateError !== 'undefined' && e instanceof AggregateError) {
    return e.errors.some((x) => isRetryableNetworkError(x))
  }
  if (e && typeof e === 'object' && 'name' in e && e.name === 'AbortError') return true
  const cause = e && typeof e === 'object' && 'cause' in e ? e.cause : null
  if (cause && isRetryableNetworkError(cause)) return true
  if (cause && typeof cause === 'object' && 'code' in cause && RETRY_CODES.has(String(cause.code))) return true
  const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
  if (RETRY_CODES.has(code)) return true
  const msg = e instanceof Error ? e.message : String(e)
  return /socket hang up|timed out|ECONNRESET|ETIMEDOUT|fetch failed|aborted|getaddrinfo|EAI_AGAIN|ENOTFOUND|ENETUNREACH|EHOSTUNREACH/i.test(
    msg,
  )
}

/** Extra DNS resolution attempts before HTTPS (helps transient EAI_AGAIN). */
async function preflightDns(hostname) {
  let last
  for (let i = 0; i < 6; i++) {
    try {
      await dns.promises.lookup(hostname, { family: 4 })
      return
    } catch (err) {
      last = err
      if (!isRetryableNetworkError(err)) throw err
      await new Promise((r) => setTimeout(r, 350 * 2 ** i + Math.floor(Math.random() * 250)))
    }
  }
  throw last
}

/** Node’s `fetch` (undici) sometimes succeeds when `https.request` gets ECONNRESET to the same host. */
async function fetchNppesWithGlobalFetch(urlString, headers) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), NPPES_TIMEOUT_MS)
  try {
    const res = await fetch(urlString, {
      headers,
      signal: ac.signal,
      redirect: 'follow',
    })
    const body = await res.text()
    return {
      status: res.status,
      contentType: res.headers.get('content-type') ?? undefined,
      body,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchNppes(url) {
  const u = new URL(url)
  const headers = {
    Accept: 'application/json, */*',
    'User-Agent': 'MediCare-HMS/json-server-npi-proxy/1.0',
  }
  const transports = [
    () => fetchNppesWithGlobalFetch(url, headers),
    () => httpsGetTextHostname(url, headers),
    () => httpsGetTextViaIPv4(url, headers),
  ]

  let lastErr
  for (let attempt = 0; attempt < NPPES_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 900 * 2 ** (attempt - 1) + Math.floor(Math.random() * 400)))
    }

    try {
      await preflightDns(u.hostname)
    } catch (e) {
      lastErr = e
      if (attempt === NPPES_RETRIES - 1) throw e
      continue
    }

    for (const run of transports) {
      try {
        return await run()
      } catch (e) {
        lastErr = e
        if (!isRetryableNetworkError(e)) throw e
      }
    }

    if (attempt === NPPES_RETRIES - 1) throw lastErr
  }
  throw lastErr
}

function single(v) {
  if (v == null) return ''
  return Array.isArray(v) ? String(v[0] ?? '') : String(v)
}

/** Build NPPES query from simplified or native params (Express `req.query`). */
function buildNppesParams(query) {
  const q = new URLSearchParams()
  const raw = query ?? {}

  const version = single(raw.version) || '2.1'
  const limit = Math.min(200, Math.max(1, Number(single(raw.limit)) || 10))
  const skip = Math.min(1000, Math.max(0, Number(single(raw.skip)) || 0))
  q.set('version', version)
  q.set('limit', String(limit))
  q.set('skip', String(skip))

  const country = single(raw.country_code) || single(raw.country)
  if (country) q.set('country_code', country.toUpperCase())

  const npiDigits = (single(raw.number) || single(raw.npi)).replace(/\D/g, '')
  if (npiDigits.length >= 2) q.set('number', npiDigits)

  const fn = single(raw.first_name).trim()
  const ln = single(raw.last_name).trim()
  const aoFn = single(raw.ao_first_name || raw.authorized_official_first_name).trim()
  const aoLn = single(raw.ao_last_name || raw.authorized_official_last_name).trim()

  if (aoFn.length >= 2 || aoLn.length >= 2) {
    q.set('name_purpose', single(raw.name_purpose) || 'AO')
    if (aoFn.length >= 2) q.set('first_name', aoFn)
    if (aoLn.length >= 2) q.set('last_name', aoLn)
  } else if (fn.length >= 2 || ln.length >= 2) {
    q.set('name_purpose', single(raw.name_purpose) || 'Provider')
    if (fn.length >= 2) q.set('first_name', fn)
    if (ln.length >= 2) q.set('last_name', ln)
  }

  const passthrough = [
    'enumeration_type',
    'taxonomy_description',
    'organization_name',
    'city',
    'state',
    'postal_code',
    'address_purpose',
  ]
  for (const k of passthrough) {
    const v = single(raw[k])
    if (v) q.set(k, v)
  }

  return q
}

const server = jsonServer.create()
const middlewares = jsonServer.defaults()
server.use(middlewares)

function setNpiCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')
}

server.options(['/api/npi', '/api/npi/'], (_req, res) => {
  setNpiCors(res)
  res.status(204).end()
})

server.get(['/api/npi', '/api/npi/'], async (req, res) => {
  setNpiCors(res)
  try {
    const params = buildNppesParams(req.query)
    const url = `${NPPES_BASE}/?${params.toString()}`
    const r = await fetchNppes(url)
    res.status(r.status)
    res.setHeader('Content-Type', r.contentType || 'application/json; charset=utf-8')
    res.send(r.body)
  } catch (e) {
    const cause = e instanceof Error && 'cause' in e && e.cause instanceof Error ? e.cause.message : ''
    const msg = e instanceof Error ? e.message : String(e)
    const detail = cause && cause !== msg ? `${msg} (${cause})` : msg
    const dnsLike = /EAI_AGAIN|ENOTFOUND|getaddrinfo|ENETUNREACH|EHOSTUNREACH/i.test(detail)
    const hint = dnsLike
      ? 'DNS could not resolve npiregistry.cms.hhs.gov (often VPN, captive portal, or flaky resolver). Try: disable VPN, change DNS (e.g. 1.1.1.1), wait and retry. Ensure `npm run server` can reach the internet; the app should call this proxy (`/api/npi`), not CMS directly from the browser.'
      : undefined
    console.error('[api/npi] upstream fetch failed:', detail)
    res.status(502).json({ error: 'NPPES proxy failed', detail, ...(hint ? { hint } : {}) })
  }
})

ensureDbCollections()
const router = jsonServer.router(dbPath)
server.use(router)

const PORT = Number(process.env.PORT) || 3001
server.listen(PORT, () => {
  console.log(`JSON Server + NPI proxy listening on http://localhost:${PORT}`)
  console.log(`  NPPES: GET /api/npi?version=2.1&first_name=Rama&country=US`)
})
