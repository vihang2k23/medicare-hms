/**
 * External API integrations: OpenFDA drug labels, OpenFDA enforcement (recalls),
 * drug catalog (static + live), and NPI Registry.
 */

import type { OpenFdaLabelHit, PrescriptionRecallSnapshot } from '../domains/prescriptions/types'
import { STATIC_DRUG_CATALOG, STATIC_DRUG_RECALLS, type StaticDrugEntry } from '../data/drugCatalogData'
import { getJsonServerBaseUrl } from '../config/api'

// ── OpenFDA drug label search ───────────────────────────────────────────────

const DEFAULT_LABEL_JSON = 'https://api.fda.gov/drug/label.json'

function labelEndpoint(): string {
  const u = import.meta.env.VITE_OPENFDA_DRUG_LABEL_URL?.trim()
  return u && u.length > 0 ? u : DEFAULT_LABEL_JSON
}

function labelUrl(search: string, limit: number): string {
  const q = `search=${encodeURIComponent(search)}&limit=${encodeURIComponent(String(limit))}`
  return `${labelEndpoint()}?${q}`
}

/** Strip characters that break OpenFDA query syntax. */
function sanitizeTerm(raw: string): string {
  return raw
    .trim()
    .slice(0, 48)
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapLabelResult(row: Record<string, unknown>): OpenFdaLabelHit | null {
  const openfda = row.openfda as Record<string, string[]> | undefined
  if (!openfda) return null
  const brandNames = (openfda.brand_name ?? []).map((s) => String(s).trim()).filter(Boolean)
  const genericNames = (openfda.generic_name ?? []).map((s) => String(s).trim()).filter(Boolean)
  if (brandNames.length === 0 && genericNames.length === 0) return null

  const routes = (openfda.route ?? []).map((s) => String(s).trim()).filter(Boolean)
  const id =
    openfda.spl_id?.[0] ??
    openfda.product_ndc?.[0] ??
    `fda-label-${(brandNames[0] ?? genericNames[0] ?? 'x').replace(/\s+/g, '-').slice(0, 24)}-${String(row.effective_time ?? Date.now()).slice(0, 8)}`

  return {
    id,
    brandNames: brandNames.slice(0, 8),
    genericNames: genericNames.slice(0, 8),
    routes: routes.slice(0, 6),
    labeler: openfda.manufacturer_name?.[0],
    productType: openfda.product_type?.[0],
    drugClass: openfda.pharm_class_epc?.[0],
    indications: undefined,
    commonStrengths: openfda.active_ingred_unit?.slice(0, 4),
  }
}

/**
 * Live search against OpenFDA drug labels (brand / generic prefix match).
 * Returns [] on network/API errors (caller may fall back to static catalog).
 */
export async function searchOpenFdaDrugLabels(query: string, limit = 10): Promise<OpenFdaLabelHit[]> {
  const term = sanitizeTerm(query)
  if (term.length < 2) return []

  const token = term.split(/\s+/).find((t) => t.length >= 2) ?? term
  const safe = token.replace(/"/g, '')
  const search = `openfda.brand_name:${safe}*+openfda.generic_name:${safe}*`

  try {
    const url = labelUrl(search, Math.min(Math.max(limit, 1), 25))
    const res = await fetch(url)
    if (!res.ok) return []
    const json = (await res.json()) as {
      results?: Record<string, unknown>[]
      error?: { message?: string }
    }
    if (json.error?.message) return []

    const out: OpenFdaLabelHit[] = []
    for (const row of json.results ?? []) {
      const hit = mapLabelResult(row)
      if (hit) out.push(hit)
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}

// ── OpenFDA drug enforcement (recalls) ──────────────────────────────────────

const DEFAULT_ENFORCEMENT_JSON = 'https://api.fda.gov/drug/enforcement.json'

function enforcementEndpoint(): string {
  const u = import.meta.env.VITE_OPENFDA_DRUG_ENFORCEMENT_URL?.trim()
  return u && u.length > 0 ? u : DEFAULT_ENFORCEMENT_JSON
}

function enforcementUrl(searchParams: Record<string, string>) {
  const q = new URLSearchParams(searchParams).toString()
  return `${enforcementEndpoint()}?${q}`
}

export interface OpenFdaEnforcementHit {
  openfda?: {
    pharm_class_epc?: string[]
    product_type?: string[]
    brand_name?: string[]
  }
  reason_for_recall?: string
  recall_initiation_date?: string
  status?: string
}

export interface OpenFdaEnforcementResponse {
  meta?: { results?: { total: number; limit: number; skip?: number } }
  results?: OpenFdaEnforcementHit[]
}

function mapEnforcementToSnapshot(hit: OpenFdaEnforcementHit, index: number): PrescriptionRecallSnapshot {
  const desc =
    (hit as { product_description?: string }).product_description?.trim() ||
    hit.openfda?.brand_name?.[0] ||
    'Product'
  const recallId =
    (hit as { recall_number?: string }).recall_number?.trim() ||
    `enf-${(hit.recall_initiation_date ?? 'na').replace(/\D/g, '')}-${index}`
  const status = (hit.status ?? 'Unknown').trim()
  const classification = (hit as { classification?: string }).classification?.trim() || '—'
  const reason = (hit.reason_for_recall ?? 'See OpenFDA').trim()
  const reportDate = (hit.recall_initiation_date ?? '').trim() || '—'
  return {
    recallId,
    status,
    classification,
    reason,
    productDescription: desc.slice(0, 500),
    reportDate,
  }
}

/**
 * Live recall check: search enforcement records by product description terms.
 * Non-blocking; returns [] on failure.
 */
export async function fetchRecallsForDrugTerms(terms: string[], limit = 15): Promise<PrescriptionRecallSnapshot[]> {
  const cleaned = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))].slice(0, 4)
  if (cleaned.length === 0) return []

  const clauses = cleaned.map((t) => {
    const s = t.replace(/"/g, '').slice(0, 60)
    return `product_description:"${s}"`
  })
  const search = `(${clauses.join('+OR+')})`

  try {
    const lim = String(Math.min(Math.max(limit, 1), 50))
    const q = `search=${encodeURIComponent(search)}&limit=${encodeURIComponent(lim)}`
    const res = await fetch(`${enforcementEndpoint()}?${q}`)
    if (!res.ok) return []
    const json = (await res.json()) as OpenFdaEnforcementResponse & { error?: { message?: string } }
    if (json.error?.message) return []
    const results = json.results ?? []
    return results.slice(0, 8).map((h, i) => mapEnforcementToSnapshot(h, i))
  } catch {
    return []
  }
}

function classifyHit(hit: OpenFdaEnforcementHit): string {
  const epc = hit.openfda?.pharm_class_epc?.[0]?.trim()
  if (epc) return epc.length > 48 ? `${epc.slice(0, 45)}…` : epc
  const pt = hit.openfda?.product_type?.[0]?.trim()
  if (pt) return pt
  return 'Unclassified'
}

/** Fetch recent enforcement records and aggregate counts by pharmacologic class (or fallback label). */
export async function fetchRecallCountsByDrugClass(options?: { limit?: number }): Promise<
  { byClass: { name: string; count: number }[]; totalHits: number; error?: string }
> {
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500)
  const url = enforcementUrl({ limit: String(limit) })

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return {
        byClass: [],
        totalHits: 0,
        error: `OpenFDA returned ${res.status}`,
      }
    }
    const json = (await res.json()) as OpenFdaEnforcementResponse & { error?: { message?: string } }
    if (json.error?.message) {
      return { byClass: [], totalHits: 0, error: json.error.message }
    }
    const results = json.results ?? []
    const map = new Map<string, number>()
    for (const hit of results) {
      const key = classifyHit(hit)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    const byClass = [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    const total = json.meta?.results?.total ?? results.length
    return { byClass, totalHits: total }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return { byClass: [], totalHits: 0, error: msg }
  }
}

// ── Drug catalog (static + live) ────────────────────────────────────────────

function entryToHit(d: StaticDrugEntry): OpenFdaLabelHit {
  return {
    id: d.id,
    brandNames: d.brandNames,
    genericNames: d.genericNames,
    routes: d.routes,
    labeler: d.labeler,
    productType: d.productType,
    drugClass: d.drugClass,
    indications: d.indications,
    commonStrengths: d.commonStrengths,
  }
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
}

function buildHay(entry: StaticDrugEntry): string {
  return [
    entry.id,
    ...entry.brandNames,
    ...entry.genericNames,
    entry.drugClass,
    entry.labeler,
    entry.indications,
    ...entry.commonStrengths,
    ...entry.dosageForms,
  ]
    .join(' ')
    .toLowerCase()
}

function entryMatches(entry: StaticDrugEntry, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (q.length < 2) return false
  const hay = buildHay(entry)
  if (hay.includes(q)) return true
  const tokens = tokenize(raw)
  if (tokens.length === 0) return false
  if (tokens.length === 1) return hay.includes(tokens[0])
  return tokens.every((t) => hay.includes(t))
}

/** Bundled catalog only (offline / fallback). */
function searchDrugLabelsStatic(query: string): OpenFdaLabelHit[] {
  const q = query.trim()
  if (q.length < 2) return []

  const matches = STATIC_DRUG_CATALOG.filter((e) => entryMatches(e, q))

  const sorted = [...matches].sort((a, b) => {
    const aPrimary = (a.genericNames[0] ?? a.brandNames[0] ?? '').toLowerCase()
    const bPrimary = (b.genericNames[0] ?? b.brandNames[0] ?? '').toLowerCase()
    const q0 = q.toLowerCase()
    const aStarts = aPrimary.startsWith(q0) ? 0 : 1
    const bStarts = bPrimary.startsWith(q0) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return aPrimary.localeCompare(bPrimary)
  })

  return sorted.slice(0, 10).map(entryToHit)
}

/**
 * Drug label autocomplete: OpenFDA live search when available, else bundled catalog.
 */
export async function searchDrugLabels(query: string): Promise<OpenFdaLabelHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const live = await searchOpenFdaDrugLabels(q, 10)
  if (live.length > 0) return live
  return searchDrugLabelsStatic(q)
}

