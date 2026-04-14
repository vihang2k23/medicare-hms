/**
 * OpenFDA drug enforcement (recalls) — browser-safe base URL (dev proxy avoids CORS).
 */

import type { PrescriptionRecallSnapshot } from '../../features/prescriptions/types'

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
