/**
 * NPI Registry (CMS NPPES v2.1) via **JSON Server proxy** only from the browser:
 * `{JSON_SERVER}/api/npi/?version=2.1&…` (default JSON Server: `http://localhost:3001`).
 * The proxy forwards to CMS (`npm run server` → `server/jsonServer.mjs`).
 *
 * Override base with **`VITE_NPI_API_URL`** (optional); **`VITE_JSON_SERVER_URL`** sets the server origin.
 */
import { getJsonServerBaseUrl } from '../config/api'
export interface NpiSearchParams {
  /** 10-digit NPI or partial (API accepts per CMS rules). */
  npiNumber?: string
  /** Omit or empty = search both individual and organization enumerations. */
  enumerationType?: '' | 'NPI-1' | 'NPI-2'
  taxonomyDescription?: string
  /** Individual provider — uses `name_purpose=Provider` when set (or default). */
  providerFirstName?: string
  providerLastName?: string
  organizationName?: string
  /** Authorized official — requires `name_purpose=AO` with first_name / last_name. */
  authorizedOfficialFirstName?: string
  authorizedOfficialLastName?: string
  city?: string
  state?: string
  countryCode?: string
  postalCode?: string
  addressPurpose?: '' | 'LOCATION' | 'MAILING' | 'PRIMARY' | 'SECONDARY'
  limit?: number
  skip?: number
}

export interface NpiProviderCard {
  npi: string
  enumerationType: string
  displayName: string
  credential?: string
  primaryTaxonomyDesc?: string
  primaryTaxonomyCode?: string
  city?: string
  state?: string
  addressLine1?: string
  postalCode?: string
  phone?: string
  fax?: string
  raw: NpiRawResult
}

export interface NpiSearchApiError {
  description?: string
  field?: string
  number?: string
}

export interface NpiSearchResponse {
  result_count?: number
  results?: NpiRawResult[]
  /** CMS often returns HTTP 200 with this payload when criteria are invalid. */
  Errors?: NpiSearchApiError[]
}

export interface NpiRawResult {
  number?: string
  enumeration_type?: string
  basic?: {
    first_name?: string
    last_name?: string
    middle_name?: string
    organizational_subpart?: string
    organization_name?: string
    credential?: string
    enumeration_date?: string
    last_updated?: string
    sole_proprietor?: string
    sex?: string
  }
  addresses?: Array<{
    address_purpose?: string
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    postal_code?: string
    country_code?: string
    telephone_number?: string
    fax_number?: string
  }>
  taxonomies?: Array<{
    code?: string
    desc?: string
    primary?: boolean
    state?: string
    license?: string
  }>
  endpoints?: Array<{
    endpoint?: string
    endpointType?: string
    affiliationLegalBusinessName?: string
    useCode?: string
    useDescription?: string
    contentType?: string
    contentTypeDescription?: string
    affiliation?: string
  }>
  other_names?: Array<{
    type?: string
    code?: string
    first_name?: string
    last_name?: string
    organization_name?: string
  }>
}

const TRANSIENT_HTTP_STATUSES = new Set([500, 502, 503, 504])