function mergeRecallSnapshots(
  primary: PrescriptionRecallSnapshot[],
  secondary: PrescriptionRecallSnapshot[],
): PrescriptionRecallSnapshot[] {
  const seen = new Set<string>()
  const out: PrescriptionRecallSnapshot[] = []
  for (const r of [...primary, ...secondary]) {
    const k = r.recallId.trim().toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
    if (out.length >= 12) break
  }
  return out
}

function recallsForDrugIds(ids: string[]): PrescriptionRecallSnapshot[] {
  const idSet = new Set(ids)
  const out: PrescriptionRecallSnapshot[] = []
  for (const r of STATIC_DRUG_RECALLS) {
    if (!r.drugIds.some((d) => idSet.has(d))) continue
    out.push({
      recallId: r.recallId,
      status: r.status,
      classification: r.classification,
      reason: r.reason,
      productDescription: r.productDescription,
      reportDate: r.reportDate,
    })
  }

  const ongoingFirst = (a: PrescriptionRecallSnapshot, b: PrescriptionRecallSnapshot) => {
    const rank = (s: string) => {
      const x = s.toLowerCase()
      if (x.includes('ongoing') || x.includes('pending')) return 0
      return 1
    }
    return rank(a.status) - rank(b.status)
  }
  out.sort(ongoingFirst)
  return out.slice(0, 5)
}

