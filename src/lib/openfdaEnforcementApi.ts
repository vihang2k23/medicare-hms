/**
 * OpenFDA drug enforcement (recalls) — browser-safe base URL (dev proxy avoids CORS).
 */

const ENFORCEMENT_PATH = '/drug/enforcement.json'

function enforcementUrl(searchParams: Record<string, string>) {
  const q = new URLSearchParams(searchParams).toString()
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? `${window.location.origin}/openfda`
      : 'https://api.fda.gov'
  return `${base}${ENFORCEMENT_PATH}?${q}`
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