function uniqueBaseUrls(bases: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const b of bases) {
    const n = b.replace(/\/$/, '')
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/**
 * Endpoints to try in order. On gateway/network failure, {@link searchNpiRegistry} advances to the next.
 */
function buildNpiBaseCandidates(): string[] {
  const custom = (import.meta.env.VITE_NPI_API_URL as string | undefined)?.trim()
  const jsonNpiProxy = `${getJsonServerBaseUrl().replace(/\/$/, '')}/api/npi`

  if (custom) {
    return uniqueBaseUrls([custom, jsonNpiProxy])
  }

  return uniqueBaseUrls([jsonNpiProxy])
}

function isTransientFetchError(e: unknown): boolean {
  if (!(e instanceof Error)) return true
  if (e.name === 'TypeError' || e.name === 'AbortError') return true
  const m = e.message.toLowerCase()
  return (
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('failed to load') ||
    m.includes('load failed') ||
    m.includes('aborted') ||
    m.includes('eai_again') ||
    m.includes('getaddrinfo')
  )
}

function pickPracticeAddress(addrs: NpiRawResult['addresses']) {
  if (!addrs?.length) return undefined
  const loc =
    addrs.find((a) => (a.address_purpose ?? '').toUpperCase() === 'LOCATION') ??
    addrs.find((a) => (a.address_purpose ?? '').toUpperCase() === 'PRIMARY') ??
    addrs[0]
  return loc
}

function pickPrimaryTaxonomy(taxonomies: NpiRawResult['taxonomies']) {
  if (!taxonomies?.length) return undefined
  return taxonomies.find((t) => t.primary === true) ?? taxonomies[0]
}

export function normalizeNpiResult(r: NpiRawResult): NpiProviderCard | null {
  const npi = r.number?.replace(/\D/g, '') ?? ''
  if (npi.length !== 10) return null

  const b = r.basic ?? {}
  const enumType = r.enumeration_type ?? 'UNKNOWN'
  let displayName = ''
  if (enumType === 'NPI-2' && b.organization_name) {
    displayName = b.organization_name.trim()
  } else {
    const parts = [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(' ').trim()
    displayName = parts || 'Unknown provider'
  }

  const tax = pickPrimaryTaxonomy(r.taxonomies)
  const addr = pickPracticeAddress(r.addresses)

  return {
    npi,
    enumerationType: enumType,
    displayName,
    credential: b.credential,
    primaryTaxonomyDesc: tax?.desc,
    primaryTaxonomyCode: tax?.code,
    city: addr?.city,
    state: addr?.state,
    addressLine1: addr?.address_1,
    postalCode: addr?.postal_code,
    phone: addr?.telephone_number,
    fax: addr?.fax_number,
    raw: r,
  }
}

export function taxonomyToDepartment(desc?: string): string {
  if (!desc?.trim()) return 'General OPD'
  const t = desc.trim()
  if (t.length <= 48) return t
  return `${t.slice(0, 45)}…`
}

export function defaultImportedSchedule() {
  return {
    workingDays: [1, 2, 3, 4, 5] as number[],
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30 as const,
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
  }
}

export function npiCardToInternalRecord(card: NpiProviderCard): import('../types/internalDoctor').InternalDoctorRecord {
  const sched = defaultImportedSchedule()
  const dept = taxonomyToDepartment(card.primaryTaxonomyDesc)
  const name = card.enumerationType === 'NPI-2' ? card.displayName : `Dr. ${card.displayName}`

  return {
    id: `npi-${card.npi}`,
    npi: card.npi,
    name,
    department: dept,
    source: 'npi' as const,
    ...sched,
    credential: card.credential,
    phone: card.phone,
    fax: card.fax,
    addressLine1: card.addressLine1,
    city: card.city,
    state: card.state,
    postalCode: card.postalCode,
    enumerationType: card.enumerationType,
    taxonomyCode: card.primaryTaxonomyCode,
    taxonomyDesc: card.primaryTaxonomyDesc,
    rawResult: card.raw,
    importedAt: Date.now(),
  }
}

export function hasMinimumNpiSearchCriteria(p: NpiSearchParams): boolean {
  const n = (p.npiNumber ?? '').replace(/\D/g, '')
  if (n.length >= 2) return true
  if ((p.organizationName?.trim().length ?? 0) >= 2) return true
  if ((p.taxonomyDescription?.trim().length ?? 0) >= 2) return true
  if ((p.city?.trim().length ?? 0) >= 2) return true
  if ((p.postalCode?.trim().length ?? 0) >= 2) return true

  const pf = p.providerFirstName?.trim() ?? ''
  const pl = p.providerLastName?.trim() ?? ''
  if (pf.length >= 2 || pl.length >= 2) return true

  const aoF = p.authorizedOfficialFirstName?.trim() ?? ''
  const aoL = p.authorizedOfficialLastName?.trim() ?? ''
  if (aoF.length >= 2 || aoL.length >= 2) return true

  const cc = (p.countryCode ?? '').trim().toUpperCase()
  if (cc && cc !== 'US') return true

  return false
}

export function searchNpiRegistry(params: NpiSearchParams): Promise<{
  resultCount: number
  providers: NpiProviderCard[]
}> {
  if (!hasMinimumNpiSearchCriteria(params)) {
    throw new Error(
      'Enter at least one search criterion (e.g. NPI, name, organization, taxonomy, city, ZIP, postal code, or a non-US country alone). State alone is not allowed; United States cannot be the only filter.',
    )
  }

  const limit = Math.min(200, Math.max(1, params.limit ?? 20))
  const skip = Math.min(1000, Math.max(0, params.skip ?? 0))

  const q = new URLSearchParams()
  q.set('version', '2.1')
  q.set('limit', String(limit))
  q.set('skip', String(skip))

  const npiDigits = (params.npiNumber ?? '').replace(/\D/g, '')
  if (npiDigits.length >= 2) q.set('number', npiDigits)

  if (params.enumerationType) q.set('enumeration_type', params.enumerationType)

  if (params.taxonomyDescription?.trim()) q.set('taxonomy_description', params.taxonomyDescription.trim())

  if (params.organizationName?.trim()) q.set('organization_name', params.organizationName.trim())

  const aoF = params.authorizedOfficialFirstName?.trim() ?? ''
  const aoL = params.authorizedOfficialLastName?.trim() ?? ''
  const useAo = aoF.length >= 2 || aoL.length >= 2

  if (useAo) {
    q.set('name_purpose', 'AO')
    if (aoF.length >= 2) q.set('first_name', aoF)
    if (aoL.length >= 2) q.set('last_name', aoL)
  } else {
    const pf = params.providerFirstName?.trim() ?? ''
    const pl = params.providerLastName?.trim() ?? ''
    if (pf.length >= 2 || pl.length >= 2) {
      q.set('name_purpose', 'Provider')
      if (pf.length >= 2) q.set('first_name', pf)
      if (pl.length >= 2) q.set('last_name', pl)
    }
  }

  if (params.city?.trim()) q.set('city', params.city.trim())
  if (params.state?.trim()) {
    const st = params.state.trim()
    q.set('state', /^[A-Za-z]{2}$/.test(st) ? st.toUpperCase() : st)
  }
  if (params.postalCode?.trim()) q.set('postal_code', params.postalCode.trim())
  if (params.countryCode?.trim()) q.set('country_code', params.countryCode.trim().toUpperCase())
  if (params.addressPurpose) q.set('address_purpose', params.addressPurpose)

  return fetchNpiSearchWithFallbacks(q.toString())
}

async function fetchNpiSearchWithFallbacks(queryString: string): Promise<{
  resultCount: number
  providers: NpiProviderCard[]
}> {
  const bases = buildNpiBaseCandidates()
  let lastNote = ''

  for (let i = 0; i < bases.length; i++) {
    const base = bases[i]!
    const url = `${base}/?${queryString}`
    try {
      const res = await fetch(url, {
        credentials: 'omit',
        headers: { Accept: 'application/json' },
        mode: 'cors',
      })
      const text = await res.text()

      if (TRANSIENT_HTTP_STATUSES.has(res.status)) {
        lastNote = `${base} → HTTP ${res.status}`
        continue
      }

      let json: NpiSearchResponse
      try {
        json = JSON.parse(text) as NpiSearchResponse
      } catch {
        throw new Error(
          res.ok
            ? 'NPI Registry returned a non-JSON response'
            : `NPI Registry request failed (${res.status})`,
        )
      }

      if (!res.ok) {
        const fromApi = json.Errors?.map((e) => e.description).filter(Boolean).join(' — ')
        throw new Error(fromApi || `NPI Registry request failed (${res.status})`)
      }

      if (json.Errors?.length) {
        const msg = json.Errors.map((e) => e.description ?? e.number ?? 'Error').filter(Boolean).join(' — ')
        throw new Error(msg || 'NPI Registry rejected this search')
      }

      const rows = json.results ?? []
      const providers = rows.map(normalizeNpiResult).filter((x): x is NpiProviderCard => x != null)

      return {
        resultCount: typeof json.result_count === 'number' ? json.result_count : providers.length,
        providers,
      }
    } catch (e) {
      const transient = isTransientFetchError(e)
      if (transient && i < bases.length - 1) {
        lastNote = e instanceof Error ? e.message : String(e)
        continue
      }
      throw e instanceof Error ? e : new Error(String(e))
    }
  }

  throw new Error(
    `NPI Registry unreachable after ${bases.length} endpoint attempt(s). Last: ${lastNote || 'HTTP gateway errors'}`,
  )
}