/** Recalls tied to known catalog drug ids (e.g. after picking a search row). */
export function fetchRecallAlertsForDrugIds(drugIds: string[]): Promise<PrescriptionRecallSnapshot[]> {
  return Promise.resolve(recallsForDrugIds(drugIds))
}

function recallsForTermsStatic(terms: string[]): PrescriptionRecallSnapshot[] {
  const cleaned = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))].slice(0, 8)
  if (cleaned.length === 0) return []

  const ids = new Set<string>()
  for (const entry of STATIC_DRUG_CATALOG) {
    for (const term of cleaned) {
      const t = term.toLowerCase()
      const hit =
        entry.brandNames.some((b) => b.toLowerCase().includes(t)) ||
        entry.genericNames.some((g) => g.toLowerCase().includes(t)) ||
        entry.drugClass.toLowerCase().includes(t)
      if (hit) {
        ids.add(entry.id)
        break
      }
    }
  }
  return recallsForDrugIds([...ids])
}

/** OpenFDA enforcement + static demo recalls, merged and deduped. */
export async function fetchRecallAlertsForTerms(terms: string[]): Promise<PrescriptionRecallSnapshot[]> {
  const cleaned = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))].slice(0, 8)
  if (cleaned.length === 0) return []

  const staticAlerts = recallsForTermsStatic(cleaned)
  const live = await fetchRecallsForDrugTerms(cleaned)
  return mergeRecallSnapshots(live, staticAlerts)
}

/** After picking a label row: live recalls by brand/generic terms + static catalog by id. */
export async function fetchRecallAlertsForLabelHit(hit: OpenFdaLabelHit): Promise<PrescriptionRecallSnapshot[]> {
  const fromStatic = recallsForDrugIds([hit.id])
  const terms = termsFromLabelHit(hit)
  const live = terms.length > 0 ? await fetchRecallsForDrugTerms(terms) : []
  return mergeRecallSnapshots(live, fromStatic)
}

export function termsFromLabelHit(hit: OpenFdaLabelHit): string[] {
  const out: string[] = []
  for (const b of hit.brandNames) {
    const t = b?.trim()
    if (t) out.push(t)
  }
  for (const g of hit.genericNames) {
    const t = g?.trim()
    if (t) out.push(t)
  }
  return [...new Set(out)]
}

// ── NPI Registry (CMS NPPES v2.1) ───────────────────────────────────────────

export interface NpiSearchParams {
  npiNumber?: string
  enumerationType?: '' | 'NPI-1' | 'NPI-2'
  taxonomyDescription?: string
  providerFirstName?: string
  providerLastName?: string
  organizationName?: string
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

/** CMS NPI Registry minimum rules — use for inline form errors (not toast). */
export const NPI_SEARCH_MINIMUM_CRITERIA_MESSAGE =
  'Enter at least one search criterion (e.g. NPI, name, organization, taxonomy, city, ZIP, postal code, or a non-US country alone). State alone is not allowed; United States cannot be the only filter.'

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
    throw new Error(NPI_SEARCH_MINIMUM_CRITERIA_MESSAGE)
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
